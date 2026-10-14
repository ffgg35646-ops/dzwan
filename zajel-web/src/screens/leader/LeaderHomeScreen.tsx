import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { apiGet } from "../../api/request";

type AnyObject = Record<string, any>;

type ScopeData = {
  role?: string;
  governorate?: AnyObject | null;
  governorateName?: string;
  areas?: AnyObject[];
  areaNames?: string[];
};

type LeaderStats = {
  totalOrders: number;
  activeOrders: number;
  availableOrders: number;
  stuckOrders: number;
  captains: number;
  establishments: number;
  completedToday: number;
};

type FilterKey =
  | "all"
  | "active"
  | "available"
  | "stuck"
  | "captains"
  | "establishments"
  | "completed";

function unwrap(value: any): any {
  return (
    value?.data?.data ??
    value?.data ??
    value
  );
}

function toArray(value: any): AnyObject[] {
  const v = unwrap(value);

  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.orders)) return v.orders;
  if (Array.isArray(v?.captains)) return v.captains;
  if (Array.isArray(v?.establishments)) return v.establishments;
  if (Array.isArray(v?.data)) return v.data;

  return [];
}

function numberValue(...values: any[]) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return 0;
}

function textValue(...values: any[]) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function normalizeArabic(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getOrderNumber(item: AnyObject) {
  const raw = textValue(
    item?.orderNumber,
    item?.orderNo,
    item?.number,
    item?._id,
  );

  if (!raw) return "—";

  if (raw.startsWith("DZ-")) {
    const match = raw.match(/^DZ-\d+-([0-9]+)/);

    if (match?.[1]) {
      return match[1];
    }

    return raw.replace(/^DZ-\d+-/, "").slice(0, 10);
  }

  return raw.replace(/^#/, "");
}

function getCaptainName(item: AnyObject) {
  return textValue(
    item?.fullName,
    item?.name,
    item?.captain?.fullName,
    item?.captain?.name,
  );
}

function getEstablishmentName(item: AnyObject) {
  return textValue(
    item?.establishmentName,
    item?.establishment?.name,
    item?.shopName,
    item?.restaurantName,
    item?.name,
  );
}

function getAreaName(item: AnyObject) {
  return textValue(
    item?.areaName,
    item?.area?.name,
  );
}

function getGovernorateName(item: AnyObject) {
  return textValue(
    item?.governorateName,
    item?.governorate?.name,
  );
}

function getOrderStatus(item: AnyObject) {
  return normalizeArabic(
    textValue(
      item?.status,
      item?.stage,
      item?.state,
    ),
  );
}

function isCompletedOrder(item: AnyObject) {
  const status = getOrderStatus(item);

  return [
    "completed",
    "complete",
    "delivered",
    "delivery_completed",
    "closed",
  ].some((value) =>
    status.includes(value),
  );
}

function isStuckOrder(item: AnyObject) {
  const status = getOrderStatus(item);

  return Boolean(
    item?.isStuck ||
      item?.stuck ||
      item?.stuckAt ||
      item?.stuckOrder ||
      status.includes("stuck") ||
      status.includes("عالق"),
  );
}

function isAvailableOrder(item: AnyObject) {
  if (
    item?.isAvailable === true ||
    item?.available === true
  ) {
    return true;
  }

  const status = getOrderStatus(item);

  return [
    "available",
    "pending",
    "unassigned",
    "waiting",
    "queued",
    "queue",
    "dispatch_pending",
    "awaiting_captain",
  ].some((value) =>
    status.includes(value),
  );
}

function isActiveOrder(item: AnyObject) {
  const status = getOrderStatus(item);

  if (
    isCompletedOrder(item) ||
    isAvailableOrder(item) ||
    isStuckOrder(item)
  ) {
    return false;
  }

  return [
    "active",
    "assigned",
    "accepted",
    "pickup",
    "picked",
    "picked_up",
    "on_way",
    "on_the_way",
    "delivering",
    "in_progress",
    "out_for_delivery",
    "captain_to_shop",
    "captain_to_customer",
  ].some((value) =>
    status.includes(value),
  );
}

function statusLabel(status: string) {
  const value = normalizeArabic(status);

  if (
    value.includes("completed") ||
    value.includes("delivered")
  ) {
    return "مكتمل";
  }

  if (
    value.includes("cancel") ||
    value.includes("reject")
  ) {
    return "ملغي";
  }

  if (
    value.includes("stuck") ||
    value.includes("عالق")
  ) {
    return "عالق";
  }

  if (
    value.includes("available") ||
    value.includes("pending") ||
    value.includes("unassigned") ||
    value.includes("waiting")
  ) {
    return "متاح";
  }

  if (
    value.includes("assigned") ||
    value.includes("active") ||
    value.includes("on_the_way") ||
    value.includes("delivering")
  ) {
    return "نشط";
  }

  return textValue(status) || "غير محدد";
}

function statusColors(status: string) {
  const label = statusLabel(status);

  if (label === "مكتمل") {
    return {
      backgroundColor: "#F3F3F3",
      color: "#111111",
    };
  }

  if (label === "عالق") {
    return {
      backgroundColor: "#EAEAEA",
      color: "#111111",
    };
  }

  if (label === "متاح") {
    return {
      backgroundColor: "#F0F0F0",
      color: "#111111",
    };
  }

  if (label === "نشط") {
    return {
      backgroundColor: "#E8E8E8",
      color: "#111111",
    };
  }

  return {
    backgroundColor: "#F5F5F5",
    color: "#666666",
  };
}

function extractDashboardStats(raw: any): LeaderStats {
  const root = unwrap(raw);

  const stats =
    root?.stats ??
    root?.statistics ??
    root?.summary ??
    root;

  return {
    totalOrders: numberValue(
      stats?.totalOrders,
      stats?.orders,
      stats?.total,
    ),
    activeOrders: numberValue(
      stats?.activeOrders,
      stats?.active,
    ),
    availableOrders: numberValue(
      stats?.availableOrders,
      stats?.available,
    ),
    stuckOrders: numberValue(
      stats?.stuckOrders,
      stats?.stuck,
      stats?.stuckOrdersCount,
    ),
    captains: numberValue(
      stats?.captains,
      stats?.captainCount,
      stats?.captainsCount,
    ),
    establishments: numberValue(
      stats?.establishments,
      stats?.establishmentCount,
      stats?.shops,
      stats?.restaurants,
    ),
    completedToday: numberValue(
      stats?.completedToday,
      stats?.completedOrdersToday,
      stats?.todayCompleted,
    ),
  };
}

function mergeStats(
  dashboard: LeaderStats,
  orders: AnyObject[],
  captains: AnyObject[],
  establishments: AnyObject[],
) {
  const completed =
    orders.filter(isCompletedOrder).length;

  const active =
    orders.filter(isActiveOrder).length;

  const available =
    orders.filter(isAvailableOrder).length;

  const stuck =
    orders.filter(isStuckOrder).length;

  return {
    totalOrders:
      dashboard.totalOrders || orders.length,

    activeOrders:
      dashboard.activeOrders || active,

    availableOrders:
      dashboard.availableOrders || available,

    stuckOrders:
      dashboard.stuckOrders || stuck,

    captains:
      dashboard.captains || captains.length,

    establishments:
      dashboard.establishments ||
      establishments.length,

    completedToday:
      dashboard.completedToday || completed,
  };
}

function scopeTitle(scope: ScopeData) {
  if (scope.role === "area_leader") {
    return "قائد منطقة";
  }

  if (scope.role === "governorate_leader") {
    return "قائد محافظة";
  }

  return "قائد";
}

function scopeDescription(scope: ScopeData) {
  const governorate = textValue(
    scope.governorateName,
    scope.governorate?.name,
  );

  const areas =
    scope.areaNames?.length
      ? scope.areaNames
      : (scope.areas || [])
          .map((item) =>
            textValue(
              item?.name,
              item?.area?.name,
            ),
          )
          .filter(Boolean);

  if (scope.role === "area_leader") {
    if (areas.length === 1) {
      return `${governorate} · ${areas[0]}`;
    }

    if (areas.length > 1) {
      return `${governorate} · ${areas.length} مناطق`;
    }
  }

  return governorate || "نطاق التشغيل";
}

export default function LeaderHomeScreen() {
  const { width } = useWindowDimensions();

  const isMobile = width < 700;
  const isSmallMobile = width < 480;

  const [scope, setScope] =
    useState<ScopeData>({});

  const [orders, setOrders] =
    useState<AnyObject[]>([]);

  const [captains, setCaptains] =
    useState<AnyObject[]>([]);

  const [establishments, setEstablishments] =
    useState<AnyObject[]>([]);

  const [dashboardStats, setDashboardStats] =
    useState<LeaderStats>({
      totalOrders: 0,
      activeOrders: 0,
      availableOrders: 0,
      stuckOrders: 0,
      captains: 0,
      establishments: 0,
      completedToday: 0,
    });

  const [filter, setFilter] =
    useState<FilterKey>("all");

  const [search, setSearch] =
    useState("");

  const [ordersPage, setOrdersPage] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadData = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          dashboardResult,
          ordersResult,
          captainsResult,
          establishmentsResult,
          scopeResult,
        ] = await Promise.all([
          apiGet("/leaders/me/dashboard"),
          apiGet("/leaders/me/orders"),
          apiGet("/leaders/me/captains"),
          apiGet("/leaders/me/establishments"),
          apiGet("/leaders/me/scope"),
        ]);

        const nextOrders =
          toArray(ordersResult);

        const nextCaptains =
          toArray(captainsResult);

        const nextEstablishments =
          toArray(establishmentsResult);

        const nextScope =
          unwrap(scopeResult) || {};

        setScope(nextScope);
        setOrders(nextOrders);
        setCaptains(nextCaptains);
        setEstablishments(nextEstablishments);

        setDashboardStats(
          mergeStats(
            extractDashboardStats(
              dashboardResult,
            ),
            nextOrders,
            nextCaptains,
            nextEstablishments,
          ),
        );
      } catch (err: any) {
        setError(
          textValue(
            err?.response?.data?.message,
            err?.message,
            "تعذر تحميل لوحة القائد.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = dashboardStats;

  const activeSearch =
    normalizeArabic(search);

  const resultData = useMemo(() => {
    let list: AnyObject[] = [];

    let type:
      | "orders"
      | "captains"
      | "establishments" =
      "orders";

    if (filter === "captains") {
      list = captains;
      type = "captains";
    } else if (
      filter === "establishments"
    ) {
      list = establishments;
      type = "establishments";
    } else {
      list = orders;
      type = "orders";

      if (filter === "active") {
        list = list.filter(
          isActiveOrder,
        );
      }

      if (filter === "available") {
        list = list.filter(
          isAvailableOrder,
        );
      }

      if (filter === "stuck") {
        list = list.filter(
          isStuckOrder,
        );
      }

      if (filter === "completed") {
        list = list.filter(
          isCompletedOrder,
        );
      }
    }

    if (!activeSearch) {
      return {
        type,
        items:
          type === "orders"
            ? list
            : list.slice(0, 8),
      };
    }

    const filtered = list.filter(
      (item) => {
        const searchable =
          normalizeArabic(
            [
              getOrderNumber(item),
              getCaptainName(item),
              getEstablishmentName(item),
              getAreaName(item),
              getGovernorateName(item),
              item?.phone,
              item?.email,
              item?.customerName,
              item?.customer?.name,
              item?.customer?.phone,
              item?.address,
              item?.status,
              item?.type,
            ]
              .filter(Boolean)
              .join(" "),
          );

        return searchable.includes(
          activeSearch,
        );
      },
    );

    return {
      type,
      items:
        type === "orders"
          ? filtered
          : filtered.slice(0, 8),
    };
  }, [
    activeSearch,
    captains,
    establishments,
    filter,
    orders,
  ]);

  const ORDERS_PER_PAGE = 4;

  useEffect(() => {
    setOrdersPage(1);
  }, [filter, activeSearch]);

  const totalOrderPages =
    resultData.type === "orders"
      ? Math.max(
          1,
          Math.ceil(
            resultData.items.length /
              ORDERS_PER_PAGE,
          ),
        )
      : 1;

  const safeOrdersPage = Math.min(
    ordersPage,
    totalOrderPages,
  );

  const visibleItems =
    resultData.type === "orders"
      ? resultData.items.slice(
          (safeOrdersPage - 1) *
            ORDERS_PER_PAGE,
          safeOrdersPage *
            ORDERS_PER_PAGE,
        )
      : resultData.items;

  const primaryCards = [
    {
      key: "all" as const,
      title: "إجمالي الطلبات",
      value: stats.totalOrders,
      icon: "cube-outline" as const,
    },
    {
      key: "active" as const,
      title: "الطلبات النشطة",
      value: stats.activeOrders,
      icon: "bicycle-outline" as const,
    },
    {
      key: "available" as const,
      title: "الطلبات المتاحة",
      value: stats.availableOrders,
      icon: "time-outline" as const,
    },
    {
      key: "stuck" as const,
      title: "الطلبات العالقة",
      value: stats.stuckOrders,
      icon: "alert-circle-outline" as const,
    },
  ];

  const filters: {
    key: FilterKey;
    label: string;
  }[] = [
    { key: "all", label: "الكل" },
    { key: "active", label: "نشطة" },
    { key: "available", label: "متاحة" },
    { key: "stuck", label: "عالقة" },
    { key: "completed", label: "مكتملة" },
    { key: "captains", label: "الكباتن" },
    {
      key: "establishments",
      label: "المطاعم والمحلات",
    },
  ];

  const cardWidth = "48.5%";

  const progress =
    stats.totalOrders > 0
      ? Math.min(
          100,
          Math.round(
            (stats.completedToday /
              stats.totalOrders) *
              100,
          ),
        )
      : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="small"
            color="#111111"
          />
          <Text style={styles.loadingText}>
            جاري تحميل لوحة زاجل...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderResults = () => {
    if (resultData.items.length === 0) {
      return (
        <View style={styles.empty}>
          <Ionicons
            name="search-outline"
            size={24}
            color="#999999"
          />
          <Text style={styles.emptyTitle}>
            لا توجد نتائج
          </Text>
          <Text style={styles.emptyText}>
            جرّب تغيير الفلتر أو البحث.
          </Text>
        </View>
      );
    }

    if (
      resultData.type === "captains"
    ) {
      return resultData.items.map(
        (item, index) => {
          const name =
            getCaptainName(item) ||
            `كابتن ${index + 1}`;

          const area =
            getAreaName(item) ||
            "بدون منطقة";

          return (
            <View
              key={
                String(
                  item?._id ??
                    item?.id ??
                    `captain-${index}`,
                )
              }
              style={styles.listRow}
            >
              <View
                style={styles.rowIcon}
              >
                <Ionicons
                  name="person-outline"
                  size={19}
                  color="#111111"
                />
              </View>

              <View
                style={styles.rowBody}
              >
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                >
                  {name}
                </Text>

                <Text
                  style={styles.rowMeta}
                  numberOfLines={1}
                >
                  {area}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={18}
                color="#AAAAAA"
              />
            </View>
          );
        },
      );
    }

    if (
      resultData.type ===
      "establishments"
    ) {
      return resultData.items.map(
        (item, index) => {
          const name =
            getEstablishmentName(
              item,
            ) ||
            `منشأة ${index + 1}`;

          const area =
            getAreaName(item) ||
            "بدون منطقة";

          return (
            <View
              key={
                String(
                  item?._id ??
                    item?.id ??
                    `establishment-${index}`,
                )
              }
              style={styles.listRow}
            >
              <View
                style={styles.rowIcon}
              >
                <Ionicons
                  name="storefront-outline"
                  size={19}
                  color="#111111"
                />
              </View>

              <View
                style={styles.rowBody}
              >
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                >
                  {name}
                </Text>

                <Text
                  style={styles.rowMeta}
                  numberOfLines={1}
                >
                  {area}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={18}
                color="#AAAAAA"
              />
            </View>
          );
        },
      );
    }

    return visibleItems.map(
      (item, index) => {
        const number =
          getOrderNumber(item);

        const establishment =
          getEstablishmentName(
            item,
          ) || "منشأة غير محددة";

        const captain =
          getCaptainName(item) ||
          "لم يتم تعيين كابتن";

        const area =
          getAreaName(item);

        const tone =
          statusColors(
            getOrderStatus(item),
          );

        return (
          <View
            key={
              String(
                item?._id ??
                  item?.id ??
                  `order-${index}`,
              )
            }
            style={styles.listRow}
          >
            <View
              style={styles.orderNumber}
            >
              <Text
                style={
                  styles.orderNumberText
                }
              >
                #{number}
              </Text>
            </View>

            <View
              style={styles.rowBody}
            >
              <View
                style={styles.orderTitleRow}
              >
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                >
                  {establishment}
                </Text>

                <View
                  style={[
                    styles.status,
                    {
                      backgroundColor:
                        tone.backgroundColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          tone.color,
                      },
                    ]}
                  >
                    {statusLabel(
                      getOrderStatus(
                        item,
                      ),
                    )}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.rowMeta}
                numberOfLines={1}
              >
                {captain}
                {area
                  ? ` · ${area}`
                  : ""}
              </Text>
            </View>

            <Ionicons
              name="chevron-back"
              size={18}
              color="#AAAAAA"
            />
          </View>
        );
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadData(true)
            }
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandArea}>
            <View style={styles.brandMark}>
              <Ionicons
                name="bicycle-outline"
                size={23}
                color="#FFFFFF"
              />
            </View>

            <View
              style={styles.brandText}
            >
              <Text
                style={styles.brandName}
              >
                زاجل
              </Text>

              <Text
                style={styles.brandCaption}
              >
                لوحة القائد
              </Text>
            </View>
          </View>

          <View
            style={styles.headerCenter}
          >
            <Text
              style={styles.headerTitle}
            >
              الرئيسية
            </Text>

            <View
              style={styles.scopeLine}
            >
              <Ionicons
                name="location-outline"
                size={15}
                color="#777777"
              />

              <Text
                style={styles.scopeText}
                numberOfLines={1}
              >
                {scopeTitle(scope)} ·{" "}
                {scopeDescription(scope)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() =>
              loadData(true)
            }
            style={styles.refresh}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="#111111"
            />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBar}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#111111"
            />

            <Text
              style={styles.errorText}
              numberOfLines={2}
            >
              {error}
            </Text>

            <Pressable
              onPress={() =>
                loadData(true)
              }
              style={styles.retry}
            >
              <Text
                style={styles.retryText}
              >
                إعادة المحاولة
              </Text>
            </Pressable>
          </View>
        ) : null}

        {stats.stuckOrders > 0 ? (
          <Pressable
            onPress={() =>
              setFilter("stuck")
            }
            style={styles.alertBar}
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#111111"
            />

            <View
              style={styles.alertBody}
            >
              <Text
                style={styles.alertTitle}
              >
                يوجد طلبات تحتاج متابعة
              </Text>

              <Text
                style={styles.alertSub}
              >
                {stats.stuckOrders} طلب عالق حاليًا
              </Text>
            </View>

            <Ionicons
              name="chevron-back"
              size={18}
              color="#666666"
            />
          </Pressable>
        ) : null}

        <View style={styles.summary}>
          <View style={styles.summaryHeader}>
            <View>
              <Text
                style={styles.sectionTitle}
              >
                ملخص اليوم
              </Text>

              <Text
                style={styles.sectionMeta}
              >
                أهم مؤشرات التشغيل في نطاقك
              </Text>
            </View>

            <Text
              style={styles.percent}
            >
              {progress}%
            </Text>
          </View>

          <View
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.summaryStats,
                isMobile && styles.summaryStatsMobile,
            isSmallMobile && styles.summaryStatsSmallMobile,
          ]}
          >
            <View
              style={styles.miniStat}
            >
              <Text
                style={styles.miniValue}
              >
                {stats.completedToday}
              </Text>

              <Text
                style={styles.miniLabel}
              >
                مكتملة اليوم
              </Text>
            </View>

            <View
              style={styles.miniDivider}
            />

            <View
              style={styles.miniStat}
            >
              <Text
                style={styles.miniValue}
              >
                {stats.captains}
              </Text>

              <Text
                style={styles.miniLabel}
              >
                كابتن
              </Text>
            </View>

            <View
              style={styles.miniDivider}
            />

            <View
              style={styles.miniStat}
            >
              <Text
                style={styles.miniValue}
              >
                {stats.establishments}
              </Text>

              <Text
                style={styles.miniLabel}
              >
                منشأة
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statsGrid,
            isMobile && styles.statsGridMobile,
          ]}
        >
          {primaryCards.map(
            (card) => (
              <Pressable
                key={card.key}
                onPress={() =>
                  setFilter(card.key)
                }
                style={[
                  styles.statCard,
                  {
                    width: isMobile
                      ? "100%"
                      : cardWidth,
                  },
                  filter === card.key &&
                    styles.statCardSelected,
                ]}
              >
                <View
                  style={
                    styles.statIcon
                  }
                >
                  <Ionicons
                    name={card.icon}
                    size={22}
                    color="#111111"
                  />
                </View>

                <View
                  style={
                    styles.statData
                  }
                >
                  <Text
                    style={
                      styles.statNumber
                    }
                  >
                    {card.value}
                  </Text>

                  <Text
                    style={
                      styles.statTitle
                    }
                  >
                    {card.title}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-back"
                  size={17}
                  color="#AAAAAA"
                />
              </Pressable>
            ),
          )}
        </View>

        <View
          style={styles.workspace}
        >
          <View
            style={styles.workspaceTop}
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                المتابعة
              </Text>

              <Text
                style={
                  styles.sectionMeta
                }
              >
                الطلبات والموارد داخل نطاقك
              </Text>
            </View>

            <View
              style={styles.live}
            >
              <View
                style={styles.liveDot}
              />

              <Text
                style={styles.liveText}
              >
                مباشر
              </Text>
            </View>
          </View>

          <View
            style={styles.searchBox}
          >
            <Ionicons
              name="search-outline"
              size={19}
              color="#888888"
            />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="بحث في الطلبات والكباتن والمنشآت"
              placeholderTextColor="#999999"
              style={styles.searchInput}
              textAlign="right"
            />

            {search ? (
              <Pressable
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color="#999999"
                />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            {filters.map(
              (item) => (
                <Pressable
                  key={item.key}
                  onPress={() =>
                    setFilter(
                      item.key,
                    )
                  }
                  style={[
                    styles.filter,
                    filter ===
                      item.key &&
                      styles.filterActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter ===
                        item.key &&
                        styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        </View>

        <View
          style={styles.contentGrid}
        >
          <View
            style={[
              styles.panel,
              {
                width: "100%",
              },
            ]}
          >
            <View
              style={
                styles.panelHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.panelTitle
                  }
                >
                  {filter === "captains"
                    ? "الكباتن"
                    : filter ===
                        "establishments"
                      ? "المطاعم والمحلات"
                      : "الطلبات"}
                </Text>

                <Text
                  style={
                    styles.panelMeta
                  }
                >
                  آخر النتائج
                </Text>
              </View>

              <Text
                style={
                  styles.panelCount
                }
              >
                {resultData.items.length}
              </Text>
            </View>

            <View
              style={styles.list}
            >
              {renderResults()}
            </View>

            {resultData.type === "orders" &&
            totalOrderPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  onPress={() =>
                    setOrdersPage(
                      Math.max(
                        1,
                        safeOrdersPage - 1,
                      ),
                    )
                  }
                  disabled={safeOrdersPage === 1}
                  style={styles.paginationButton}
                >
                  <Text
                    style={
                      styles.paginationArrowText
                    }
                  >
                    ‹
                  </Text>
                </Pressable>

                {Array.from(
                  {
                    length: totalOrderPages,
                  },
                  (_, index) => index + 1,
                ).map((page) => (
                  <Pressable
                    key={page}
                    onPress={() =>
                      setOrdersPage(page)
                    }
                    style={[
                      styles.paginationNumber,
                      safeOrdersPage === page &&
                        styles.paginationNumberActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paginationNumberText,
                        safeOrdersPage === page &&
                          styles.paginationNumberTextActive,
                      ]}
                    >
                      {page}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  onPress={() =>
                    setOrdersPage(
                      Math.min(
                        totalOrderPages,
                        safeOrdersPage + 1,
                      ),
                    )
                  }
                  disabled={
                    safeOrdersPage ===
                    totalOrderPages
                  }
                  style={styles.paginationButton}
                >
                  <Text
                    style={
                      styles.paginationArrowText
                    }
                  >
                    ›
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    width: "100%",
    maxWidth: 1320,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 55,
  },

  headerCenterMobile: {
    alignItems: "flex-end",
    marginHorizontal: 12,
  },

  summaryStatsMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 14,
  },

  statsGridMobile: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },

  summaryStatsSmallMobile: {
    paddingHorizontal: 0,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#666666",
    fontWeight: "700",
  },

  header: {
    minHeight: 88,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E8751A",
    marginBottom: 30,
  },

  brandArea: {
    flexDirection: "row-reverse",
    alignItems: "center",
    width: 175,
  },

  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: "#E8751A",
    alignItems: "center",
    justifyContent: "center",
  },

  brandText: {
    marginRight: 9,
    alignItems: "flex-end",
  },

  brandName: {
    fontSize: 18,
    color: "#E8751A",
    fontWeight: "900",
  },

  brandCaption: {
    marginTop: 1,
    fontSize: 10,
    color: "#888888",
    fontWeight: "700",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    color: "#111111",
    fontWeight: "900",
  },

  scopeLine: {
    marginTop: 3,
    flexDirection: "row-reverse",
    alignItems: "center",
    maxWidth: "95%",
  },

  scopeText: {
    marginRight: 5,
    fontSize: 11,
    color: "#777777",
    fontWeight: "700",
    textAlign: "center",
  },

  refresh: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  errorBar: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    marginHorizontal: 10,
    color: "#333333",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },

  retry: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E8751A",
    alignItems: "center",
    justifyContent: "center",
  },

  retryText: {
    fontSize: 11,
    color: "#111111",
    fontWeight: "900",
  },

  alertBar: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 14,
  },

  alertBody: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 10,
  },

  alertTitle: {
    fontSize: 13,
    color: "#111111",
    fontWeight: "900",
    textAlign: "right",
  },

  alertSub: {
    marginTop: 2,
    fontSize: 11,
    color: "#777777",
    fontWeight: "700",
    textAlign: "right",
  },

  summary: {
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FFFFFF",
    padding: 24,
    marginBottom: 26,
  },

  summaryHeader: {
    minHeight: 52,
    paddingHorizontal: 4,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E8751A",
    paddingBottom: 10,
  },

  sectionTitle: {
    alignSelf: "flex-end",
    fontSize: 14,
    color: "#E8751A",
    fontWeight: "900",
    textAlign: "right",
    borderWidth: 1,
    borderColor: "#E8751A",
    backgroundColor: "#FFF7F1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  sectionMeta: {
    marginTop: 3,
    fontSize: 11,
    color: "#888888",
    fontWeight: "600",
    textAlign: "right",
  },

  percent: {
    fontSize: 22,
    color: "#111111",
    fontWeight: "900",
  },

  progressTrack: {
    height: 5,
    backgroundColor: "#E8751A",
    marginTop: 15,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#111111",
    alignSelf: "flex-end",
  },

  summaryStats: {
    marginTop: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-around",
  },

  miniStat: {
    flex: 1,
    alignItems: "center",
  },

  miniValue: {
    fontSize: 20,
    color: "#111111",
    fontWeight: "900",
  },

  miniLabel: {
    marginTop: 3,
    fontSize: 10,
    color: "#888888",
    fontWeight: "700",
  },

  miniDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E8751A",
  },

  statsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },

  statCard: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    flexShrink: 0,
  },

  statCardSelected: {
    borderColor: "#E8751A",
    backgroundColor: "#FFF7F1",
    borderWidth: 2,
  },


  statIcon: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },

  statData: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    marginHorizontal: 14,
  },

  statNumber: {
    fontSize: 24,
    color: "#111111",
    fontWeight: "900",
    lineHeight: 27,
  },

  statTitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#777777",
    fontWeight: "800",
    textAlign: "right",
  },

  workspace: {
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FFFFFF",
    padding: 15,
    marginBottom: 22,
  },

  workspaceTop: {
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8751A",
  },

  live: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: "#E8751A",
  },

  liveText: {
    marginRight: 5,
    fontSize: 10,
    color: "#444444",
    fontWeight: "900",
  },

  searchBox: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 11,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 8,
    paddingVertical: 6,
    color: "#111111",
    fontSize: 12,
    fontWeight: "700",
  },

  filters: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingTop: 20,
  },

  filter: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FFFFFF",
    marginLeft: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  filterActive: {
    backgroundColor: "#E8751A",
    borderColor: "#E8751A",
  },

  filterText: {
    fontSize: 10,
    color: "#666666",
    fontWeight: "900",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  contentGrid: {
    flexDirection: "column",
    width: "100%",
    marginBottom: 10,
  },

  panel: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FFFFFF",
    marginBottom: 26,
    overflow: "hidden",
  },

  sidePanel: {
    alignSelf: "flex-start",
  },

  panelHeader: {
    minHeight: 84,
    paddingHorizontal: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E8751A",
  },

  panelTitle: {
    fontSize: 15,
    color: "#111111",
    fontWeight: "900",
    textAlign: "right",
  },

  panelMeta: {
    marginTop: 2,
    fontSize: 10,
    color: "#999999",
    fontWeight: "700",
    textAlign: "right",
  },

  panelCount: {
    minWidth: 28,
    height: 28,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    textAlign: "center",
    textAlignVertical: "center",
    paddingTop: 5,
    fontSize: 11,
    color: "#111111",
    fontWeight: "900",
  },

  listRow: {
    minHeight: 86,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E8751A",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },

  orderNumber: {
    minWidth: 55,
    alignItems: "center",
    justifyContent: "center",
  },

  orderNumberText: {
    fontSize: 11,
    color: "#111111",
    fontWeight: "900",
  },

  rowBody: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 10,
    alignItems: "flex-end",
  },

  rowTitle: {
    width: "100%",
    fontSize: 12,
    color: "#111111",
    fontWeight: "900",
    textAlign: "right",
  },

  rowMeta: {
    width: "100%",
    marginTop: 4,
    fontSize: 10,
    color: "#888888",
    fontWeight: "700",
    textAlign: "right",
  },

  orderTitleRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  status: {
    marginRight: 8,
    paddingHorizontal: 8,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },

  health: {
    minHeight: 84,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8751A",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  healthIcon: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },

  healthBody: {
    flex: 1,
    marginHorizontal: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  healthTitle: {
    fontSize: 11,
    color: "#444444",
    fontWeight: "800",
    textAlign: "right",
  },

  healthValue: {
    fontSize: 17,
    color: "#111111",
    fontWeight: "900",
  },

  healthValueStrong: {
    textDecorationLine: "underline",
  },

  scopeBox: {
    margin: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F2C6AA",
    backgroundColor: "#FAFAFA",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  scopeBoxBody: {
    flex: 1,
    marginRight: 9,
    alignItems: "flex-end",
  },

  scopeBoxTitle: {
    fontSize: 10,
    color: "#888888",
    fontWeight: "700",
    textAlign: "right",
  },

  scopeBoxText: {
    marginTop: 3,
    fontSize: 11,
    color: "#111111",
    fontWeight: "900",
    textAlign: "right",
  },

  list: {
    minHeight: 100,
  },

  pagination: {
    minHeight: 72,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8751A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  paginationButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "#E8751A",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  paginationArrowText: {
    fontSize: 22,
    lineHeight: 24,
    color: "#111111",
    fontWeight: "900",
  },

  paginationNumber: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "#E8751A",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  paginationNumberActive: {
    backgroundColor: "#E8751A",
  },

  paginationNumberText: {
    fontSize: 12,
    color: "#111111",
    fontWeight: "900",
  },

  paginationNumberTextActive: {
    color: "#FFFFFF",
  },

  empty: {
    minHeight: 210,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  emptyTitle: {
    marginTop: 9,
    fontSize: 13,
    color: "#444444",
    fontWeight: "900",
  },

  emptyText: {
    marginTop: 4,
    fontSize: 11,
    color: "#999999",
    fontWeight: "700",
  },
});
