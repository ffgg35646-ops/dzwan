import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  User,
  X,
} from "lucide-react";
import { api } from "../lib/api";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "assigned"
  | "heading_to_shop"
  | "arrived_at_shop"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "completed"
  | "cancelled"
  | "rejected";

type RefValue =
  | string
  | {
      _id?: string;
      id?: string;
      fullName?: string;
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      [key: string]: any;
    }
  | null
  | undefined;

interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

interface Order {
  _id: string;
  orderNumber?: string;
  status: OrderStatus;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  createdAt: string;

  customerId?: RefValue;
  captainId?: RefValue;
  addressId?: RefValue;

  customerNote?: string | null;
  notes?: string | null;

  customerSnapshot?: {
    name?: string;
    phone?: string;
    addressText?: string;
    customerNote?: string | null;
  };

  items?: OrderItem[];

  captainAssignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;

  cancellationRecord?: {
    _id?: string;
    orderId?: string;
    cancelledBy?: {
      _id?: string;
      fullName?: string;
      phone?: string;
      email?: string;
    } | string | null;
    cancelledByRole?: string;
    reason?: string | null;
    createdAt?: string;
  } | null;

  [key: string]: any;
}

interface Captain {
  _id: string;
  fullName?: string;
  phone?: string;
  status?: string;
  isOnline?: boolean;
  [key: string]: any;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "جديد",
  confirmed: "مؤكد",
  preparing: "جاري التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تم إسناده",
  heading_to_shop: "في الطريق للمحل",
  arrived_at_shop: "وصل المحل",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "مكتمل",
  completed: "طلبات مكتملة",
  cancelled: "ملغي",
  rejected: "مرفوض",
};


const statusOptions: Array<{
  value: "all" | "available" | "active" | OrderStatus;
  label: string;
}> = [
  { value: "all", label: "كل الطلبات" },
  { value: "available", label: "الطلبات المتاحة" },
  { value: "active", label: "الطلبات النشطة" },
  { value: "heading_to_shop", label: "في الطريق للمحل" },
  { value: "arrived_at_shop", label: "وصل المحل" },
  { value: "picked_up", label: "تم الاستلام" },
  { value: "on_the_way", label: "في الطريق للعميل" },
  { value: "delivered", label: "طلبات مكتملة" },
  { value: "cancelled", label: "ملغاة" },
  { value: "rejected", label: "مرفوضة" },
];

const timelineLabels: Record<string, string> = {
  created: "إنشاء الطلب",
  pending: "تم إنشاء الطلب",
  confirmed: "تأكيد الطلب",
  preparing: "بدء التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تعيين الكابتن",
  captain_assigned: "تعيين الكابتن",
  captain_claimed: "استلام الكابتن للطلب",
  heading_to_shop: "التوجه إلى المطعم / المحل",
  on_the_way_to_shop: "التوجه إلى المطعم / المحل",
  arrived_at_shop: "الوصول إلى المطعم / المحل",
  arrived_shop: "الوصول إلى المطعم / المحل",
  picked_up: "استلام الطلب",
  heading_to_customer: "التوجه إلى العميل",
  on_the_way_to_customer: "التوجه إلى العميل",
  arrived_at_customer: "الوصول إلى العميل",
  arrived_customer: "الوصول إلى العميل",
  delivered: "مكتمل",
  cancelled: "إلغاء الطلب",
  rejected: "رفض الطلب",
  redispatched: "إعادة الطلب إلى قائمة التوزيع",
};


function getName(value: RefValue) {
  if (!value) return "—";
  if (typeof value === "string") return "—";

  return (
    value.fullName ||
    value.name ||
    value.username ||
    "—"
  );
}

function getPhone(value: RefValue) {
  if (!value || typeof value === "string") return "—";
  return value.phone || "—";
}

function getAddress(value: RefValue) {
  if (!value || typeof value === "string") return "—";
  return value.address || "—";
}

function money(value?: number) {
  return `${Number(value || 0).toFixed(2)} ج.م`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}


