import { submitCaptainRating } from "../../api/ratingRuntime";
import { apiGet } from "../../api/request";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  TextInput,
  Modal,
  
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";

import Screen from "../../components/Screen";
import LoadingState from "../../components/LoadingState";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import { getOrder, getOrders } from "../../api/orders";
import { getOrderCaptainRating } from "../../api/ratingRuntime";
import { useAppTheme } from "../../theme/useAppTheme";
import { cancelOrder } from "../../api/orderCancellation";

const SHOP_PRIMARY = "#E8751A";
const SHOP_PRIMARY_DARK = "#C65B0B";
const SHOP_SOFT = "#FFF1E3";
const SHOP_BG = "#FFF9F4";
const SHOP_BORDER = "#EEDDD0";

const HISTORY_STATUSES = [
  "delivered",
  "completed",
  "rejected",
  "cancelled",
];

const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "heading_to_shop",
  "arrived_at_shop",
  "picked_up",
  "on_the_way",
];

const HISTORY_PAGE_SIZE = 5;

function getOrderId(order: any): string {
  return String(order?._id || order?.id || "");
}

function displayOrderNumber(order: any): string {
  const values = [
    order?.shortOrderNumber,
    order?.sequence,
    order?.orderNumber,
    order?.number,
  ];

  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const raw = String(value).trim();

    if (!raw) {
      continue;
    }

    if (raw.startsWith("DZ-")) {
      const match = raw.match(/^DZ-\d+-([0-9]+)/);

      if (match?.[1]) {
        return match[1];
      }

      return raw.replace(/^DZ-\d+-/, "").slice(0, 8);
    }

    return raw.replace(/^#/, "");
  }

  return "—";
}

function getCaptainId(order: any): string {
  const captain =
    order?.captainId ||
    order?.captain ||
    null;

  if (!captain) return "";

  if (typeof captain === "string") {
    return captain;
  }

  return String(
    captain?._id ||
    captain?.id ||
    "",
  );
}

function getCustomerName(order: any): string {
  return (
    order?.customerSnapshot?.name ||
    order?.customerSnapshot?.fullName ||
    order?.customer?.name ||
    order?.customer?.fullName ||
    order?.customerName ||
    "—"
  );
}

function getCustomerPhone(order: any): string {
  return (
    order?.customerSnapshot?.phone ||
    order?.customer?.phone ||
    order?.customerPhone ||
    "—"
  );
}

function getCustomerAddress(order: any): string {
  return (
    order?.customerSnapshot?.address ||
    order?.address?.address ||
    order?.addressId?.address ||
    order?.deliveryAddress ||
    "—"
  );
}

function getOrderDate(order: any): string {
  return order?.createdAt || order?.updatedAt || null;
}

