import type { Response } from "../http/express-compat.js";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { UserModel } from "../models/User.js";
import { CustomerAddressModel } from "../models/CustomerAddress.js";
import { LocationModel } from "../models/Location.js";
import { createPasswordHash } from "../services/auth.service.js";

const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(128),
});

const updateCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().optional().nullable(),
  status: z
    .enum([
      "pending",
      "active",
      "rejected",
      "suspended",
      "inactive",
    ])
    .optional(),
  password: z.string().min(8).max(128).optional(),
});

const createAddressSchema = z.object({
  governorateId: z.string().trim().min(1),
  areaId: z.string().trim().min(1),
  label: z.string().trim().min(2).max(50),
  address: z.string().trim().min(2).max(300),
  notes: z.string().trim().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = createAddressSchema.partial();

function isValidId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

export async function listCustomers(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const customers = await UserModel.find({
      role: "customer",
    })
      .select(
        "_id fullName phone email role status avatarUrl createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      customers,
      total: customers.length,
    });
  } catch (error) {
    console.error("List customers error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل العملاء.",
    });
  }
}

export async function getCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const customerId = String(req.params.id || "").trim();

    if (!Types.ObjectId.isValid(customerId)) {
      res.status(400).json({
        success: false,
        message: "معرّف العميل غير صالح.",
      });
      return;
    }

    const customer = await UserModel.findOne({
      _id: customerId,
      role: "customer",
    })
      .select(
        "_id fullName phone email role status avatarUrl createdAt updatedAt",
      )
      .lean();

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "العميل غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل بيانات العميل.",
    });
  }
}

export async function createCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = createCustomerSchema.parse(req.body);

    if (await UserModel.exists({ phone: data.phone })) {
      res.status(409).json({
        success: false,
        message: "رقم الهاتف مستخدم بالفعل.",
      });
      return;
    }

    const email = data.email?.toLowerCase();

    if (email && (await UserModel.exists({ email }))) {
      res.status(409).json({
        success: false,
        message: "البريد الإلكتروني مستخدم بالفعل.",
      });
      return;
    }

    const passwordHash = await createPasswordHash(
      data.password,
    );

    const customer = await UserModel.create({
      role: "customer",
      status: "active",
      fullName: data.fullName,
      phone: data.phone,
      email,
      passwordHash,
      avatarUrl: null,
      isOnline: false,
      governorateId: null,
      areaId: null,
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء حساب العميل بنجاح.",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email ?? null,
        role: customer.role,
        status: customer.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات العميل غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Create customer error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء حساب العميل.",
    });
  }
}

export async function updateCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = updateCustomerSchema.parse(req.body);

    const customer = await UserModel.findOne({
      _id: req.params.id,
      role: "customer",
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "العميل غير موجود.",
      });
      return;
    }

    if (data.fullName !== undefined) {
      customer.fullName = data.fullName;
    }

    if (data.phone !== undefined) {
      const duplicate = await UserModel.findOne({
        phone: data.phone,
        _id: { $ne: customer._id },
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message: "رقم الهاتف مستخدم بالفعل.",
        });
        return;
      }

      customer.phone = data.phone;
    }

    if (data.email !== undefined) {
      const email = data.email?.toLowerCase();

      if (email) {
        const duplicate = await UserModel.findOne({
          email,
          _id: { $ne: customer._id },
        });

        if (duplicate) {
          res.status(409).json({
            success: false,
            message: "البريد الإلكتروني مستخدم بالفعل.",
          });
          return;
        }
      }

      customer.email = email;
    }

    if (data.status !== undefined) {
      customer.status = data.status;
    }

    if (data.password) {
      customer.passwordHash = await createPasswordHash(
        data.password,
      );
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث العميل بنجاح.",
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email ?? null,
        role: customer.role,
        status: customer.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات العميل غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Update customer error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث العميل.",
    });
  }
}

export async function deleteCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const customer = await UserModel.findOneAndDelete({
      _id: req.params.id,
      role: "customer",
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "العميل غير موجود.",
      });
      return;
    }

    await CustomerAddressModel.deleteMany({
      userId: customer._id,
    });

    res.status(200).json({
      success: true,
      message: "تم حذف العميل وعناوينه بنجاح.",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف العميل.",
    });
  }
}

export async function listCustomerAddresses(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!isValidId(String(req.params.customerId))) {
      res.status(400).json({
        success: false,
        message: "معرف العميل غير صحيح.",
      });
      return;
    }

    const customer = await UserModel.findOne({
      _id: String(req.params.customerId),
      role: "customer",
    }).lean();

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "العميل غير موجود.",
      });
      return;
    }

    const addresses = await CustomerAddressModel.find({
      userId: customer._id,
    })
      .populate("governorateId", "_id name")
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      addresses,
      total: addresses.length,
    });
  } catch (error) {
    console.error(
      "List customer addresses error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل عناوين العميل.",
    });
  }
}

