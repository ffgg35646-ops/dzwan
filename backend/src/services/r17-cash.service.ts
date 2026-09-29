import CaptainCashTransactionModel from "../models/CaptainCashTransaction.js";

export async function recordCaptainPaidEstablishment(
  captainId: string,
  orderId: string,
  amount: number
) {
  if (amount < 0) {
    throw new Error("INVALID_CASH_AMOUNT");
  }

  return CaptainCashTransactionModel.create({
    captainId,
    orderId,
    type: "paid_establishment",
    amount,
  });
}

export async function recordCaptainCollectedCustomer(
  captainId: string,
  orderId: string,
  amount: number
) {
  if (amount < 0) {
    throw new Error("INVALID_CASH_AMOUNT");
  }

  return CaptainCashTransactionModel.create({
    captainId,
    orderId,
    type: "collected_customer",
    amount,
  });
}

export async function getCaptainCashStatement(
  captainId: string,
  start?: Date,
  end?: Date
) {
  const filter: Record<string, any> = {
    captainId,
  };

  if (start || end) {
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = start;
    if (end) filter.createdAt.$lt = end;
  }

  const rows =
    await CaptainCashTransactionModel.find(
      filter
    ).lean();

  const paidToEstablishments = rows
    .filter(
      (x) =>
        x.type === "paid_establishment"
    )
    .reduce(
      (sum, x) => sum + x.amount,
      0
    );

  const collectedFromCustomers = rows
    .filter(
      (x) =>
        x.type === "collected_customer"
    )
    .reduce(
      (sum, x) => sum + x.amount,
      0
    );

  return {
    count: new Set(
      rows.map((x) =>
        String(x.orderId)
      )
    ).size,
    paidToEstablishments,
    collectedFromCustomers,
    deliveryFees:
      collectedFromCustomers -
      paidToEstablishments,
    rows,
  };
}
