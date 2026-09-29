import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config();

import { UserModel } from "../src/models/User.js";
import { OrderModel } from "../src/models/Order.js";
import { ProductModel } from "../src/models/Product.js";
import { EstablishmentModel } from "../src/models/Establishment.js";
import { CaptainShiftModel } from "../src/models/CaptainShift.js";
import { CaptainAttendanceModel } from "../src/models/CaptainAttendance.js";
import { CaptainRegistrationModel } from "../src/models/CaptainRegistration.js";
import { CaptainDocumentModel } from "../src/models/CaptainDocument.js";
import { CaptainWorkAreaModel } from "../src/models/CaptainWorkArea.js";
import { CaptainLedgerModel } from "../src/models/CaptainLedger.js";
import { DeliveryProofModel } from "../src/models/DeliveryProof.js";
import { SystemSettingsModel } from "../src/models/SystemSettings.js";
import { DispatchSettingsModel } from "../src/models/DispatchSettings.js";

import {
  addCaptainLedgerEntry,
  getCaptainBalance,
} from "../src/services/captain-ledger.service.js";

import {
  createDeliveryOtp,
  verifyDeliveryOtp,
  setDeliveryPhoto,
  assertDeliveryProof,
} from "../src/services/delivery-proof.service.js";

import {
  captainHasWorkArea,
} from "../src/services/captain-work-area.service.js";

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "";

if (!MONGO_URI) {
  throw new Error("MONGODB_URI غير موجود في البيئة.");
}

let passed = 0;
let failed = 0;

function pass(name: string) {
  passed++;
  console.log(`✅ ${name}`);
}