export async function createCustomerAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = createAddressSchema.parse(req.body);

    if (
      !isValidId(String(req.params.customerId)) ||
      !isValidId(data.governorateId) ||
      !isValidId(data.areaId)
    ) {
      res.status(400).json({
        success: false,
        message: "أحد المعرفات غير صحيح.",
      });
      return;
    }

    const customer = await UserModel.findOne({
      _id: String(req.params.customerId),
      role: "customer",
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "العميل غير موجود.",
      });
      return;
    }

    const location = await LocationModel.findById(
      data.governorateId,
    );

    if (!location || !location.isActive) {
      res.status(400).json({
        success: false,
        message: "المحافظة غير موجودة أو غير مفعلة.",
      });
      return;
    }

    const area = location.areas.find(
      (item) => item._id.toString() === data.areaId,
    );

    if (!area || !area.isActive) {
      res.status(400).json({
        success: false,
        message: "المنطقة غير موجودة أو غير مفعلة.",
      });
      return;
    }

    if (data.isDefault) {
      await CustomerAddressModel.updateMany(
        { userId: customer._id },
        { $set: { isDefault: false } },
      );
    }

    const existingCount =
      await CustomerAddressModel.countDocuments({
        userId: customer._id,
      });

    const address = await CustomerAddressModel.create({
      userId: customer._id,
      governorateId: new Types.ObjectId(
        data.governorateId,
      ),
      areaId: new Types.ObjectId(data.areaId),
      label: data.label,
      address: data.address,
      notes: data.notes ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      isDefault:
        data.isDefault === true ||
        existingCount === 0,
    });

    res.status(201).json({
      success: true,
      message: "تم إضافة العنوان بنجاح.",
      address,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات العنوان غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Create customer address error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إضافة العنوان.",
    });
  }
}

export async function updateCustomerAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = updateAddressSchema.parse(req.body);

    const addressId = String(req.params.id ?? "");

    if (!addressId || !isValidId(addressId)) {
      res.status(400).json({
        success: false,
        message: "معرّف العنوان غير صالح.",
      });
      return;
    }

    const address = await CustomerAddressModel.findById(
      String(req.params.id),
    );

    if (!address) {
      res.status(404).json({
        success: false,
        message: "العنوان غير موجود.",
      });
      return;
    }

    if (data.governorateId || data.areaId) {
      const governorateId =
        data.governorateId ??
        address.governorateId.toString();

      const areaId =
        data.areaId ?? address.areaId.toString();

      if (
        !isValidId(governorateId) ||
        !isValidId(areaId)
      ) {
        res.status(400).json({
          success: false,
          message: "معرف المحافظة أو المنطقة غير صحيح.",
        });
        return;
      }

      const location = await LocationModel.findById(
        governorateId,
      );

      const area = location?.areas.find(
        (item) => item._id.toString() === areaId,
      );

      if (
        !location ||
        !location.isActive ||
        !area ||
        !area.isActive
      ) {
        res.status(400).json({
          success: false,
          message:
            "المحافظة أو المنطقة غير موجودة أو غير مفعلة.",
        });
        return;
      }

      address.governorateId =
        new Types.ObjectId(governorateId);
      address.areaId =
        new Types.ObjectId(areaId);
    }

    if (data.label !== undefined) {
      address.label = data.label;
    }

    if (data.address !== undefined) {
      address.address = data.address;
    }

    if (data.notes !== undefined) {
      address.notes = data.notes;
    }

    if (data.latitude !== undefined) {
      address.latitude = data.latitude;
    }

    if (data.longitude !== undefined) {
      address.longitude = data.longitude;
    }

    if (data.isDefault === true) {
      await CustomerAddressModel.updateMany(
        { userId: address.userId },
        { $set: { isDefault: false } },
      );

      address.isDefault = true;
    } else if (data.isDefault === false) {
      address.isDefault = false;
    }

    await address.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث العنوان بنجاح.",
      address,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات العنوان غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Update customer address error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث العنوان.",
    });
  }
}

export async function deleteCustomerAddress(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const address = await CustomerAddressModel.findById(
      String(req.params.id),
    );

    if (!address) {
      res.status(404).json({
        success: false,
        message: "العنوان غير موجود.",
      });
      return;
    }

    await CustomerAddressModel.findByIdAndDelete(
      address._id,
    );

    if (address.isDefault) {
      const replacement =
        await CustomerAddressModel.findOne({
          userId: address.userId,
        }).sort({ createdAt: 1 });

      if (replacement) {
        replacement.isDefault = true;
        await replacement.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "تم حذف العنوان بنجاح.",
    });
  } catch (error) {
    console.error(
      "Delete customer address error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف العنوان.",
    });
  }
}