function formatDateTime(value: any): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return `${date.toLocaleDateString("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })} - ${date.toLocaleTimeString("ar-IQ-u-nu-latn", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function extractOrders(response: any): any[] {
  const list = Array.isArray(response)
    ? response
    : response?.orders ||
      response?.items ||
      response?.data ||
      [];

  return Array.isArray(list) ? list : [];
}

function sortNewestFirst(list: any[]): any[] {
  return [...list].sort((a, b) => {
    const aTime = new Date(
      a?.createdAt || a?.updatedAt || 0,
    ).getTime();

    const bTime = new Date(
      b?.createdAt || b?.updatedAt || 0,
    ).getTime();

    return bTime - aTime;
  });
}

function getHistoryLabel(status: string): {
  label: string;
  color: string;
  background: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  if (
    status === "delivered" ||
    status === "completed"
  ) {
    return {
      label: "مكتمل",
      color: "#16A34A",
      background: "#DCFCE7",
      icon: "checkmark-circle",
    };
  }

  return {
    label: "مرفوض",
    color: "#DC2626",
    background: "#FEE2E2",
    icon: "close-circle",
  };
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  const pages: Array<number | "..."> = [1];

  if (currentPage > 4) {
    pages.push("...");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(
    totalPages - 1,
    currentPage + 1,
  );

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (currentPage < totalPages - 3) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
}

export default function ShopOrdersScreen() {
  const [orderFilter, setOrderFilter] =
    useState<"all" | "active" | "completed" | "rejected">("all");

  const [activePage, setActivePage] = useState(1);
  const [openedOrderSection, setOpenedOrderSection] =
    useState<string | null>(null);


  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const navigation = useNavigation<any>();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);

  const [cancelVisible, setCancelVisible] =
    useState(false);
  const [cancelOrderId, setCancelOrderId] =
    useState<string | null>(null);
  const [cancelReason, setCancelReason] =
    useState("");
  const [cancelBusy, setCancelBusy] =
    useState(false);

  const [detailsById, setDetailsById] =
    useState<Record<string, any>>({});

  const [detailsLoadingId, setDetailsLoadingId] =
    useState<string | null>(null);

  const [ratingByOrderId, setRatingByOrderId] =
    useState<Record<string, boolean>>({});

  const isFocused = useIsFocused();

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await getOrders();
        setOrders(
          sortNewestFirst(
            extractOrders(response),
          ),
        );
      } catch (error: any) {
        if (!silent) {
          Alert.alert(
            "تعذر تحميل الطلبات",
            error?.response?.data?.message ||
              "تعذر الاتصال بالخادم.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      load(true);
    }, 15000);

    return () => clearInterval(timer);
  }, [load]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) =>
      ACTIVE_STATUSES.includes(
        String(order?.status || "").toLowerCase(),
      ),
    );
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter((order) =>
      HISTORY_STATUSES.includes(
        String(order?.status || "").toLowerCase(),
      ),
    );
  }, [orders]);


  const filteredHistoryOrders = useMemo(() => {
    if (orderFilter === "completed") {
      return historyOrders.filter(
        (order) =>
          order?.status === "completed" ||
          order?.status === "delivered",
      );
    }

    if (orderFilter === "rejected") {
      return historyOrders.filter(
        (order) =>
          order?.status === "rejected" ||
          order?.status === "cancelled",
      );
    }

    return historyOrders;
  }, [
    orderFilter,
    historyOrders,
  ]);

  const activeTotalPages = Math.max(
    1,
    Math.ceil(activeOrders.length / 5),
  );

  const safeActivePage = Math.min(
    activePage,
    activeTotalPages,
  );

  const paginatedActiveOrders = useMemo(() => {
    const start =
      (safeActivePage - 1) * 5;

    return activeOrders.slice(
      start,
      start + 5,
    );
  }, [
    activeOrders,
    safeActivePage,
  ]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(
      filteredHistoryOrders.length /
        HISTORY_PAGE_SIZE,
    ),
  );

  const safeHistoryPage = Math.min(
    historyPage,
    historyTotalPages,
  );

  const paginatedHistory = useMemo(() => {
    const start =
      (safeHistoryPage - 1) *
      HISTORY_PAGE_SIZE;

    return filteredHistoryOrders.slice(
      start,
      start + HISTORY_PAGE_SIZE,
    );
  }, [
    filteredHistoryOrders,
    safeHistoryPage,
  ]);

  const stats = useMemo(() => {
    const completed = historyOrders.filter(
      (order) =>
        order?.status === "completed" ||
        order?.status === "delivered",
    ).length;

    const rejected = historyOrders.filter(
      (order) =>
        order?.status === "rejected" ||
        order?.status === "cancelled",
    ).length;

    return {
      total: orders.length,
      active: activeOrders.length,
      completed,
      rejected,
    };
  }, [
    orders.length,
    activeOrders.length,
    historyOrders,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  async function toggleHistoryDetails(
    orderId: string,
  ) {
    if (!orderId) return;

    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);

    if (detailsById[orderId]) {
      return;
    }

    try {
      setDetailsLoadingId(orderId);

      const freshOrder = await getOrder(orderId);

      setDetailsById((current) => ({
        ...current,
        [orderId]:
          freshOrder?.order ||
          freshOrder?.data ||
          freshOrder,
      }));
    } catch {
      // نحتفظ ببيانات القائمة إذا تعذر تحميل التفاصيل.
    } finally {
      setDetailsLoadingId(null);
    }
  }

  function renderOrderDetails(order: any) {
    const id = getOrderId(order);
    const details = detailsById[id] || order;

    if (detailsLoadingId === id) {
      return (
        <View style={styles.loadingDetails}>
          <ActivityIndicator
            size="small"
            color={SHOP_PRIMARY}
          />

          <Text style={styles.loadingDetailsText}>
            جاري تحميل التفاصيل...
          </Text>
        </View>
      );
    }

    const field = (
      icon: keyof typeof Ionicons.glyphMap,
      label: string,
      value: any,
    ) => (
      <View style={styles.detailField}>
        <View style={styles.detailIcon}>
          <Ionicons
            name={icon}
            size={17}
            color={SHOP_PRIMARY_DARK}
          />
        </View>

        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>
            {label}
          </Text>

          <Text
            numberOfLines={3}
            style={styles.detailValue}
          >
            {value || "—"}
          </Text>
        </View>
      </View>
    );

    return (
      <View style={styles.detailsPanel}>
        <View style={styles.detailTitleRow}>
          <View style={styles.detailTitleIcon}>
            <Ionicons
              name="receipt-outline"
              size={17}
              color={SHOP_PRIMARY_DARK}
            />
          </View>

          <Text style={styles.detailTitle}>
            تفاصيل الطلب
          </Text>
        </View>

        {field(
          "person-outline",
          "الزبون",
          getCustomerName(details),
        )}

        {field(
          "call-outline",
          "هاتف الزبون",
          getCustomerPhone(details),
        )}

        {field(
          "location-outline",
          "عنوان التوصيل",
          getCustomerAddress(details),
        )}

        <View style={styles.totalBox}>
          <View style={styles.totalIcon}>
            <Ionicons
              name="cash-outline"
              size={18}
              color={SHOP_PRIMARY_DARK}
            />
          </View>

          <View style={styles.totalContent}>
            <Text style={styles.totalLabel}>
              الإجمالي
            </Text>

            <Text style={styles.totalValue}>
              {Number(
                details?.total ??
                  details?.subtotal ??
                  0,
              ).toLocaleString("en-US")}{" "}
              د.ع
            </Text>
          </View>
        </View>

        {details?.customerNote ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>
              ملاحظات الزبون
            </Text>

            <Text style={styles.noteText}>
              {details.customerNote}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }


  function openCancel(order: any) {
    const id = getOrderId(order);
    if (!id) return;

    setCancelOrderId(id);
    setCancelReason("");
    setCancelVisible(true);
  }

  async function confirmCancel() {
    const id = String(cancelOrderId || "").trim();
    const reason = cancelReason.trim();

    if (!id) return;

    if (reason.length < 3) {
      Alert.alert(
        "سبب الإلغاء مطلوب",
        "اكتب سببًا واضحًا للإلغاء.",
      );
      return;
    }

    setCancelBusy(true);

    try {
      // إرسال الإلغاء نفسه
      await cancelOrder(id, reason);

      // إغلاق النافذة فور نجاح الإلغاء
      setCancelVisible(false);
      setCancelOrderId(null);
      setCancelReason("");

      // تحديث القائمة بدون اعتبار فشل التحديث فشلًا في الإلغاء
      try {
        await load(true);
      } catch (refreshError) {
        console.warn(
          "تم الإلغاء بنجاح لكن تعذر تحديث قائمة الطلبات:",
          refreshError,
        );
      }

      Alert.alert(
        "تم إلغاء الطلب",
        "تم إلغاء الطلب وتسجيل سبب الإلغاء.",
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر إلغاء الطلب",
        error?.response?.data?.message ||
          error?.message ||
          "تعذر إلغاء الطلب حاليًا.",
      );
    } finally {
      setCancelBusy(false);
    }
  }

  function renderActiveOrder(order: any) {
    const id = getOrderId(order);
    const expanded = expandedOrderId === id;

    return (
      <View key={id} style={styles.orderCard}>
        <View style={styles.orderTop}>
          <View style={styles.orderMain}>
            <View style={styles.orderIcon}>
              <Ionicons
                name="receipt-outline"
                size={20}
                color={SHOP_PRIMARY_DARK}
              />
            </View>

            <View style={styles.orderTexts}>
              <Text style={styles.orderNumber}>
                #{displayOrderNumber(order)}
              </Text>

              <Text style={styles.dateText}>
                {formatDateTime(
                  getOrderDate(order),
                )}
              </Text>
            </View>
          </View>

          <OrderStatusBadge
            status={order?.status}
          />
        </View>

        <View style={styles.orderSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              الزبون
            </Text>

            <Text
              numberOfLines={1}
              style={styles.summaryValue}
            >
              {getCustomerName(order)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              الإجمالي
            </Text>

            <Text style={styles.summaryMoney}>
              {Number(
                order?.total ??
                  order?.subtotal ??
                  0,
              ).toLocaleString("en-US")}{" "}
              د.ع
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() =>
              navigation.navigate(
                "OrderTracking",
                {
                  orderId: id,
                },
              )
            }
            style={[
              styles.primaryButton,
              styles.stackActionButton,
            ]}
          >
            <Ionicons
              name="navigate-outline"
              size={17}
              color="#FFFFFF"
            />

            <Text style={styles.primaryButtonText}>
              متابعة الطلب
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => openCancel(order)}
            style={[
              styles.cancelButton,
              styles.stackActionButton,
            ]}
          >
            <Ionicons
              name="close-circle-outline"
              size={17}
              color="#E11D48"
            />

            <Text style={styles.cancelButtonText}>
              إلغاء الطلب
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() =>
              toggleHistoryDetails(id)
            }
            style={[
              styles.secondaryButton,
              styles.stackActionButton,
            ]}
          >
            <Ionicons
              name={
                expanded
                  ? "chevron-up-outline"
                  : "document-text-outline"
              }
              size={17}
              color={SHOP_PRIMARY_DARK}
            />

            <Text style={styles.secondaryButtonText}>
              {expanded
                ? "إخفاء التفاصيل"
                : "عرض التفاصيل"}
            </Text>
          </TouchableOpacity>
        </View>
        {expanded &&
          renderOrderDetails(order)}
      </View>
    );
  }

  
function InlineCaptainRating({
  orderId,
  captainId,
  initialRating,
}: {
  orderId: string;
  captainId: string;
  initialRating?: any;
}) {
  const [rated, setRated] = useState(
    Boolean(initialRating),
  );

  const [stars, setStars] = useState(
    Number(initialRating?.stars || 0),
  );

  const [comment, setComment] = useState(
    String(
      initialRating?.review ??
        initialRating?.comment ??
        "",
    ),
  );

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(
    !initialRating,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadExistingRating() {
      if (!orderId) {
        if (alive) {
          setChecking(false);
        }
        return;
      }

      if (initialRating) {
        setRated(true);
        setStars(Number(initialRating?.stars || 0));
        setComment(
          String(
            initialRating?.review ??
              initialRating?.comment ??
              "",
          ),
        );
        setChecking(false);
        return;
      }

      try {
        const response = await apiGet(
          `/captain-ratings/order/${orderId}`,
        );

        const existing =
          response?.rating ??
          response?.data?.rating ??
          null;

        if (!alive) {
          return;
        }

        if (
          response?.rated ||
          existing
        ) {
          setRated(true);
          setStars(
            Number(existing?.stars || 0),
          );
          setComment(
            String(
              existing?.review ??
                existing?.comment ??
                "",
            ),
          );
        }
      } catch {
        // عدم وجود تقييم لا يعتبر خطأً للمستخدم.
      } finally {
        if (alive) {
          setChecking(false);
        }
      }
    }

    void loadExistingRating();

    return () => {
      alive = false;
    };
  }, [orderId, initialRating]);

  async function saveRating() {
    if (!stars) {
      setError("اختر عدد النجوم أولًا.");
      return;
    }

    if (!captainId) {
      setError(
        "تعذر تحديد الكابتن لهذا الطلب.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await submitCaptainRating({
          orderId,
          captainId,
          stars,
          text: comment.trim() || undefined,
        });

      const saved =
        response?.rating ??
        response?.data?.rating ??
        null;

      setRated(true);

      if (saved) {
        setStars(
          Number(saved?.stars || stars),
        );
        setComment(
          String(
            saved?.review ??
              saved?.comment ??
              comment.trim(),
          ),
        );
      }
    } catch (err: any) {
      const message =
        err?.message ||
        "تعذر حفظ التقييم، حاول مرة أخرى.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <View
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 14,
          backgroundColor: "#FAF7F3",
          borderWidth: 1,
          borderColor: "#EBDDCF",
        }}
      >
        <Text
          style={{
            color: "#8A7665",
            fontSize: 12,
            fontWeight: "700",
            textAlign: "right",
          }}
        >
          جاري تحميل التقييم...
        </Text>
      </View>
    );
  }



  return (
    <View
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: rated
          ? "#F1FBF4"
          : "#FFF9F2",
        borderWidth: 1,
        borderColor: rated
          ? "#BCE8C7"
          : "#F2D0AD",
      }}
    >
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Ionicons
            name={
              rated
                ? "star"
                : "star-outline"
            }
            size={18}
            color={
              rated
                ? "#F59E0B"
                : SHOP_PRIMARY_DARK
            }
          />

          <Text
            style={{
              color: rated
                ? "#166534"
                : SHOP_PRIMARY_DARK,
              fontSize: 14,
              fontWeight: "900",
            }}
          >
            {rated
              ? "تقييمك للكابتن"
              : "تقييم الكابتن"}
          </Text>
        </View>

        {rated ? (
          <Text
            style={{
              color: "#16A34A",
              fontSize: 11,
              fontWeight: "800",
            }}
          >
            تم التقييم
          </Text>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <TouchableOpacity
              key={star}
              activeOpacity={rated ? 1 : 0.7}
              disabled={rated || loading}
              onPress={() => {
                setStars(star);
                setError("");
              }}
              style={{
                padding: 2,
              }}
            >
              <Ionicons
                name={
                  star <= stars
                    ? "star"
                    : "star-outline"
                }
                size={29}
                color={
                  star <= stars
                    ? "#F59E0B"
                    : "#CFC3B7"
                }
              />
            </TouchableOpacity>
          ),
        )}
      </View>

      {rated ? (
        <>
          {comment.trim() ? (
            <View
              style={{
                marginTop: 2,
                padding: 11,
                borderRadius: 12,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#D9EEDC",
              }}
            >
              <Text
                style={{
                  color: "#4B5B50",
                  fontSize: 12,
                  lineHeight: 19,
                  textAlign: "right",
                  fontWeight: "600",
                }}
              >
                {comment}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              marginTop: 10,
              alignItems: "center",
              flexDirection: "row-reverse",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={17}
              color="#16A34A"
            />

            <Text
              style={{
                color: "#15803D",
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              شكراً لتقييمك
            </Text>
          </View>
        </>
      ) : (
        <>
          <TextInput
            value={comment}
            onChangeText={(value) => {
              setComment(value);
              setError("");
            }}
            multiline
            textAlign="right"
            placeholder="اكتب تعليقًا اختياريًا عن الكابتن..."
            placeholderTextColor="#AA9A8C"
            style={{
              minHeight: 74,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E3CCB5",
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#30261F",
              fontSize: 12,
              textAlignVertical: "top",
              marginBottom: 9,
            }}
          />

          {error ? (
            <Text
              style={{
                color: "#DC2626",
                fontSize: 11,
                fontWeight: "700",
                textAlign: "right",
                marginBottom: 8,
              }}
            >
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.84}
            disabled={loading}
            onPress={() => {
              void saveRating();
            }}
            style={{
              minHeight: 44,
              borderRadius: 12,
              backgroundColor: loading
                ? "#B7A99D"
                : SHOP_PRIMARY_DARK,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row-reverse",
              gap: 7,
            }}
          >
            <Ionicons
              name={
                loading
                  ? "time-outline"
                  : "checkmark-circle-outline"
              }
              size={18}
              color="#FFFFFF"
            />

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              {loading
                ? "جاري الحفظ..."
                : "حفظ التقييم"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}


function renderHistoryOrder(order: any) {
    const id = getOrderId(order);
    const expanded = expandedOrderId === id;
    const status = String(
      order?.status || "",
    ).toLowerCase();

    const historyStatus =
      getHistoryLabel(status);

    const captainId = getCaptainId(order);
    const isCompleted =
      status === "delivered" ||
      status === "completed";
return (
      <View
        key={id}
        style={styles.historyCard}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            toggleHistoryDetails(id)
          }
          style={styles.historyRow}
        >
          <View style={styles.historyMain}>
            <View
              style={[
                styles.historyStatusIcon,
                {
                  backgroundColor:
                    historyStatus.background,
                },
              ]}
            >
              <Ionicons
                name={historyStatus.icon}
                size={21}
                color={historyStatus.color}
              />
            </View>

            <View style={styles.historyTexts}>
              <Text style={styles.historyNumber}>
                #{displayOrderNumber(order)}
              </Text>

              <Text
                style={[
                  styles.historyStatusText,
                  {
                    color:
                      historyStatus.color,
                  },
                ]}
              >
                {historyStatus.label}
              </Text>

              <Text style={styles.historyDate}>
                {formatDateTime(
                  getOrderDate(order),
                )}
              </Text>
            </View>
          </View>

          <View style={styles.historyArrow}>
            <Ionicons
              name={
                expanded
                  ? "chevron-up-outline"
                  : "chevron-down-outline"
              }
              size={18}
              color="#8E7A6B"
            />
          </View>
        </TouchableOpacity>

        <View style={styles.historyBottom}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              الزبون
            </Text>

            <Text
              numberOfLines={1}
              style={styles.summaryValue}
            >
              {getCustomerName(order)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              الإجمالي
            </Text>

            <Text style={styles.summaryMoney}>
              {Number(
                order?.total ??
                  order?.subtotal ??
                  0,
              ).toLocaleString("en-US")}{" "}
              د.ع
            </Text>
          </View>
        </View>

        {isCompleted && captainId ? (
          <InlineCaptainRating
            orderId={id}
            captainId={captainId}
            initialRating={ratingByOrderId[id]}
          />
        ) : null}

        {expanded && renderOrderDetails(order)}
      </View>
    );
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState message="جاري تحميل الطلبات..." />
  




    </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SHOP_PRIMARY}
            colors={[SHOP_PRIMARY]}
          />
        }
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="receipt-outline"
              size={24}
              color={SHOP_PRIMARY}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              زاجل ديلفري
            </Text>

            <Text style={styles.title}>
              الطلبات
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
                    <TouchableOpacity
            activeOpacity={0.85}
            style={{ flex: 1 }}
            onPress={() => {
              setOrderFilter("all");
              setActivePage(1);
              setHistoryPage(1);
              setOpenedOrderSection(null);
            }}
          >
            <Stat
                        icon="layers-outline"
                        label="كل الطلبات"
                        value={stats.total}
                      />
          </TouchableOpacity>

                    <TouchableOpacity
            activeOpacity={0.85}
            style={{ flex: 1 }}
            onPress={() => {
              setOrderFilter("active");
              setActivePage(1);
              setHistoryPage(1);
              setOpenedOrderSection(null);
            }}
          >
            <Stat
                        icon="bicycle-outline"
                        label="النشطة"
                        value={stats.active}
                      />
          </TouchableOpacity>

                    <TouchableOpacity
            activeOpacity={0.85}
            style={{ flex: 1 }}
            onPress={() => {
              setOrderFilter("completed");
              setActivePage(1);
              setHistoryPage(1);
              setOpenedOrderSection(null);
            }}
          >
            <Stat
                        icon="checkmark-circle-outline"
                        label="المكتملة"
                        value={stats.completed}
                      />
          </TouchableOpacity>

                    <TouchableOpacity
            activeOpacity={0.85}
            style={{ flex: 1 }}
            onPress={() => {
              setOrderFilter("rejected");
              setActivePage(1);
              setHistoryPage(1);
              setOpenedOrderSection(null);
            }}
          >
            <Stat
                        icon="close-circle-outline"
                        label="المرفوضة"
                        value={stats.rejected}
                      />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionHeader, (orderFilter === "completed" || orderFilter === "rejected") && { display: "none" }]}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>
              الطلبات الحالية
            </Text>

            <Text style={styles.sectionSubtitle}>
              الطلبات التي ما زالت قيد التنفيذ
            </Text>
          </View>

          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>
              {activeOrders.length}
            </Text>
          </View>
        </View>

        {activeOrders.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={40}
                color={SHOP_PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>
              لا توجد طلبات نشطة
            </Text>

            <Text style={styles.emptyText}>
              ستظهر هنا الطلبات بمجرد إنشائها ومتابعة تنفيذها.
            </Text>
          </View>
        ) : (
          <View style={[styles.sectionList, (orderFilter === "completed" || orderFilter === "rejected") && { display: "none" }]}>
            {paginatedActiveOrders.map(
              renderActiveOrder,
            )}

            {activeTotalPages > 1 && (
              <View style={styles.paginationBox}>
                <TouchableOpacity
                  disabled={safeActivePage === 1}
                  onPress={() =>
                    setActivePage((page) =>
                      Math.max(1, page - 1),
                    )
                  }
                  style={styles.pageArrow}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={
                      safeActivePage === 1
                        ? "#B8B0A8"
                        : SHOP_PRIMARY
                    }
                  />
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pagination}
                >
                  {Array.from(
                    { length: activeTotalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <TouchableOpacity
                      key={"active-page-" + page}
                      onPress={() =>
                        setActivePage(page)
                      }
                      style={{
                        minWidth: 36,
                        height: 36,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        marginHorizontal: 3,
                        backgroundColor:
                          page === safeActivePage
                            ? "#0F172A"
                            : "#F1F5F9",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "900",
                          color:
                            page === safeActivePage
                              ? "#FFFFFF"
                              : "#475569",
                        }}
                      >
                        {page}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  disabled={
                    safeActivePage === activeTotalPages
                  }
                  onPress={() =>
                    setActivePage((page) =>
                      Math.min(
                        activeTotalPages,
                        page + 1,
                      ),
                    )
                  }
                  style={styles.pageArrow}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      safeActivePage === activeTotalPages
                        ? "#B8B0A8"
                        : SHOP_PRIMARY
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.sectionHeader,
            orderFilter === "active" && { display: "none" },
            {
              marginTop:
                activeOrders.length > 0
                  ? 24
                  : 18,
            },
          ]}
        >
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>
              تاريخ الطلبات
            </Text>

            <Text style={styles.sectionSubtitle}>
              الطلبات المكتملة والمرفوضة
            </Text>
          </View>

          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>
              {historyOrders.length}
            </Text>
          </View>
        </View>

        {historyOrders.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="time-outline"
                size={40}
                color={SHOP_PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>
              لا يوجد تاريخ طلبات حتى الآن
            </Text>

            <Text style={styles.emptyText}>
              ستظهر هنا الطلبات المكتملة والمرفوضة تلقائيًا.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.sectionList, orderFilter === "active" && { display: "none" }]}>
              {paginatedHistory.map(
                renderHistoryOrder,
              )}
            </View>

            {orderFilter !== "active" && historyTotalPages > 1 && (
              <View style={styles.paginationBox}>
                <TouchableOpacity
                  disabled={safeHistoryPage === 1}
                  onPress={() =>
                    setHistoryPage((page) =>
                      Math.max(1, page - 1),
                    )
                  }
                  style={[
                    styles.pageArrow,
                    safeHistoryPage === 1 &&
                      styles.pageDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={
                      safeHistoryPage === 1
                        ? "#B8B0A8"
                        : SHOP_PRIMARY
                    }
                  />
                </TouchableOpacity>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={
                    styles.pagination
                  }
                >
                  {getPageNumbers(
                    safeHistoryPage,
                    historyTotalPages,
                  ).map((page, index) =>
                    page === "..." ? (
                      <View
                        key={`dots-${index}`}
                        style={styles.dots}
                      >
                        <Text style={styles.dotsText}>
                          …
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        key={page}
                        activeOpacity={0.84}
                        onPress={() =>
                          setHistoryPage(page)
                        }
                        style={[
                          styles.pageButton,
                          page ===
                            safeHistoryPage &&
                            styles.pageButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pageButtonText,
                            page ===
                              safeHistoryPage &&
                              styles.pageButtonTextActive,
                          ]}
                        >
                          {page}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </ScrollView>

                <TouchableOpacity
                  disabled={
                    safeHistoryPage ===
                    historyTotalPages
                  }
                  onPress={() =>
                    setHistoryPage((page) =>
                      Math.min(
                        historyTotalPages,
                        page + 1,
                      ),
                    )
                  }
                  style={[
                    styles.pageArrow,
                    safeHistoryPage ===
                      historyTotalPages &&
                      styles.pageDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      safeHistoryPage ===
                      historyTotalPages
                        ? "#B8B0A8"
                        : SHOP_PRIMARY
                    }
                  />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.paginationHint}>
              الصفحة {safeHistoryPage} من{" "}
              {historyTotalPages}
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        visible={cancelVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancelBusy) setCancelVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: "#FFFFFF",
              borderRadius: 22,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: "#2D241E",
                fontSize: 18,
                fontWeight: "900",
                textAlign: "right",
              }}
            >
              إلغاء الطلب
            </Text>

            <Text
              style={{
                marginTop: 8,
                color: "#8A7665",
                fontSize: 12,
                fontWeight: "700",
                textAlign: "right",
              }}
            >
              اكتب سبب إلغاء الطلب.
            </Text>

            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="سبب الإلغاء..."
              multiline
              textAlign="right"
              editable={!cancelBusy}
              style={{
                marginTop: 12,
                minHeight: 100,
                borderWidth: 1,
                borderColor: "#E9DED3",
                borderRadius: 15,
                padding: 12,
                color: "#2D241E",
                textAlignVertical: "top",
              }}
            />

            <View
              style={{
                marginTop: 12,
                flexDirection: "row-reverse",
                gap: 8,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={cancelBusy}
                onPress={() => setCancelVisible(false)}
                style={{
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 14,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#4B5563",
                    fontWeight: "900",
                  }}
                >
                  إلغاء
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.84}
                disabled={cancelBusy}
                onPress={() => void confirmCancel()}
                style={{
                  flex: 1,
                  minHeight: 46,
                  borderRadius: 14,
                  backgroundColor: "#DC2626",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cancelBusy ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "900",
                    }}
                  >
                    تأكيد الإلغاء
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  const tone =
    label === "كل الطلبات"
      ? {
          bg: "#F6EFE8",
          border: "#D8B89A",
          iconBg: "#E8D2BE",
          color: "#7A4F2E",
        }
      : label === "النشطة"
        ? {
            bg: "#FFF8DB",
            border: "#E6D27A",
            iconBg: "#F3E7A8",
            color: "#8A6800",
          }
        : label === "المكتملة"
          ? {
              bg: "#FFF0E0",
              border: "#F0BD86",
              iconBg: "#FFD8AE",
              color: "#C45D00",
            }
          : {
              bg: "#F9E8D8",
              border: "#D9AD84",
              iconBg: "#EFD0B1",
              color: "#8B4F25",
            };

  return (
    <View
      style={[
        statStyles.stat,
        {
          minHeight: 92,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          paddingVertical: 10,
          paddingHorizontal: 11,
          justifyContent: "space-between",
          shadowColor: tone.color,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.08,
          shadowRadius: 5,
          elevation: 2,
        },
      ]}
    >
      <View
        style={[
          statStyles.icon,
          {
            backgroundColor: tone.iconBg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={tone.color}
        />
      </View>

      <Text
        style={[
          statStyles.value,
          {
            color: tone.color,
            fontSize: 21,
            fontWeight: "900",
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          statStyles.label,
          {
            color: tone.color,
            fontWeight: "800",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  stat: {
    flex: 1,
    minWidth: "22%",
    minHeight: 98,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SHOP_BORDER,
    backgroundColor: "#FFFFFF",
    alignItems: "flex-end",
  },

  icon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SHOP_SOFT,
  },

  value: {
    marginTop: 6,
    color: "#2E231C",
    fontSize: 21,
    fontWeight: "900",
  },

  label: {
    marginTop: 1,
    color: "#8F7A6A",
    fontSize: 10,
    fontWeight: "700",
  },
});

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 30,
    },

    header: {
      marginBottom: 16,
      paddingHorizontal: 2,
      flexDirection: "row-reverse",
      alignItems: "center",
    },

    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: SHOP_SOFT,
      marginLeft: 12,
    },

    headerText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: SHOP_PRIMARY_DARK,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
      marginBottom: 2,
    },

    title: {
      color: appTheme.textColor,
      fontSize: 28,
      fontWeight: "900",
      textAlign: "right",
    },

    stats: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 22,
    },

    sectionHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },

    sectionHeaderText: {
      flex: 1,
      alignItems: "flex-end",
    },

    sectionTitle: {
      color: appTheme.textColor,
      fontSize: 19,
      fontWeight: "900",
      textAlign: "right",
    },

    sectionSubtitle: {
      marginTop: 3,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "600",
      textAlign: "right",
    },

    sectionBadge: {
      minWidth: 38,
      height: 38,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: SHOP_SOFT,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    sectionBadgeText: {
      color: SHOP_PRIMARY_DARK,
      fontSize: 14,
      fontWeight: "900",
    },

    historyBadge: {
      minWidth: 38,
      height: 38,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: "#F8EFE8",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    historyBadgeText: {
      color: "#7A6048",
      fontSize: 14,
      fontWeight: "900",
    },

    sectionList: {
      gap: 10,
    },

    orderCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 19,
      padding: 12,
      marginBottom: 11,
      borderWidth: 1,
      borderColor: SHOP_BORDER,
      shadowColor: "#7A4B27",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 2,
    },

    orderTop: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    orderMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 9,
    },

    orderIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: SHOP_SOFT,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 2,
    },

    orderTexts: {
      flex: 1,
      minWidth: 0,
      alignItems: "flex-end",
    },

    orderNumber: {
      fontSize: 16,
      fontWeight: "900",
      color: "#2F241C",
      textAlign: "right",
    },

    dateText: {
      marginTop: 3,
      color: "#8F7A6A",
      fontSize: 10,
      fontWeight: "600",
      textAlign: "right",
    },

    orderSummary: {
      marginTop: 13,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#F3E8DE",
      flexDirection: "row-reverse",
      gap: 12,
    },

    summaryItem: {
      flex: 1,
      alignItems: "flex-end",
      minWidth: 0,
    },

    summaryLabel: {
      color: "#8F7A6A",
      fontSize: 10,
      fontWeight: "700",
      textAlign: "right",
    },

    summaryValue: {
      marginTop: 4,
      color: appTheme.textColor,
      fontSize: 12,
      fontWeight: "800",
      maxWidth: "100%",
      textAlign: "right",
    },

    summaryMoney: {
      marginTop: 4,
      color: SHOP_PRIMARY_DARK,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "right",
    },

    actionRow: {
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "flex-start",
      gap: 6,
      width: "100%",
      marginTop: 12,
    },

    primaryButton: {
      flex: 1,
      minHeight: 45,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: SHOP_PRIMARY,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },

    secondaryButton: {
      flex: 1,
      minHeight: 45,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: SHOP_SOFT,
      borderWidth: 1,
      borderColor: "#F2D5BE",
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    secondaryButtonText: {
      color: SHOP_PRIMARY_DARK,
      fontSize: 12,
      fontWeight: "900",
    },

    historyCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 19,
      padding: 12,
      marginBottom: 11,
      borderWidth: 1,
      borderColor: SHOP_BORDER,
    },

    historyRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    historyMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 9,
    },

    historyStatusIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    historyTexts: {
      flex: 1,
      minWidth: 0,
      alignItems: "flex-end",
    },

    historyNumber: {
      fontSize: 15,
      fontWeight: "900",
      color: "#30261F",
      textAlign: "right",
    },

    historyStatusText: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "900",
      textAlign: "right",
    },

    historyDate: {
      marginTop: 2,
      color: "#8F7A6A",
      fontSize: 10,
      fontWeight: "600",
      textAlign: "right",
    },

    stackActionButton: {
      width: "100%",
      flex: 0,
      minHeight: 46,
    },

    cancelButton: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: "#FFF1F2",
      borderWidth: 1,
      borderColor: "#FB7185",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row-reverse",
      gap: 6,
    },

    cancelButtonText: {
      color: "#E11D48",
      fontSize: 12,
      fontWeight: "900",
    },

    historyArrow: {
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor: "#F7F1EC",
      alignItems: "center",
      justifyContent: "center",
    },

    historyBottom: {
      marginTop: 12,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor: "#F3E9DE",
      flexDirection: "row-reverse",
      gap: 12,
    },

    detailsPanel: {
      marginTop: 11,
      padding: 10,
      borderRadius: 17,
      backgroundColor: SHOP_BG,
      borderWidth: 1,
      borderColor: "#F0DCCB",
    },

    detailTitleRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 7,
      marginTop: 3,
      marginBottom: 10,
      paddingHorizontal: 3,
    },

    detailTitleIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: SHOP_SOFT,
      alignItems: "center",
      justifyContent: "center",
    },

    detailTitle: {
      color: "#342A22",
      fontSize: 13,
      fontWeight: "900",
    },

    detailField: {
      minHeight: 55,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#EEE1D7",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 9,
    },

    detailIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: SHOP_SOFT,
      alignItems: "center",
      justifyContent: "center",
    },

    detailContent: {
      flex: 1,
      minWidth: 0,
      alignItems: "flex-end",
    },

    detailLabel: {
      color: "#9A897B",
      fontSize: 9,
      fontWeight: "800",
      marginBottom: 3,
      textAlign: "right",
    },

    detailValue: {
      color: "#30261F",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      width: "100%",
    },

    totalBox: {
      minHeight: 55,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: "#FFF0E0",
      borderWidth: 1,
      borderColor: "#F1CCAA",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 9,
    },

    totalIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: "#FFE1C2",
      alignItems: "center",
      justifyContent: "center",
    },

    totalContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    totalLabel: {
      color: "#9A897B",
      fontSize: 9,
      fontWeight: "800",
      marginBottom: 3,
      textAlign: "right",
    },

    totalValue: {
      color: SHOP_PRIMARY_DARK,
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
    },

    noteBox: {
      marginTop: 8,
      padding: 10,
      borderRadius: 14,
      backgroundColor: "#FFF9EE",
      borderWidth: 1,
      borderColor: "#F0DFC6",
    },

    noteTitle: {
      color: "#9B6A37",
      fontSize: 9,
      fontWeight: "900",
      textAlign: "right",
    },

    noteText: {
      marginTop: 4,
      color: "#4A3829",
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 18,
      textAlign: "right",
    },

    loadingDetails: {
      marginTop: 10,
      padding: 16,
      borderRadius: 16,
      backgroundColor: SHOP_BG,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row-reverse",
      gap: 8,
    },

    loadingDetailsText: {
      color: "#8A7665",
      fontSize: 11,
      fontWeight: "700",
    },

    paginationBox: {
      marginTop: 18,
      padding: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: SHOP_BORDER,
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
    },

    pagination: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 6,
    },

    pageButton: {
      width: 37,
      height: 37,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F7F2ED",
    },

    pageButtonActive: {
      backgroundColor: SHOP_PRIMARY,
    },

    pageButtonText: {
      color: appTheme.textColor,
      fontSize: 12,
      fontWeight: "900",
    },

    pageButtonTextActive: {
      color: "#FFFFFF",
    },

    pageArrow: {
      width: 37,
      height: 37,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F7F2ED",
    },

    pageDisabled: {
      opacity: 0.7,
    },

    dots: {
      width: 25,
      height: 37,
      alignItems: "center",
      justifyContent: "center",
    },

    dotsText: {
      color: appTheme.secondaryTextColor,
      fontSize: 18,
      fontWeight: "900",
    },

    paginationHint: {
      marginTop: 8,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
    },

    empty: {
      marginTop: 4,
      minHeight: 210,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
      paddingVertical: 30,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: SHOP_BORDER,
      backgroundColor: "#FFFFFF",
    },

    emptyIcon: {
      width: 78,
      height: 78,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: SHOP_SOFT,
    },

    emptyTitle: {
      marginTop: 14,
      color: appTheme.textColor,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 7,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "600",
      textAlign: "center",
    },
  });
