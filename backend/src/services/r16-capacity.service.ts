export function assertCaptainCapacity(
  activeOrders: number,
  maxActiveOrders: number
) {
  if (
    Number(activeOrders) >=
    Number(maxActiveOrders)
  ) {
    throw new Error(
      "CAPTAIN_ACTIVE_ORDER_LIMIT_REACHED"
    );
  }

  return true;
}
