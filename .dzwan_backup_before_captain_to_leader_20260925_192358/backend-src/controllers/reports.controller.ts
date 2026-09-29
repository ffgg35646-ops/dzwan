import type { Request, Response } from "express";
import { UserModel } from "../models/User.js";
import { OrderModel } from "../models/Order.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { ProductModel } from "../models/Product.js";

export async function getReports(
  _req: Request,
  res: Response,
) {
  try {
    const [
      usersTotal,
      customersTotal,
      captainsTotal,
      leadersTotal,
      establishmentsTotal,
      productsTotal,
      ordersTotal,
      pendingOrders,
      activeOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: "customer" }),
      UserModel.countDocuments({ role: "captain" }),
      UserModel.countDocuments({
        role: {
          $in: ["governorate_leader", "area_leader"],
        },
      }),
      EstablishmentModel.countDocuments(),
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ status: "pending" }),
      OrderModel.countDocuments({
        status: {
          $in: [
            "confirmed",
            "preparing",
            "ready_for_pickup",
            "assigned",
            "picked_up",
            "on_the_way",
          ],
        },
      }),
      OrderModel.countDocuments({ status: "delivered" }),
      OrderModel.countDocuments({ status: "cancelled" }),
    ]);

    const recentOrders = await OrderModel.find()
      .select("_id orderNumber status totalAmount createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({
      success: true,
      data: {
        totals: {
          users: usersTotal,
          customers: customersTotal,
          captains: captainsTotal,
          leaders: leadersTotal,
          establishments: establishmentsTotal,
          products: productsTotal,
          orders: ordersTotal,
        },
        orders: {
          pending: pendingOrders,
          active: activeOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        recentOrders,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "تعذر تحميل التقارير حاليًا.",
    });
  }
}