function formatTravelDuration(
  start?: string | null,
  end?: string | null,
) {
  if (!start || !end) {
    return "—";
  }

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime) ||
    endTime < startTime
  ) {
    return "—";
  }

  const totalMinutes = Math.floor(
    (endTime - startTime) / 60000,
  );

  if (totalMinutes < 1) {
    return "أقل من دقيقة";
  }

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} دقيقة`;
  }

  if (minutes === 0) {
    return `${hours} ساعة`;
  }

  return `${hours} ساعة و${minutes} دقيقة`;
}

function statusClass(status: string) {
  if (status === "delivered") return "orders-status success";
  if (status === "cancelled" || status === "rejected") {
    return "orders-status danger";
  }
  if (
    status === "pending" ||
    status === "preparing" ||
    status === "ready_for_pickup"
  ) {
    return "orders-status warning";
  }

  return "orders-status info";
}

function apiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    fallback
  );
}

function canManageOrders(role?: string) {
  return role === "admin" || role === "super_admin";
}

function timelineLabel(item: any) {
  const value =
    item?.type ||
    item?.eventType ||
    item?.status ||
    item?.stage ||
    item?.action ||
    "";

  return (
    timelineLabels[value] ||
    item?.label ||
    item?.title ||
    value ||
    "تحديث"
  );
}

function timelineTime(item: any) {
  return (
    item?.createdAt ||
    item?.occurredAt ||
    item?.timestamp ||
    item?.at ||
    item?.updatedAt ||
    ""
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingCancelledOrders, setPendingCancelledOrders] =
    useState<Order[]>([]);

const [captains, setCaptains] = useState<Captain[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "active" | OrderStatus
  >("all");


  const [liveOrderCounts, setLiveOrderCounts] =
    useState({
      total: 0,
      allTotal: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready_for_pickup: 0,
      assigned: 0,
      heading_to_shop: 0,
      arrived_at_shop: 0,
      picked_up: 0,
      on_the_way: 0,
      delivered: 0,
      cancelled: 0,
      rejected: 0,
      available: 0,
      active: 0,
    });

  const [stuckOrdersCount, setStuckOrdersCount] =
    useState(0);

  const [heroActiveOnly, setHeroActiveOnly] =
    useState(false);

  const [allOrdersSearchMode, setAllOrdersSearchMode] =
    useState(false);

  const [searchText, setSearchText] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedCaptain, setSelectedCaptain] = useState<
    Record<string, string>
  >({});

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [orderTimeline, setOrderTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [currentRole] = useState("");

  async function loadOrders(silent = true) {
    try {
      if (!silent) {
        // Live refresh لا يعيد شاشة التحميل
      }

      setError("");

      const params: Record<string, string> = {};

      if (
        !allOrdersSearchMode &&
        statusFilter !== "all" &&
        statusFilter !== "available" &&
        statusFilter !== "active"
      ) {
        params.status = statusFilter;
      }

      if (searchText.trim()) {
        params.search = searchText.trim();
      }

      if (areaSearch.trim()) {
        params.area = areaSearch.trim();
      }

      if (fromDate) {
        params.fromDate = fromDate;
      }

      if (toDate) {
        params.toDate = toDate;
      }

      if (allOrdersSearchMode && !searchText.trim()) {
        setOrders([]);
        return;
      }

      const response = await api.get("/orders", { params });

      void api
        .get("/captains")
        .then((captainResponse) => {
          setCaptains(
            Array.isArray(captainResponse.data?.captains)
              ? captainResponse.data.captains
              : [],
          );
        })
        .catch((error) => {
          console.error("Captain list loading error:", error);
        });

      if (statusFilter === "all") {
        void Promise.all([
          api.get("/orders", {
            params: { status: "cancelled" },
          }),
          api.get("/orders", {
            params: { status: "rejected" },
          }),
        ])
          .then(
            ([
              cancelledResponse,
              rejectedResponse,
            ]) => {
              const cancelledOrders = Array.isArray(
                cancelledResponse.data?.orders,
              )
                ? cancelledResponse.data.orders
                : [];

              const rejectedOrders = Array.isArray(
                rejectedResponse.data?.orders,
              )
                ? rejectedResponse.data.orders
                : [];

              setPendingCancelledOrders([
                ...cancelledOrders,
                ...rejectedOrders,
              ]);
            },
          )
          .catch((error) => {
            console.error(
              "Cancelled/rejected orders loading error:",
              error,
            );
          });
      } else {
        setPendingCancelledOrders([]);
      }

      function extractOrders(
        payload: unknown,
        depth = 0,
      ): Order[] {
        if (depth > 5 || payload == null) {
          return [];
        }

        if (Array.isArray(payload)) {
          const orderLike = payload.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              (
                "_id" in item ||
                "status" in item ||
                "orderNumber" in item
              ),
          );

          if (orderLike.length > 0) {
            return orderLike as Order[];
          }

          for (const item of payload) {
            const found = extractOrders(
              item,
              depth + 1,
            );

            if (found.length > 0) {
              return found;
            }
          }

          return [];
        }

        if (
          typeof payload !== "object"
        ) {
          return [];
        }

        const obj =
          payload as Record<string, unknown>;

        const priorityKeys = [
          "orders",
          "items",
          "rows",
          "results",
          "data",
        ];

        for (const key of priorityKeys) {
          if (!(key in obj)) {
            continue;
          }

          const found = extractOrders(
            obj[key],
            depth + 1,
          );

          if (found.length > 0) {
            return found;
          }
        }

        for (const value of Object.values(obj)) {
          const found = extractOrders(
            value,
            depth + 1,
          );

          if (found.length > 0) {
            return found;
          }
        }

        return [];
      }

      let loadedOrders =
        extractOrders(response.data);

      console.log(
        "[Orders] loaded:",
        loadedOrders.length,
        "status:",
        loadedOrders.map(
          (order) => order.status,
        ),
      );

      if (statusFilter === "delivered") {
        const completedResponse = await api.get(
          "/orders",
          {
            params: {
              status: "completed",
            },
          },
        );

        const completedOrders = Array.isArray(
          completedResponse.data?.orders,
        )
          ? completedResponse.data.orders
          : [];

        const merged = new Map<string, Order>();

        [...loadedOrders, ...completedOrders].forEach(
          (order: Order) => {
            const id = String(order._id);
            const previous = merged.get(id);

            if (!previous) {
              merged.set(id, order);
              return;
            }

            const keepPopulated = (
              current: any,
              incoming: any,
            ) => {
              const currentIsObject =
                current &&
                typeof current === "object";

              const incomingIsObject =
                incoming &&
                typeof incoming === "object";

              if (
                currentIsObject &&
                !incomingIsObject
              ) {
                return current;
              }

              if (
                incomingIsObject &&
                !currentIsObject
              ) {
                return incoming;
              }

              if (
                currentIsObject &&
                incomingIsObject
              ) {
                return {
                  ...current,
                  ...incoming,
                };
              }

              return incoming ?? current;
            };

            merged.set(id, {
              ...previous,
              ...order,

              customerId: keepPopulated(
                previous.customerId,
                order.customerId,
              ),

              addressId: keepPopulated(
                previous.addressId,
                order.addressId,
              ),

              captainId: keepPopulated(
                previous.captainId,
                order.captainId,
              ),

              establishmentId: keepPopulated(
                previous.establishmentId,
                order.establishmentId,
              ),

              customerSnapshot:
                order.customerSnapshot ||
                previous.customerSnapshot,

              assignedAt:
                order.assignedAt ||
                previous.assignedAt,

              pickedUpAt:
                order.pickedUpAt ||
                previous.pickedUpAt,

              deliveredAt:
                order.deliveredAt ||
                previous.deliveredAt,
            });
          },
        );

        loadedOrders =
          Array.from(merged.values());
      }

      let visibleOrders: Order[];

      if (allOrdersSearchMode) {
        visibleOrders = searchText.trim()
          ? loadedOrders
          : [];
      } else if (statusFilter === "available") {
        visibleOrders = loadedOrders.filter(
          (order: Order) => {
            const captainId =
              typeof order.captainId === "string"
                ? order.captainId
                : order.captainId &&
                    typeof order.captainId === "object"
                  ? String(
                      order.captainId._id ||
                        order.captainId.id ||
                        "",
                    )
                  : "";

            return (
              !captainId &&
              (
                order.status === "pending" ||
                order.status === "ready_for_pickup"
              )
            );
          },
        );
      } else if (statusFilter === "active") {
        const activeStatuses = new Set([
          "assigned",
          "heading_to_shop",
          "arrived_at_shop",
          "picked_up",
          "on_the_way",
        ]);

        visibleOrders = loadedOrders.filter(
          (order: Order) => {
            const captainId =
              typeof order.captainId === "string"
                ? order.captainId
                : order.captainId &&
                    typeof order.captainId === "object"
                  ? String(
                      order.captainId._id ||
                        order.captainId.id ||
                        "",
                    )
                  : "";

            return (
              Boolean(captainId) &&
              activeStatuses.has(
                String(order.status || ""),
              )
            );
          },
        );
      } else if (statusFilter === "all") {
        visibleOrders = loadedOrders.filter(
          (order: Order) =>
            order.status !== "cancelled" &&
            order.status !== "rejected" &&
            order.status !== "delivered" &&
            order.status !== "completed",
        );
      } else if (statusFilter === "delivered") {
        visibleOrders = loadedOrders.filter(
          (order: Order) =>
            order.status === "delivered" ||
            order.status === "completed",
        );
      } else {
        visibleOrders = loadedOrders.filter(
          (order: Order) =>
            order.status === statusFilter,
        );
      }

      setOrders(visibleOrders);

      // لو الطلب المفتوح تغيرت حالته من الكابتن،
      // نحدّث التفاصيل أو نغلقها إذا اختفت من الفلتر الحالي.
      if (selectedOrder?._id) {
        const refreshedSelected =
          visibleOrders.find(
            (item) =>
              item._id === selectedOrder._id,
          );

        if (refreshedSelected) {
          setSelectedOrder(refreshedSelected);
        }
      }
    } catch (err: any) {
      setError(
        apiErrorMessage(err, "تعذر تحميل الطلبات."),
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }


  useEffect(() => {
    void loadOrders(false);
  }, [
    statusFilter,
    searchText,
    areaSearch,
    fromDate,
    toDate,
    allOrdersSearchMode,
  ]);

  useEffect(() => {
    if (!allOrdersSearchMode) {
      return;
    }

    const timer = window.setTimeout(() => {
      const input =
        document.getElementById(
          "orders-all-search-input",
        ) as HTMLInputElement | null;

      input?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [allOrdersSearchMode]);

  useEffect(() => {
    let stopped = false;

    const refreshLiveCounts = () => {
      if (!stopped) {
        void loadLiveOrderCounts();
      }
    };

    refreshLiveCounts();

    const timer = window.setInterval(
      refreshLiveCounts,
      5000,
    );

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // load-live-order-counts-safe
  }, []);

  useEffect(() => {
    const orderId = selectedOrder?._id;

    if (!orderId) {
      setOrderTimeline([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setTimelineLoading(true);

      try {
        const response = await api.get(
          `/orders/${orderId}/timeline`,
        );

        const payload = response?.data;

        const rows =
          payload?.timeline ||
          payload?.events ||
          payload?.data ||
          [];

        if (!cancelled) {
          setOrderTimeline(
            Array.isArray(rows) ? rows : [],
          );
        }
      } catch (timelineError) {
        console.error(
          "Order timeline load error:",
          timelineError,
        );

        if (!cancelled) {
          setOrderTimeline([]);
        }
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedOrder?._id]);


  async function loadLiveOrderCounts() {
    try {
      const response = await api.get("/orders");

      const rows = Array.isArray(
        response.data?.orders,
      )
        ? response.data.orders
        : [];

      const counts = {
        allTotal: 0,
        total: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready_for_pickup: 0,
        assigned: 0,
        heading_to_shop: 0,
        arrived_at_shop: 0,
        picked_up: 0,
        on_the_way: 0,
        delivered: 0,
        cancelled: 0,
        rejected: 0,
        available: 0,
        active: 0,
      };

      const activeStatuses = new Set([
        "assigned",
        "heading_to_shop",
        "arrived_at_shop",
        "picked_up",
        "on_the_way",
      ]);

      for (const row of rows) {
      const status = String(
        row?.status || "",
      );

      const captainId =
        typeof row?.captainId === "string"
          ? row.captainId
          : row?.captainId &&
              typeof row.captainId === "object"
            ? String(
                row.captainId._id ||
                  row.captainId.id ||
                  "",
              )
            : "";

      const hasCaptain = Boolean(captainId);

      if (
        hasCaptain &&
        activeStatuses.has(status)
      ) {
        counts.active++;
      }

      if (
        !hasCaptain &&
        (
          status === "pending" ||
          status === "confirmed" ||
          status === "preparing" ||
          status === "ready_for_pickup"
        )
      ) {
        counts.available++;
      }

      if (
        status === "pending" ||
        status === "confirmed" ||
        status === "preparing" ||
        status === "ready_for_pickup" ||
        status === "heading_to_shop" ||
        status === "arrived_at_shop" ||
        status === "picked_up" ||
        status === "on_the_way" ||
        status === "cancelled" ||
        status === "rejected"
      ) {
        counts[
          status as keyof typeof counts
        ]++;
      }

      if (
        status === "delivered" ||
        status === "completed"
      ) {
        counts.delivered++;
      }

      if (
        hasCaptain &&
        (
          status === "assigned" ||
          status === "heading_to_shop" ||
          status === "arrived_at_shop" ||
          status === "picked_up" ||
          status === "on_the_way"
        )
      ) {
        counts.assigned++;
      }
    }

      const fallbackTotal =
        counts.pending +
        counts.confirmed +
        counts.preparing +
        counts.ready_for_pickup +
        counts.assigned +
        counts.heading_to_shop +
        counts.arrived_at_shop +
        counts.picked_up +
        counts.on_the_way +
        counts.delivered +
        counts.cancelled +
        counts.rejected;

      counts.total =
        counts.available +
        counts.active;

      counts.allTotal = Number(
        response.data?.total ?? fallbackTotal,
      );

      setLiveOrderCounts(counts);

      void api
        .get("/ops/stuck")
        .then((stuckResponse) => {
          const alerts = Array.isArray(
            stuckResponse.data?.alerts,
          )
            ? stuckResponse.data.alerts
            : [];

          setStuckOrdersCount(
            alerts.filter(
              (item: { status?: string }) =>
                item.status === "open" ||
                item.status === "acknowledged",
            ).length,
          );
        })
        .catch((error) => {
          console.error(
            "Stuck orders count error:",
            error,
          );
        });
    } catch (error) {
      console.error(
        "Live order counters error:",
        error,
      );
    }
  }

  async function updateStatus(
    order: Order,
    status: OrderStatus,
  ) {
    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/orders/${order._id}/status`,
        { status },
      );

      await loadOrders();

      if (selectedOrder?._id === order._id) {
        const updated = orders.find(
          (item) => item._id === order._id,
        );

        if (updated) {
          setSelectedOrder({
            ...updated,
            status,
          });
        }
      }
    } catch (err: any) {
      setError(
        apiErrorMessage(
          err,
          "تعذر تحديث حالة الطلب.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function redispatchOrder(orderId: string) {
    try {
      setSaving(true);
      setError("");

      await api.post(
        `/ops/orders/${orderId}/re-dispatch`,
      );

      await loadOrders();
    } catch (err) {
      console.error(err);

      setError(
        "تعذر إعادة الطلب إلى الطلبات المتاحة حاليًا.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignCaptain(orderId: string) {
    if (!canManageOrders(currentRole)) {
      setError(
        "ليس لديك صلاحية لإسناد الطلبات.",
      );
      return;
    }

    const captainId =
      selectedCaptain[orderId];

    if (!captainId) {
      setError("اختر الكابتن أولًا.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/orders/${orderId}/assign-captain`,
        { captainId },
      );

      await loadOrders();
    } catch (err) {
      console.error(err);

      setError(
        "تعذر إسناد الطلب للكابتن حاليًا.",
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredDisplayOrders = useMemo(() => {
    if (!heroActiveOnly) {
      return orders;
    }

    const activeStatuses = new Set([
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "assigned",
      "heading_to_shop",
      "arrived_at_shop",
      "picked_up",
      "on_the_way",
    ]);

    return orders.filter((order) => {
      const status = String(
        order?.status || "",
      );

      const captainValue = order?.captainId;

      const captainId =
        typeof captainValue === "string"
          ? captainValue
          : captainValue &&
              typeof captainValue === "object"
            ? String(
                captainValue._id ||
                  captainValue.id ||
                  "",
              )
            : "";

      return (
        Boolean(captainId) &&
        activeStatuses.has(status)
      );
    });
  }, [orders, heroActiveOnly]);

  const availableCaptains = useMemo(
    () =>
      captains.filter(
        (captain) =>
          captain.status === "active" ||
          captain.status === undefined,
      ),
    [captains],
  );

  if (loading) {
    return (
      <>
        <style>{`
          .orders-loading {
            min-height: 60vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #6b7280;
            direction: rtl;
          }

          .orders-loading-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #e5e7eb;
            border-top-color: #f28c28;
            border-radius: 50%;
            animation: orders-spin .8s linear infinite;
          }

          @keyframes orders-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <div className="orders-loading">
          <div className="orders-loading-spinner" />
          <span>جارٍ تحميل الطلبات...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .orders-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 10px 0 30px;
          direction: rtl;
          color: #172033;
        }

        .orders-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 27px 30px;
          margin-bottom: 18px;
          border: 1px solid #edf0f5;
          border-radius: 24px;
          background:
            radial-gradient(circle at 92% 0%, rgba(242,140,40,.13), transparent 27%),
            radial-gradient(circle at 4% 95%, rgba(54,120,219,.07), transparent 28%),
            #fff;
          box-shadow: 0 14px 36px rgba(20,34,56,.055);
        }

        .orders-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding: 7px 11px;
          border: 1px solid #ffe1c5;
          border-radius: 999px;
          background: #fff5eb;
          color: #ea7917;
          font-size: 11px;
          font-weight: 900;
        }

        .orders-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f28c28;
          box-shadow: 0 0 0 5px rgba(242,140,40,.10);
        }

        .orders-hero h1 {
          margin: 0;
          color: #121826;
          font-size: 31px;
          line-height: 1.15;
          letter-spacing: -.6px;
        }

        .orders-hero p {
          max-width: 760px;
          margin: 8px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.8;
        }

        .orders-hero-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .orders-refresh {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 42px;
          padding: 0 14px;
          border: 1px solid #e9edf2;
          border-radius: 13px;
          background: #fff;
          color: #475467;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .orders-refresh:hover {
          border-color: #ffd9b7;
          background: #fffaf5;
        }

        .orders-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0,1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .orders-kpi {
          position: relative;
          overflow: hidden;
          min-height: 122px;
          padding: 16px;
          border: 1px solid #edf0f5;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(20,34,56,.04);
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
          user-select: none;
        }

        .orders-kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(20,34,56,.08);
          border-color: #f5c08d;
        }

        .orders-kpi.is-active {
          border-color: #f28c28;
          box-shadow: 0 0 0 3px rgba(242,140,40,.10), 0 12px 28px rgba(20,34,56,.08);
        }

        .orders-kpi::after {
          content: "";
          position: absolute;
          width: 85px;
          height: 85px;
          left: -33px;
          bottom: -48px;
          border-radius: 50%;
          background: rgba(242,140,40,.05);
        }

        .orders-kpi-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .orders-kpi-title {
          color: #667085;
          font-size: 11px;
          font-weight: 850;
        }

        .orders-kpi-value {
          margin-top: 6px;
          color: #141a27;
          font-size: 26px;
          font-weight: 950;
          line-height: 1;
        }

        .orders-kpi-icon {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #fff5eb;
          color: #eb7c1a;
          flex-shrink: 0;
        }

        .orders-kpi.blue .orders-kpi-icon {
          background: #eef5ff;
          color: #3a7bd8;
        }

        .orders-kpi.green .orders-kpi-icon {
          background: #edf9f2;
          color: #179452;
        }

        .orders-kpi.warning .orders-kpi-icon {
          background: #fff6e1;
          color: #c88000;
        }

        .orders-kpi.danger .orders-kpi-icon {
          background: #fff0ef;
          color: #d24a42;
        }

        .orders-live-stages {
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid #edf0f5;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(20,34,56,.04);
        }

        .orders-live-stages-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 13px;
        }

        .orders-live-stages-title {
          color: #172033;
          font-size: 14px;
          font-weight: 950;
        }

        .orders-live-stages-subtitle {
          margin-top: 4px;
          color: #98a2b3;
          font-size: 10px;
          font-weight: 700;
        }

        .orders-live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border: 1px solid #e8f4ec;
          border-radius: 999px;
          background: #f7fcf8;
          color: #179452;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .orders-live-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #179452;
          box-shadow: 0 0 0 4px rgba(23,148,82,.09);
        }

        .orders-live-stages-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 9px;
        }

        .orders-live-stage {
          min-height: 72px;
          padding: 11px 12px;
          border: 1px solid #edf0f5;
          border-radius: 14px;
          background: #fbfcfd;
          color: #344054;
          text-align: right;
          font: inherit;
          cursor: pointer;
          transition: .16s ease;
        }

        .orders-live-stage:hover {
          transform: translateY(-1px);
          border-color: #f4bf8c;
          background: #fffaf5;
        }

        .orders-live-stage.is-active {
          border-color: #f28c28;
          background: #fff8ef;
          box-shadow: 0 0 0 3px rgba(242,140,40,.08);
        }

        .orders-live-stage span {
          display: block;
          color: #667085;
          font-size: 10px;
          font-weight: 850;
          line-height: 1.5;
        }

        .orders-live-stage strong {
          display: block;
          margin-top: 7px;
          color: #172033;
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
        }


        @media (max-width: 1050px) {
          .orders-live-stages-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .orders-live-stages-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .orders-live-stages-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        .orders-filter-panel {
          margin-bottom: 18px;
          overflow: hidden;
          border: 1px solid #edf0f5;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(20,34,56,.04);
        }

        .orders-filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 19px 22px;
          border-bottom: 1px solid #f0f2f5;
        }

        .orders-filter-title {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 900;
        }

        .orders-filter-subtitle {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .orders-filter-body {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
          gap: 11px;
          padding: 16px 22px 20px;
        }

        .orders-field {
          position: relative;
        }

        .orders-field-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a8b0bc;
          pointer-events: none;
        }

        .orders-field input,
        .orders-field select {
          width: 100%;
          min-height: 45px;
          box-sizing: border-box;
          padding: 0 38px 0 12px;
          border: 1px solid #e8ebf0;
          border-radius: 13px;
          outline: none;
          background: #fbfcfd;
          color: #344054;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          transition: .16s ease;
        }

        .orders-field select {
          padding-right: 12px;
        }

        .orders-field input:focus,
        .orders-field select:focus {
          border-color: #f5bb84;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(242,140,40,.08);
        }

        .orders-date-wrap {
          position: relative;
        }

        .orders-date-label {
          display: block;
          margin: 0 0 5px;
          color: #98a2b3;
          font-size: 9px;
          font-weight: 800;
        }

        .orders-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 22px 16px;
        }

        .orders-result-count {
          color: #667085;
          font-size: 11px;
          font-weight: 800;
        }

        .orders-result-count strong {
          color: #172033;
          font-size: 13px;
        }

        .orders-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          padding: 13px 15px;
          border: 1px solid #ffd6d2;
          border-radius: 15px;
          background: #fff5f4;
          color: #a73d37;
          font-size: 11px;
          font-weight: 800;
        }

        .orders-error button {
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .orders-main-grid {
          display: grid;
          grid-template-columns: minmax(0,1.45fr) minmax(330px,.55fr);
          gap: 18px;
          align-items: start;
        }

        .orders-list-panel,
        .orders-side-panel {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #edf0f5;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(20,34,56,.04);
        }

        .orders-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 19px 22px;
          border-bottom: 1px solid #f0f2f5;
        }

        .orders-panel-heading {
          min-width: 0;
        }

        .orders-panel-title {
          margin: 0;
          color: #172033;
          font-size: 16px;
          font-weight: 900;
        }

        .orders-panel-subtitle {
          margin: 4px 0 0;
          color: #98a2b3;
          font-size: 11px;
        }

        .orders-orders-list {
          display: flex;
          flex-direction: column;
        }

        .orders-card {
          display: grid;
          grid-template-columns: minmax(0,1.1fr) minmax(0,1fr) minmax(170px,.7fr);
          gap: 16px;
          padding: 18px 22px;
          border-bottom: 1px solid #f1f3f6;
          transition: .16s ease;
        }

        .orders-card:last-child {
          border-bottom: 0;
        }

        .orders-card:hover {
          background: #fffdf9;
        }

        .orders-order-main {
          min-width: 0;
        }

        .orders-order-number {
          color: #172033;
          font-size: 14px;
          font-weight: 950;
        }

        .orders-order-time {
          margin-top: 5px;
          color: #98a2b3;
          font-size: 10px;
        }

        .orders-customer {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 12px;
        }

        .orders-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f8f9fb;
          color: #667085;
          flex-shrink: 0;
        }

        .orders-customer-name {
          color: #344054;
          font-size: 11px;
          font-weight: 900;
        }

        .orders-customer-phone {
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
        }

        .orders-order-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .orders-info-box {
          min-width: 0;
          padding: 10px 11px;
          border: 1px solid #f0f2f5;
          border-radius: 12px;
          background: #fafbfc;
        }

        .orders-info-label {
          color: #98a2b3;
          font-size: 9px;
          font-weight: 800;
        }

        .orders-info-value {
          margin-top: 4px;
          overflow: hidden;
          color: #475467;
          font-size: 10px;
          font-weight: 850;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .orders-order-side {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 9px;
        }

        .orders-order-side-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .orders-total {
          color: #1f2937;
          font-size: 13px;
          font-weight: 950;
        }

        .orders-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }

        .orders-status.info {
          background: #eef5ff;
          color: #2d66ae;
        }

        .orders-status.warning {
          background: #fff6df;
          color: #ae6c00;
        }

        .orders-status.success {
          background: #eaf8ef;
          color: #177645;
        }

        .orders-status.danger {
          background: #fff0ef;
          color: #b73c35;
        }

        .orders-captain-box {
          padding: 10px;
          border: 1px solid #edf0f5;
          border-radius: 12px;
          background: #fbfcfd;
        }

        .orders-captain-current {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: #667085;
          font-size: 10px;
          font-weight: 800;
        }

        .orders-captain-select-row {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 7px;
        }

        .orders-captain-select {
          min-width: 0;
          min-height: 37px;
          border: 1px solid #e6e9ee;
          border-radius: 10px;
          padding: 0 8px;
          background: #fff;
          color: #344054;
          font-family: inherit;
          font-size: 10px;
          outline: none;
        }

        .orders-btn {
          min-height: 37px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 0;
          border-radius: 10px;
          padding: 0 11px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: .16s ease;
        }

        .orders-btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .orders-btn-primary {
          background: #f28c28;
          color: #fff;
        }

        .orders-btn-primary:hover:not(:disabled) {
          background: #dd7714;
        }

        .orders-btn-success {
          background: #1f9d5a;
          color: #fff;
        }

        .orders-btn-danger {
          background: #fff0ef;
          color: #ba4039;
          border: 1px solid #ffd9d5;
        }

        .orders-btn-neutral {
          background: #f5f7f9;
          color: #475467;
        }

        .orders-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .orders-view-btn {
          flex: 1;
          min-width: 90px;
          min-height: 37px;
          border: 1px solid #e8ebf0;
          border-radius: 10px;
          background: #fff;
          color: #475467;
          font-family: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .orders-view-btn:hover {
          background: #fffaf5;
          border-color: #ffdcbf;
          color: #db7110;
        }

        .orders-empty {
          padding: 55px 25px;
          text-align: center;
          color: #98a2b3;
          font-size: 12px;
        }

        .orders-empty-icon {
          width: 49px;
          height: 49px;
          display: grid;
          place-items: center;
          margin: 0 auto 11px;
          border-radius: 15px;
          background: #f7f8fa;
          color: #adb5c0;
        }

        .orders-side-block {
          border-bottom: 1px solid #f0f2f5;
        }

        .orders-side-block:last-child {
          border-bottom: 0;
        }

        .orders-side-body {
          padding: 16px 19px 20px;
        }

        .orders-selected-placeholder {
          padding: 38px 20px;
          text-align: center;
          color: #98a2b3;
          font-size: 11px;
          line-height: 1.8;
        }

        .orders-selected-placeholder-icon {
          width: 49px;
          height: 49px;
          display: grid;
          place-items: center;
          margin: 0 auto 10px;
          border-radius: 15px;
          background: #f8fafc;
          color: #b4bbc5;
        }

        .orders-detail-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .orders-detail-number {
          color: #172033;
          font-size: 18px;
          font-weight: 950;
        }

        .orders-detail-date {
          margin-top: 4px;
          color: #98a2b3;
          font-size: 9px;
        }

        .orders-detail-close {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid #e9edf2;
          border-radius: 10px;
          background: #fff;
          color: #667085;
          cursor: pointer;
        }

        .orders-detail-close:hover {
          background: #fff6f2;
          color: #d86e12;
        }

        .orders-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .orders-detail-box {
          padding: 11px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .orders-detail-box.full {
          grid-column: 1 / -1;
        }

        .orders-detail-label {
          color: #98a2b3;
          font-size: 9px;
          font-weight: 800;
        }

        .orders-detail-value {
          margin-top: 5px;
          color: #344054;
          font-size: 10px;
          line-height: 1.7;
          font-weight: 850;
          word-break: break-word;
        }

        .orders-items {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 10px;
        }

        .orders-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 11px;
          border: 1px solid #edf0f5;
          border-radius: 11px;
          background: #fff;
        }

        .orders-item-name {
          color: #344054;
          font-size: 10px;
          font-weight: 900;
        }

        .orders-item-meta {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 9px;
        }

        .orders-item-total {
          color: #475467;
          font-size: 10px;
          font-weight: 950;
          white-space: nowrap;
        }

        .orders-summary-total {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .orders-summary-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #667085;
          font-size: 10px;
        }

        .orders-summary-line strong {
          color: #344054;
        }

        .orders-summary-line.grand {
          margin-top: 2px;
          padding-top: 10px;
          border-top: 1px dashed #e7ebef;
          color: #344054;
        }

        .orders-summary-line.grand strong {
          color: #e87512;
          font-size: 13px;
        }

        .orders-timeline {
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin-top: 4px;
        }

        .orders-timeline-item {
          position: relative;
          display: grid;
          grid-template-columns: 18px minmax(0,1fr);
          gap: 10px;
        }

        .orders-timeline-dot {
          position: relative;
          width: 12px;
          height: 12px;
          margin-top: 3px;
          border-radius: 50%;
          background: #f28c28;
          box-shadow: 0 0 0 4px #fff3e8;
        }

        .orders-timeline-item:not(:last-child) .orders-timeline-dot::after {
          content: "";
          position: absolute;
          top: 15px;
          right: 5px;
          width: 2px;
          height: calc(100% + 12px);
          min-height: 26px;
          background: #eceff3;
        }

        .orders-timeline-label {
          color: #344054;
          font-size: 10px;
          font-weight: 900;
        }

        .orders-timeline-time {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 9px;
        }

        .orders-cancelled {
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid #f1dddd;
          border-radius: 20px;
          background: #fff;
        }

        .orders-cancelled .orders-panel-header {
          background: #fffafa;
        }

        .orders-archive-row {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          align-items: center;
          gap: 13px;
          padding: 14px 20px;
          border-bottom: 1px solid #f3f4f6;
        }

        .orders-archive-row:last-child {
          border-bottom: 0;
        }

        .orders-archive-main {
          min-width: 0;
        }

        .orders-archive-number {
          color: #344054;
          font-size: 11px;
          font-weight: 900;
        }

        .orders-archive-caption {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 9px;
        }

        .orders-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 3px 0;
          color: #98a2b3;
          font-size: 9px;
        }

        .orders-footer-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .orders-footer-live svg {
          color: #28a866;
        }

        @media (max-width: 1250px) {
          .orders-kpis {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }

          .orders-main-grid {
            grid-template-columns: 1fr;
          }

          .orders-side-panel {
            order: -1;
          }

          .orders-filter-body {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 820px) {
          .orders-hero {
            flex-direction: column;
            align-items: stretch;
            padding: 22px 18px;
          }

          .orders-hero h1 {
            font-size: 25px;
          }

          .orders-kpis {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }

          .orders-filter-body {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
          }

          .orders-filter-header,
          .orders-panel-header {
            padding-left: 16px;
            padding-right: 16px;
          }

          .orders-summary-row {
            padding-left: 16px;
            padding-right: 16px;
          }

          .orders-card {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
          }

          .orders-order-info {
            grid-template-columns: 1fr 1fr;
          }

          .orders-archive-row {
            grid-template-columns: 1fr auto;
            padding-left: 16px;
            padding-right: 16px;
          }

          .orders-archive-row .orders-status {
            grid-column: 2;
            grid-row: 1;
          }

          .orders-archive-row .orders-total {
            grid-column: 2;
            grid-row: 2;
          }

          .orders-archive-row .orders-view-btn {
            grid-column: 1;
            grid-row: 2;
          }
        }

        @media (max-width: 520px) {
          .orders-kpis {
            grid-template-columns: 1fr 1fr;
          }

          .orders-kpi {
            min-height: 108px;
            padding: 14px;
          }

          .orders-kpi-value {
            font-size: 23px;
          }

          .orders-order-info {
            grid-template-columns: 1fr;
          }

          .orders-detail-grid {
            grid-template-columns: 1fr;
          }

          .orders-detail-box.full {
            grid-column: auto;
          }

          .orders-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="orders-page">
        <section className="orders-hero">
          <div>
            <div className="orders-eyebrow">
              <span className="orders-eyebrow-dot" />
              مركز الطلبات
            </div>

            <h1>الطلبات</h1>

            <p>
              متابعة الطلبات، حالاتها، الكباتن، تفاصيل العملاء،
              وإدارة سير الطلب من شاشة واحدة.
            </p>
          </div>

          <div className="orders-hero-actions">
            <button
              type="button"
              className="orders-refresh"
              onClick={() => void loadOrders(false)}
              disabled={loading || saving}
            >
              <RefreshCw size={15} />
              تحديث البيانات
            </button>
          </div>
        </section>

                <section className="orders-kpis">
          <article
            className={`orders-kpi ${
              allOrdersSearchMode ? "is-active" : ""
            }`}
            role="button"
            tabIndex={0}
            aria-label="إجمالي الطلبات الكلية"
            onClick={() => {
              setAllOrdersSearchMode(true);
              setHeroActiveOnly(false);
              setStatusFilter("all");
              setAreaSearch("");
              setFromDate("");
              setToDate("");
              setSearchText("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setAllOrdersSearchMode(true);
                setHeroActiveOnly(false);
                setStatusFilter("all");
                setAreaSearch("");
                setFromDate("");
                setToDate("");
                setSearchText("");
              }
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  إجمالي الطلبات الكلية
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.allTotal}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <Package size={19} />
              </div>
            </div>
          </article>

          <article
            className={`orders-kpi ${
              statusFilter === "all" &&
              !heroActiveOnly
                ? "is-active"
                : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setAllOrdersSearchMode(false);
              setHeroActiveOnly(false);
              setStatusFilter("all");
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  إجمالي الطلبات الحالية
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.total}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <Package size={19} />
              </div>
            </div>
          </article>

          <article
            className={`orders-kpi warning ${
              statusFilter === "available" &&
              !heroActiveOnly
                ? "is-active"
                : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setHeroActiveOnly(false);
              setStatusFilter("available");
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  الطلبات المتاحة
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.available}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <BellIcon />
              </div>
            </div>
          </article>

          <article
            className="orders-kpi warning"
            role="button"
            tabIndex={0}
            onClick={() => {
              window.location.href =
                "/operations-center?filter=stuck";
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                window.location.href =
                  "/operations-center?filter=stuck";
              }
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  الطلبات العالقة
                </div>

                <div className="orders-kpi-value">
                  {stuckOrdersCount}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <AlertTriangle size={19} />
              </div>
            </div>
          </article>

          <article
            className={`orders-kpi blue ${
              heroActiveOnly
                ? "is-active"
                : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setHeroActiveOnly(true);
              setStatusFilter("all");
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  الطلبات النشطة
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.active}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <Clock3 size={19} />
              </div>
            </div>
          </article>

          <article
            className={`orders-kpi green ${
              statusFilter === "delivered" &&
              !heroActiveOnly
                ? "is-active"
                : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setHeroActiveOnly(false);
              setStatusFilter("delivered");
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  طلبات مكتملة
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.delivered}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <CheckCircle2 size={19} />
              </div>
            </div>
          </article>

          <article
            className={`orders-kpi danger ${
              statusFilter === "cancelled" &&
              !heroActiveOnly
                ? "is-active"
                : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setHeroActiveOnly(false);
              setStatusFilter("cancelled");
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  ملغاة
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.cancelled}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <X size={19} />
              </div>
            </div>
          </article>

          <article
            className={`orders-kpi danger ${
              statusFilter === "rejected" &&
              !heroActiveOnly
                ? "is-active"
                : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setHeroActiveOnly(false);
              setStatusFilter("rejected");
            }}
          >
            <div className="orders-kpi-top">
              <div>
                <div className="orders-kpi-title">
                  مرفوضة
                </div>

                <div className="orders-kpi-value">
                  {liveOrderCounts.rejected}
                </div>
              </div>

              <div className="orders-kpi-icon">
                <AlertTriangle size={19} />
              </div>
            </div>
          </article>
        </section>

        <section className="orders-live-stages">
          <div className="orders-live-stages-head">
            <div>
              <div className="orders-live-stages-title">
                متابعة رحلة الطلب
              </div>
              <div className="orders-live-stages-subtitle">
                الحالات تتحدث تلقائيًا من الطلبات الفعلية
              </div>
            </div>

            <div className="orders-live-indicator">
              <span />
              مباشر
            </div>
          </div>

          <div className="orders-live-stages-grid">
            <button
              type="button"
              className={`orders-live-stage ${
                statusFilter === "assigned" &&
                !heroActiveOnly
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setHeroActiveOnly(false);
                setStatusFilter("assigned");
              }}
            >
              <span>تم الإسناد</span>
              <strong>
                {liveOrderCounts.assigned}
              </strong>
            </button>

            <button
              type="button"
              className={`orders-live-stage ${
                statusFilter === "heading_to_shop" &&
                !heroActiveOnly
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setHeroActiveOnly(false);
                setStatusFilter("heading_to_shop");
              }}
            >
              <span>الذهاب إلى المحل</span>
              <strong>
                {liveOrderCounts.heading_to_shop}
              </strong>
            </button>

            <button
              type="button"
              className={`orders-live-stage ${
                statusFilter === "arrived_at_shop" &&
                !heroActiveOnly
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setHeroActiveOnly(false);
                setStatusFilter("arrived_at_shop");
              }}
            >
              <span>وصل المحل</span>
              <strong>
                {liveOrderCounts.arrived_at_shop}
              </strong>
            </button>

            <button
              type="button"
              className={`orders-live-stage ${
                statusFilter === "picked_up" &&
                !heroActiveOnly
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setHeroActiveOnly(false);
                setStatusFilter("picked_up");
              }}
            >
              <span>استلام الطلب</span>
              <strong>
                {liveOrderCounts.picked_up}
              </strong>
            </button>

            <button
              type="button"
              className={`orders-live-stage ${
                statusFilter === "on_the_way" &&
                !heroActiveOnly
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setHeroActiveOnly(false);
                setStatusFilter("on_the_way");
              }}
            >
              <span>في الطريق للعميل</span>
              <strong>
                {liveOrderCounts.on_the_way}
              </strong>
            </button>

            <button
              type="button"
              className={`orders-live-stage ${
                statusFilter === "delivered" &&
                !heroActiveOnly
                  ? "is-active"
                  : ""
              }`}
              onClick={() => {
                setHeroActiveOnly(false);
                setStatusFilter("delivered");
              }}
            >
              <span>طلبات مكتملة</span>
              <strong>
                {liveOrderCounts.delivered}
              </strong>
            </button>
          </div>
        </section>

        <section className="orders-filter-panel">
          <div className="orders-filter-header">
            <div>
              <h2 className="orders-filter-title">
                البحث والتصفية
              </h2>

              <p className="orders-filter-subtitle">
                {allOrdersSearchMode
                  ? "البحث داخل جميع الطلبات بكل حالاتها"
                  : "النتائج تتحدث مباشرة حسب الاختيارات الحالية"}
              </p>
            </div>

            <Activity
              size={18}
              color="#adb5c0"
            />
          </div>

          <div className="orders-filter-body">
            <div className="orders-field">
              <Search
                size={16}
                className="orders-field-icon"
              />

              <input
                id="orders-all-search-input"
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder={
                  allOrdersSearchMode
                    ? "اكتب رقم الطلب للبحث في كل الطلبات..."
                    : "ابحث برقم الطلب أو اسم العميل..."
                }
              />
            </div>

            <div className="orders-field">
              <MapPin
                size={16}
                className="orders-field-icon"
              />

              <input
                value={areaSearch}
                onChange={(event) =>
                  setAreaSearch(event.target.value)
                }
                placeholder="المنطقة"
              />
            </div>

            <div>
              <label className="orders-date-label">
                من تاريخ
              </label>

              <div className="orders-field">
                <CalendarDays
                  size={15}
                  className="orders-field-icon"
                />

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) =>
                    setFromDate(event.target.value)
                  }
                />
              </div>
            </div>

            <div>
              <label className="orders-date-label">
                إلى تاريخ
              </label>

              <div className="orders-field">
                <CalendarDays
                  size={15}
                  className="orders-field-icon"
                />

                <input
                  type="date"
                  value={toDate}
                  onChange={(event) =>
                    setToDate(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="orders-field">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "all"
                      | "available"
                      | OrderStatus,
                  )
                }
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="orders-summary-row">
            <div className="orders-result-count">
              النتائج الحالية:{" "}
              <strong>
                {filteredDisplayOrders.length}
              </strong>{" "}
              طلب
            </div>

            <button
              type="button"
              className="orders-btn orders-btn-neutral"
              onClick={() => {
                setAllOrdersSearchMode(false);
                setSearchText("");
                setAreaSearch("");
                setFromDate("");
                setToDate("");
                setStatusFilter("all");
              }}
            >
              مسح الفلاتر
            </button>
          </div>
        </section>

        {error && (
          <div className="orders-error">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <section className="orders-main-grid">
          <article className="orders-list-panel">
            <div className="orders-panel-header">
              <div className="orders-panel-heading">
                <h2 className="orders-panel-title">
                  {allOrdersSearchMode
                    ? "نتائج البحث في جميع الطلبات"
                    : "الطلبات الحالية"}
                </h2>

                <p className="orders-panel-subtitle">
                  {allOrdersSearchMode
                    ? "تظهر كل الحالات المطابقة لرقم الطلب"
                    : "الحالات تتحدث تلقائيًا من النظام"}
                </p>
              </div>

              <span className="orders-status info">
                {filteredDisplayOrders.length} طلب
              </span>
            </div>

            {filteredDisplayOrders.length === 0 ? (
              <div className="orders-empty">
                <div className="orders-empty-icon">
                  <Package size={23} />
                </div>

                لا توجد طلبات مطابقة للفلاتر الحالية.
              </div>
            ) : (
              <div className="orders-orders-list">
                {filteredDisplayOrders.map((order) => {
                  const customerName =
                    order.customerSnapshot?.name ||
                    order.customerName ||
                    (order.customerId &&
                    typeof order.customerId === "object"
                      ? order.customerId.fullName ||
                        order.customerId.name
                      : "") ||
                    getName(order.customerId) ||
                    "—";

                  const customerPhone =
                    order.customerSnapshot?.phone ||
                    order.customerPhone ||
                    (order.customerId &&
                    typeof order.customerId === "object"
                      ? order.customerId.phone
                      : "") ||
                    getPhone(order.customerId) ||
                    "—";

                  const captainName =
                    getName(order.captainId);

                  return (
                    <article
                      className={`orders-card ${
                        order.status === "delivered" ||
                        order.status === "completed"
                          ? "orders-card-completed"
                          : ""
                      }`}
                      key={order._id}
                    >
                      <div className="orders-order-main">
                        <div className="orders-order-number">
                          {order.orderNumber ||
                            `#${order._id.slice(-6)}`}
                        </div>

                        <div className="orders-order-time">
                          {formatDate(order.createdAt)}
                        </div>

                        <div className="orders-customer">
                          <div className="orders-avatar">
                            <User size={16} />
                          </div>

                          <div>
                            <div className="orders-customer-name">
                              {customerName}
                            </div>

                            <div className="orders-customer-phone">
                              {customerPhone}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!(order.status === "delivered" ||
                        order.status === "completed") && (
                      <div className="orders-order-info">
                        <div className="orders-info-box">
                          <div className="orders-info-label">
                            المطعم / المحل
                          </div>

                          <div className="orders-info-value">
                            {getName(
                              order.establishmentId ||
                                order.restaurantId ||
                                order.shopId ||
                                order.storeId,
                            )}
                          </div>
                        </div>

                        <div className="orders-info-box">
                          <div className="orders-info-label">
                            الكابتن
                          </div>

                          <div className="orders-info-value">
                            {captainName}
                          </div>
                        </div>

                        <div className="orders-info-box">
                          <div className="orders-info-label">
                            عنوان التوصيل
                          </div>

                          <div className="orders-info-value">
                            {order.customerSnapshot?.addressText ||
                              getAddress(order.addressId)}
                          </div>
                        </div>

                        <div className="orders-info-box">
                          <div className="orders-info-label">
                            الإجمالي
                          </div>

                          <div className="orders-info-value">
                            {money(order.total)}
                          </div>
                        </div>
                      </div>
                      )}

                      {(order.status === "delivered" ||
                        order.status === "completed") && (
                        <div className="orders-completed-summary">
                          <div className="orders-completed-header">
                            <div>
                              <div className="orders-completed-title">
                                طلبات مكتملة
                              </div>

                              <div className="orders-completed-number">
                                {order.orderNumber ||
                                  `#${order._id.slice(-6)}`}
                              </div>
                            </div>

                            <span className="orders-completed-status">
                              مكتمل
                            </span>
                          </div>

                          <div className="orders-completed-grid">
                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                العميل
                              </div>

                              <div className="orders-info-value">
                                {customerName !== "—"
                                  ? customerName
                                  : "بيانات العميل غير متاحة"}
                                {customerPhone !== "—"
                                  ? ` • ${customerPhone}`
                                  : ""}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                المطعم / المحل
                              </div>

                              <div className="orders-info-value">
                                {getName(
                                  order.establishmentId ||
                                    order.restaurantId ||
                                    order.shopId ||
                                    order.storeId,
                                )}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                الكابتن
                              </div>

                              <div className="orders-info-value">
                                {captainName}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                عنوان التوصيل
                              </div>

                              <div className="orders-info-value">
                                {order.customerSnapshot?.addressText ||
                                  order.deliveryAddress ||
                                  order.addressText ||
                                  (order.addressId &&
                                  typeof order.addressId === "object"
                                    ? order.addressId.address ||
                                      order.addressId.label
                                    : "") ||
                                  getAddress(order.addressId) ||
                                  "عنوان التوصيل غير متاح"}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                مدة الرحلة
                              </div>

                              <div className="orders-info-value">
                                {formatTravelDuration(
                                  order.assignedAt,
                                  order.deliveredAt,
                                )}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                وقت أخذ الكابتن
                              </div>

                              <div className="orders-info-value">
                                {formatDate(order.assignedAt)}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                وقت الاستلام من المحل
                              </div>

                              <div className="orders-info-value">
                                {formatDate(order.pickedUpAt)}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                وقت التسليم
                              </div>

                              <div className="orders-info-value">
                                {formatDate(order.deliveredAt)}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                تاريخ إنشاء الطلب
                              </div>

                              <div className="orders-info-value">
                                {formatDate(order.createdAt)}
                              </div>
                            </div>

                            <div className="orders-info-box">
                              <div className="orders-info-label">
                                الإجمالي
                              </div>

                              <div className="orders-info-value">
                                {money(order.total)}
                              </div>
                            </div>
                          </div>

                          <div className="orders-completed-actions">
                            <button
                              type="button"
                              className="orders-view-btn"
                              onClick={() =>
                                setSelectedOrder(order)
                              }
                            >
                              عرض التفاصيل
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="orders-order-side">
                        <div className="orders-order-side-top">
                          <span className="orders-total">
                            {money(order.total)}
                          </span>

                          <span
                            className={statusClass(
                              order.status,
                            )}
                          >
                            {statusLabels[order.status] ||
                              order.status}
                          </span>
                        </div>

                        {!(order.status === "delivered" ||
                          order.status === "completed") && (
                        <div className="orders-captain-box">
                          <div className="orders-captain-current">
                            <Truck size={13} />

                            <span>
                              {captainName === "—"
                                ? "لم يتم تعيين كابتن"
                                : `الكابتن: ${captainName}`}
                            </span>
                          </div>

                          {!["delivered", "completed"].includes(
                            String(order.status),
                          ) && (
                              <div className="orders-captain-select-row">
                                <select
                                  className="orders-captain-select"
                                  value={
                                    selectedCaptain[
                                      order._id
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    setSelectedCaptain(
                                      (current) => ({
                                        ...current,
                                        [order._id]:
                                          event.target.value,
                                      }),
                                    )
                                  }
                                  disabled={
                                    saving ||
                                    !canManageOrders(
                                      currentRole,
                                    )
                                  }
                                >
                                  <option value="">
                                    اختيار كابتن
                                  </option>

                                  {availableCaptains.map(
                                    (captain) => (
                                      <option
                                        key={captain._id}
                                        value={captain._id}
                                      >
                                        {captain.fullName ||
                                          captain.phone ||
                                          "كابتن"}
                                        {captain.isOnline
                                          ? " • متصل"
                                          : ""}
                                      </option>
                                    ),
                                  )}
                                </select>

                                <button
                                  type="button"
                                  className="orders-btn orders-btn-primary"
                                  disabled={
                                    saving ||
                                    !selectedCaptain[
                                      order._id
                                    ] ||
                                    !canManageOrders(
                                      currentRole,
                                    )
                                  }
                                  onClick={() =>
                                    void assignCaptain(
                                      order._id,
                                    )
                                  }
                                >
                                  <Truck size={13} />
                                  إسناد
                                </button>
                              </div>
                            )}
                        </div>
                        )}

                        <div className="orders-actions">
                          <button
                            type="button"
                            className="orders-view-btn"
                            onClick={() =>
                              setSelectedOrder(order)
                            }
                          >
                            عرض التفاصيل
                          </button>

                          {order.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="orders-btn orders-btn-success"
                                disabled={saving}
                                onClick={() =>
                                  void updateStatus(
                                    order,
                                    "confirmed",
                                  )
                                }
                              >
                                <Check size={13} />
                                تأكيد
                              </button>

                              <button
                                type="button"
                                className="orders-btn orders-btn-danger"
                                disabled={saving}
                                onClick={() =>
                                  void updateStatus(
                                    order,
                                    "rejected",
                                  )
                                }
                              >
                                <X size={13} />
                                رفض
                              </button>
                            </>
                          )}

                          {order.status ===
                            "confirmed" && (
                            <button
                              type="button"
                              className="orders-btn orders-btn-neutral"
                              disabled={saving}
                              onClick={() =>
                                void updateStatus(
                                  order,
                                  "preparing",
                                )
                              }
                            >
                              بدء التجهيز
                            </button>
                          )}

                          {order.status ===
                            "preparing" && (
                            <button
                              type="button"
                              className="orders-btn orders-btn-neutral"
                              disabled={saving}
                              onClick={() =>
                                void updateStatus(
                                  order,
                                  "ready_for_pickup",
                                )
                              }
                            >
                              جاهز للاستلام
                            </button>
                          )}
                        </div>

                        {order.status !== "delivered" &&
                          order.status !== "completed" &&
                          order.status !== "cancelled" &&
                          order.status !== "rejected" && (
                            <button
                              type="button"
                              className="orders-btn orders-btn-success"
                              disabled={saving}
                              onClick={() =>
                                void redispatchOrder(
                                  order._id,
                                )
                              }
                              style={{
                                width: "100%",
                              }}
                            >
                              إعادة إلى الطلبات المتاحة
                            </button>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="orders-side-panel">
            {!selectedOrder ? (
              <div className="orders-selected-placeholder">
                <div className="orders-selected-placeholder-icon">
                  <Package size={23} />
                </div>

                اختر طلبًا من القائمة لعرض التفاصيل
                والـTimeline ومعلومات العميل والكابتن.
              </div>
            ) : (
              <>
                <div className="orders-panel-header">
                  <div className="orders-panel-heading">
                    <h2 className="orders-panel-title">
                      تفاصيل الطلب
                    </h2>

                    <p className="orders-panel-subtitle">
                      {selectedOrder.orderNumber ||
                        `#${selectedOrder._id.slice(-6)}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="orders-detail-close"
                    onClick={() =>
                      setSelectedOrder(null)
                    }
                    aria-label="إغلاق"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="orders-side-body">
                  <div className="orders-detail-top">
                    <div>
                      <div className="orders-detail-number">
                        {selectedOrder.orderNumber ||
                          `#${selectedOrder._id.slice(-6)}`}
                      </div>

                      <div className="orders-detail-date">
                        {formatDate(
                          selectedOrder.createdAt,
                        )}
                      </div>
                    </div>

                    <span
                      className={statusClass(
                        selectedOrder.status,
                      )}
                    >
                      {statusLabels[
                        selectedOrder.status
                      ] ||
                        selectedOrder.status}
                    </span>
                  </div>

                  <div className="orders-detail-grid">
                    <div className="orders-detail-box">
                      <div className="orders-detail-label">
                        العميل
                      </div>

                      <div className="orders-detail-value">
                        {selectedOrder.customerSnapshot?.name ||
                          getName(
                            selectedOrder.customerId,
                          )}
                      </div>
                    </div>

                    <div className="orders-detail-box">
                      <div className="orders-detail-label">
                        هاتف العميل
                      </div>

                      <div className="orders-detail-value">
                        {selectedOrder.customerSnapshot?.phone ||
                          getPhone(
                            selectedOrder.customerId,
                          )}
                      </div>
                    </div>

                    <div className="orders-detail-box">
                      <div className="orders-detail-label">
                        المطعم / المحل
                      </div>

                      <div className="orders-detail-value">
                        {getName(
                          selectedOrder.establishmentId ||
                            selectedOrder.restaurantId ||
                            selectedOrder.shopId ||
                            selectedOrder.storeId,
                        )}
                      </div>
                    </div>

                    <div className="orders-detail-box">
                      <div className="orders-detail-label">
                        الكابتن
                      </div>

                      <div className="orders-detail-value">
                        {getName(
                          selectedOrder.captainId,
                        )}
                      </div>
                    </div>

                    <div className="orders-detail-box full">
                      <div className="orders-detail-label">
                        هاتف الكابتن
                      </div>

                      <div className="orders-detail-value">
                        {getPhone(
                          selectedOrder.captainId,
                        )}
                      </div>
                    </div>

                    <div className="orders-detail-box full">
                      <div className="orders-detail-label">
                        عنوان التوصيل
                      </div>

                      <div className="orders-detail-value">
                        {selectedOrder.customerSnapshot?.addressText ||
                          getAddress(
                            selectedOrder.addressId,
                          )}
                      </div>
                    </div>
                  </div>

                  {(
                    selectedOrder.status === "cancelled" ||
                    selectedOrder.status === "rejected"
                  ) && (
                    <div
                      className="orders-detail-box full"
                      style={{
                        marginTop: 14,
                        padding: "15px 16px",
                        border: "1px solid #f0d4d4",
                        borderRadius: 16,
                        background:
                          "linear-gradient(135deg, #fff8f8 0%, #fff 100%)",
                      }}
                    >
                      <div
                        className="orders-detail-label"
                        style={{
                          color: "#b42318",
                          fontWeight: 800,
                        }}
                      >
                        سبب الرفض / الإلغاء
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          color: "#344054",
                          fontWeight: 700,
                          lineHeight: 1.8,
                        }}
                      >
                        {selectedOrder.cancellationRecord?.reason ||
                          selectedOrder.cancellationReason ||
                          "لا يوجد سبب مسجل."}
                      </div>

                      <div
                        style={{
                          marginTop: 11,
                          paddingTop: 10,
                          borderTop:
                            "1px solid rgba(180, 35, 24, 0.10)",
                          color: "#667085",
                          fontSize: 13,
                          lineHeight: 1.7,
                        }}
                      >
                        <strong
                          style={{
                            color: "#344054",
                          }}
                        >
                          تم بواسطة:
                        </strong>{" "}
                        {(() => {
                          const role = String(
                            selectedOrder.cancellationRecord
                              ?.cancelledByRole || "",
                          ).toLowerCase();

                          const actor =
                            selectedOrder.cancellationRecord
                              ?.cancelledBy;

                          const actorName =
                            typeof actor === "object" &&
                            actor !== null
                              ? actor.fullName ||
                                actor.phone ||
                                actor.email ||
                                "—"
                              : "—";

                          const actorLabel =
                            role === "captain"
                              ? "الكابتن"
                              : role === "shop" ||
                                  role === "establishment"
                                ? "المطعم / المحل"
                                : role || "—";

                          return `${actorLabel} — ${actorName}`;
                        })()}
                      </div>

                      {selectedOrder.cancellationRecord?.createdAt && (
                        <div
                          style={{
                            marginTop: 6,
                            color: "#98a2b3",
                            fontSize: 11,
                          }}
                        >
                          وقت التسجيل:{" "}
                          {formatDate(
                            selectedOrder.cancellationRecord.createdAt,
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 17 }}>
                    <div className="orders-detail-label">
                      محتويات الطلب
                    </div>

                    {!Array.isArray(
                      selectedOrder.items,
                    ) ||
                    selectedOrder.items.length === 0 ? (
                      <div
                        className="orders-detail-value"
                        style={{
                          marginTop: 9,
                          color: "#98a2b3",
                        }}
                      >
                        لا توجد تفاصيل منتجات متاحة
                      </div>
                    ) : (
                      <div className="orders-items">
                        {selectedOrder.items.map(
                          (item, index) => (
                            <div
                              className="orders-item"
                              key={`${item.productId || item.name}-${index}`}
                            >
                              <div>
                                <div className="orders-item-name">
                                  {item.name}
                                </div>

                                <div className="orders-item-meta">
                                  الكمية: {item.quantity}
                                  {item.unitPrice
                                    ? ` • ${money(
                                        item.unitPrice,
                                      )}`
                                    : ""}
                                </div>
                              </div>

                              <div className="orders-item-total">
                                {money(
                                  Number(
                                    item.totalPrice,
                                  ) || 0,
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div className="orders-summary-total">
                    <div className="orders-summary-line">
                      <span>رسوم التوصيل</span>
                      <strong>
                        {money(
                          selectedOrder.deliveryFee,
                        )}
                      </strong>
                    </div>

                    <div className="orders-summary-line">
                      <span>
                        المجموع قبل التوصيل
                      </span>
                      <strong>
                        {money(
                          selectedOrder.subtotal,
                        )}
                      </strong>
                    </div>

                    <div className="orders-summary-line grand">
                      <span>الإجمالي</span>
                      <strong>
                        {money(
                          selectedOrder.total,
                        )}
                      </strong>
                    </div>
                  </div>

                  {(selectedOrder.customerNote ||
                    selectedOrder.customerSnapshot
                      ?.customerNote ||
                    selectedOrder.notes) && (
                    <div
                      className="orders-detail-box full"
                      style={{ marginTop: 12 }}
                    >
                      <div className="orders-detail-label">
                        ملاحظة العميل
                      </div>

                      <div className="orders-detail-value">
                        {selectedOrder.customerNote ||
                          selectedOrder.customerSnapshot
                            ?.customerNote ||
                          selectedOrder.notes}
                      </div>
                    </div>
                  )}
                </div>

                <div className="orders-side-block">
                  <div className="orders-panel-header">
                    <div className="orders-panel-heading">
                      <h2 className="orders-panel-title">
                        سجل الطلب
                      </h2>

                      <p className="orders-panel-subtitle">
                        التسلسل الزمني للطلب
                      </p>
                    </div>

                    <Clock3
                      size={17}
                      color="#adb5c0"
                    />
                  </div>

                  <div className="orders-side-body">
                    {timelineLoading ? (
                      <div className="orders-selected-placeholder">
                        جارٍ تحميل السجل...
                      </div>
                    ) : orderTimeline.length === 0 ? (
                      <div className="orders-selected-placeholder">
                        لا توجد أحداث مسجلة لهذا الطلب.
                      </div>
                    ) : (
                      <div className="orders-timeline">
                        {orderTimeline.map(
                          (item, index) => (
                            <div
                              className="orders-timeline-item"
                              key={
                                item?._id ||
                                `${timelineTime(item)}-${index}`
                              }
                            >
                              <span className="orders-timeline-dot" />

                              <div>
                                <div className="orders-timeline-label">
                                  {timelineLabel(item)}
                                </div>

                                <div className="orders-timeline-time">
                                  {timelineTime(item)
                                    ? formatDate(
                                        timelineTime(
                                          item,
                                        ),
                                      )
                                    : "—"}
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        </section>

        {statusFilter === "all" &&
          pendingCancelledOrders.length > 0 && (
            <section className="orders-cancelled">
              <div className="orders-panel-header">
                <div className="orders-panel-heading">
                  <h2 className="orders-panel-title">
                    الطلبات الملغاة والمرفوضة
                  </h2>

                  <p className="orders-panel-subtitle">
                    الطلبات المنتهية التي لا تظهر ضمن القائمة الحالية
                  </p>
                </div>

                <span className="orders-status danger">
                  {pendingCancelledOrders.length}
                </span>
              </div>

              {pendingCancelledOrders.map(
                (order) => (
                  <div
                    className="orders-archive-row"
                    key={order._id}
                  >
                    <div className="orders-archive-main">
                      <div className="orders-archive-number">
                        {order.orderNumber ||
                          `#${order._id.slice(-6)}`}
                      </div>

                      <div className="orders-archive-caption">
                        {formatDate(
                          order.createdAt,
                        )}{" "}
                        •{" "}
                        {getName(
                          order.customerId,
                        )}
                      </div>
                    </div>

                    <span
                      className={statusClass(
                        order.status,
                      )}
                    >
                      {statusLabels[
                        order.status
                      ] || order.status}
                    </span>

                    <div className="orders-total">
                      {money(order.total)}
                    </div>

                    <button
                      type="button"
                      className="orders-view-btn"
                      onClick={() =>
                        setSelectedOrder(order)
                      }
                    >
                      التفاصيل
                    </button>
                  </div>
                ),
              )}
            </section>
          )}

        <div className="orders-footer">
          <span className="orders-footer-live">
            <CheckCircle2 size={12} />
            شاشة الطلبات تعمل بشكل طبيعي
          </span>

          <span>
            إجمالي الكباتن المتاحة للإسناد:{" "}
            {availableCaptains.length}
          </span>
        </div>
      </div>
    </>
  );
}

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