function fail(name: string, error: unknown) {
  failed++;
  console.log(
    `❌ ${name}: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

async function main() {
  await mongoose.connect(MONGO_URI);

  const captain = await UserModel.findOne({
    role: "captain",
    status: "active",
  });

  if (!captain) {
    throw new Error("لا يوجد Captain نشط للاختبار.");
  }

  const captainId = captain._id;

  const governorateId =
    captain.governorateId || new Types.ObjectId();

  const areaId =
    captain.areaId || new Types.ObjectId();

  // -------------------------------------------------------
  // 12 Attendance
  // -------------------------------------------------------
  const date = new Date();
  const dateKey =
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  await CaptainAttendanceModel.deleteOne({
    captainId,
    date: dateKey,
  });

  const shift = await CaptainShiftModel.create({
    captainId,
    dayOfWeek: date.getDay(),
    startTime: "00:00",
    endTime: "23:59",
    isActive: true,
  });

  try {
    const attendance = await CaptainAttendanceModel.create({
      captainId,
      shiftId: shift._id,
      date: dateKey,
      checkInAt: new Date(),
      status: "present",
    });

    if (attendance.status === "present") {
      pass("12 - تسجيل الحضور");
    } else {
      fail("12 - تسجيل الحضور", "الحالة غير صحيحة");
    }

    attendance.checkOutAt = new Date();
    attendance.status = "completed";
    await attendance.save();

    if (attendance.status === "completed") {
      pass("12 - تسجيل الانصراف");
    } else {
      fail("12 - تسجيل الانصراف", "الحالة غير صحيحة");
    }
  } catch (e) {
    fail("12 - الحضور", e);
  }

  // -------------------------------------------------------
  // 13 Registration
  // -------------------------------------------------------
  const suffix = Date.now();
  const phone = `079${String(suffix).slice(-8)}`;
  const email = `captain-${suffix}@dzwan.test`;

  try {
    const passwordHash = await bcrypt.hash("TestCaptain123!", 12);

    const registration =
      await CaptainRegistrationModel.create({
        fullName: "كابتن اختبار 12 20",
        phone,
        email,
        passwordHash,
        governorateId,
        areaId,
        status: "pending",
      });

    if (registration.status === "pending") {
      pass("13 - إنشاء طلب تسجيل كابتن");
    } else {
      fail("13 - إنشاء طلب تسجيل كابتن", "الحالة ليست pending");
    }

    registration.status = "approved";
    registration.reviewedAt = new Date();
    registration.reviewedBy = captainId;
    await registration.save();

    if (registration.status === "approved") {
      pass("13 - اعتماد طلب التسجيل");
    } else {
      fail("13 - اعتماد طلب التسجيل", "لم يتم الاعتماد");
    }

    await CaptainRegistrationModel.deleteOne({
      _id: registration._id,
    });
  } catch (e) {
    fail("13 - تسجيل الكابتن", e);
  }

  // -------------------------------------------------------
  // 14 Profile
  // -------------------------------------------------------
  try {
    const profile = await UserModel.findById(captainId)
      .select("fullName phone role status governorateId areaId")
      .lean();

    if (
      profile &&
      profile.role === "captain" &&
      profile.status === "active"
    ) {
      pass("14 - ملف الكابتن");
    } else {
      fail("14 - ملف الكابتن", "بيانات الملف غير صحيحة");
    }
  } catch (e) {
    fail("14 - ملف الكابتن", e);
  }

  // -------------------------------------------------------
  // 15 Documents
  // -------------------------------------------------------
  try {
    const doc = await CaptainDocumentModel.create({
      captainId,
      documentType: "test_document",
      documentNumber: `DOC-${suffix}`,
      fileUrl: "https://example.com/test-document.jpg",
      status: "pending",
      submittedAt: new Date(),
    });

    if (doc.status === "pending") {
      pass("15 - إنشاء وثيقة");
    } else {
      fail("15 - إنشاء وثيقة", "الحالة غير صحيحة");
    }

    doc.status = "approved";
    doc.reviewedAt = new Date();
    doc.reviewedBy = captainId;
    await doc.save();

    if (doc.status === "approved") {
      pass("15 - اعتماد الوثيقة");
    } else {
      fail("15 - اعتماد الوثيقة", "لم يتم الاعتماد");
    }

    await CaptainDocumentModel.deleteOne({
      _id: doc._id,
    });
  } catch (e) {
    fail("15 - الوثائق", e);
  }

  // -------------------------------------------------------
  // 16 Work Areas
  // -------------------------------------------------------
  try {
    await CaptainWorkAreaModel.deleteMany({
      captainId,
      governorateId,
      areaId,
    });

    const workArea = await CaptainWorkAreaModel.create({
      captainId,
      governorateId,
      areaId,
      isActive: true,
    });

    const hasArea = await captainHasWorkArea(
      captainId,
      governorateId,
      areaId,
    );

    if (hasArea) {
      pass("16 - منطقة عمل الكابتن");
    } else {
      fail("16 - منطقة عمل الكابتن", "لم يتم التعرف على المنطقة");
    }

    workArea.isActive = false;
    await workArea.save();

    const disabled = await captainHasWorkArea(
      captainId,
      governorateId,
      areaId,
    );

    if (!disabled) {
      pass("16 - تعطيل منطقة العمل");
    } else {
      fail("16 - تعطيل منطقة العمل", "ما زالت فعالة");
    }

    await CaptainWorkAreaModel.deleteOne({
      _id: workArea._id,
    });
  } catch (e) {
    fail("16 - مناطق العمل", e);
  }

  // -------------------------------------------------------
  // 17 - الحد الأقصى للطلبات / Dispatch Settings
  try {
    let dispatchSettings = await DispatchSettingsModel.findOne();

    if (!dispatchSettings) {
      dispatchSettings = await DispatchSettingsModel.create({});
    }

    if (
      typeof dispatchSettings.maxActiveOrdersPerCaptain !== "number" ||
      dispatchSettings.maxActiveOrdersPerCaptain < 1
    ) {
      throw new Error(
        "قيمة maxActiveOrdersPerCaptain غير صحيحة في Dispatch Settings"
      );
    }

    console.log(
      `✅ 17 - الحد الأقصى للطلبات / الإعدادات المركزية (${dispatchSettings.maxActiveOrdersPerCaptain})`
    );
    passed++;
  } catch (error) {
    failed++;
    console.log(
      `❌ 17 - إعداد الحد الأقصى/الإعدادات المركزية: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }


  // 18 Cache/System Settings
  // -------------------------------------------------------
  try {
    const settings =
      await SystemSettingsModel.findOneAndUpdate(
        {},
        {
          $setOnInsert: {
            requireDeliveryOtp: true,
            requireDeliveryPhoto: false,
            deliveryOtpExpirationMinutes: 10,
            deliveryOtpMaxAttempts: 5,
            requireCaptainWorkArea: true,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );

    if (settings) {
      pass("18 - الإعدادات المركزية");
    } else {
      fail("18 - الإعدادات المركزية", "لم يتم إنشاء الإعدادات");
    }
  } catch (e) {
    fail("18 - الكاش والإعدادات", e);
  }

  // -------------------------------------------------------
  // 19 Ledger
  // -------------------------------------------------------
  const beforeLedger = await CaptainLedgerModel.countDocuments({
    captainId,
  });

  try {
    const first = await addCaptainLedgerEntry({
      captainId,
      type: "delivery_earning",
      amount: 10,
      referenceType: "test",
      referenceId: new Types.ObjectId(),
      description: "اختبار أرباح التوصيل",
    });

    const second = await addCaptainLedgerEntry({
      captainId,
      type: "bonus",
      amount: 5,
      referenceType: "test",
      referenceId: new Types.ObjectId(),
      description: "اختبار مكافأة",
    });

    const balance = await getCaptainBalance(captainId);

    if (
      first.balanceAfter >= first.balanceBefore &&
      second.balanceAfter >= second.balanceBefore &&
      balance >= second.balanceAfter
    ) {
      pass("19 - كشف حساب الكابتن والرصيد");
    } else {
      fail("19 - كشف حساب الكابتن", "الرصيد غير متسق");
    }
  } catch (e) {
    fail("19 - كشف حساب الكابتن", e);
  } finally {
    await CaptainLedgerModel.deleteMany({
      captainId,
      createdAt: {
        $gte: new Date(Date.now() - 120000),
      },
      referenceType: "test",
    });

    // لا نحذف قيود المستخدم القديمة.
    void beforeLedger;
  }

  // -------------------------------------------------------
  // -------------------------------------------------------
  // 20 - إثبات التسليم OTP + الصورة
  let proofTestOrder: any = null;

  try {
    /*
     * الاختبار لا يعتمد على وجود منشأة أو منتج حاليين.
     * OrderSchema يستخدم ObjectId references فقط ولا يقوم
     * بالتحقق من وجود المستندات المشار إليها أثناء الإنشاء.
     */

    const testCustomerId = new Types.ObjectId(
      "6a96e8e2623c2663e257c375",
    );

    const testEstablishmentId = new Types.ObjectId(
      "6a96e60b688a25a312eb163f",
    );

    const testAddressId = new Types.ObjectId(
      "6a96e8fa623c2663e257c377",
    );

    const testProductId = new Types.ObjectId(
      "6a96e91b623c2663e257c378",
    );

    // إنشاء طلب مؤقت مخصص لاختبار إثبات التسليم.
    proofTestOrder = await OrderModel.create({
      orderNumber: `TEST-PROOF-${Date.now()}`,
      customerId: testCustomerId,
      establishmentId: testEstablishmentId,
      addressId: testAddressId,
      captainId: captain._id,
      items: [
        {
          productId: testProductId,
          name: "منتج اختبار إثبات التسليم",
          quantity: 1,
          unitPrice: 10,
          totalPrice: 10,
        },
      ],
      subtotal: 10,
      deliveryFee: 0,
      total: 10,
      status: "on_the_way",
    });

    // 1) إنشاء OTP
    const otpResult = await createDeliveryOtp(
      proofTestOrder._id,
      captain._id,
    );

    if (!otpResult?.otp) {
      throw new Error("فشل إنشاء OTP.");
    }

    // 2) التحقق من OTP
    const verifyResult = await verifyDeliveryOtp(
      proofTestOrder._id,
      captain._id,
      otpResult.otp,
    );

    if (!verifyResult) {
      throw new Error("فشل التحقق من OTP.");
    }

    // 3) حفظ صورة إثبات التسليم
    const photoResult = await setDeliveryPhoto(
      proofTestOrder._id,
      captain._id,
      "https://example.com/test-delivery-proof.jpg",
    );

    if (!photoResult) {
      throw new Error("فشل حفظ صورة إثبات التسليم.");
    }

    // 4) التحقق النهائي
    const proof = await DeliveryProofModel.findOne({
      orderId: proofTestOrder._id,
      captainId: captain._id,
    }).lean();

    if (!proof?.otpVerifiedAt) {
      throw new Error("OTP لم يتم تسجيل التحقق منه.");
    }

    if (!proof?.photoUrl) {
      throw new Error("صورة إثبات التسليم لم يتم حفظها.");
    }

    const finalProof = await assertDeliveryProof(
      proofTestOrder._id,
      captain._id,
    );

    if (finalProof !== true) {
      throw new Error("assertDeliveryProof لم ينجح.");
    }

    pass("20 - إثبات التسليم OTP + صورة الطلب");
  } catch (e) {
    fail("20 - إثبات التسليم", e);
  } finally {
    if (proofTestOrder?._id) {
      await DeliveryProofModel.deleteOne({
        orderId: proofTestOrder._id,
      });

      await OrderModel.deleteOne({
        _id: proofTestOrder._id,
      });
    }
  }


  // Cleanup
  // -------------------------------------------------------
  await CaptainShiftModel.deleteOne({
    _id: shift._id,
  });

  await mongoose.disconnect();

  console.log("");
  console.log("========================================");
  console.log(`Passed  : ${passed}`);
  console.log(`Failed  : ${failed}`);
  console.log("========================================");

  if (failed > 0) {
    console.log("❌ يوجد فشل في أقسام 12 → 20.");
    process.exit(1);
  }

  console.log("✅ تم اختبار أساس ودمج الأقسام 12 → 20 بنجاح.");
}

main().catch(async (error) => {
  console.error("");
  console.error("❌ TEST ERROR");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
