import { useAppTheme } from "../../theme/useAppTheme";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import { getOrders } from "../../api/orders";
import { useAuthStore } from "../../store/authStore";
import { apiGet } from "../../api/request";
import NotificationBell from "../../components/shared/NotificationBell";
import SupportQuickAccess from "../../components/shared/SupportQuickAccess";

const SHOP_PRIMARY = "#E8751A";

export default function ShopHomeScreen() {

  const [supportNotificationCount, setSupportNotificationCount] =
    useState(0);

  const [supportNotificationVisible, setSupportNotificationVisible] =
    useState(false);

  const [supportNotificationMessage, setSupportNotificationMessage] =
    useState("");

  async function loadSupportNotification() {
    try {
      const response = await apiGet(
        "/support-tickets/my/unread-count",
      );

      const count = Number(response?.count ?? 0);

      setSupportNotificationCount(
        Number.isFinite(count) && count > 0 ? count : 0,
      );

      if (count > 0) {
        setSupportNotificationMessage(
          response?.message ||
            `لديك ${count} رسائل جديدة في الدعم السريع`,
        );
      }
    } catch {
      setSupportNotificationCount(0);
    }
  }

  useEffect(() => {
    void loadSupportNotification();

    const timer = setInterval(
      () => void loadSupportNotification(),
      10000,
    );

    return () => clearInterval(timer);
  }, []);

  function openSupportNotification() {
    setSupportNotificationVisible(false);

    const navigation =
      (globalThis as any)?.navigationRef?.current;

    if (navigation) {
      navigation.navigate("الدعم");
    }
  }

  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<any>();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentPage, setRecentPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const result = await getOrders();

      const list = Array.isArray(result)
        ? result
        : result?.orders ||
          result?.items ||
          result?.data ||
          [];

      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completed = orders.filter(
    (order) =>
      order?.status === "delivered" ||
      (order?.status === "completed" || order?.status === "delivered"),
  ).length;

  const cancelled = orders.filter(
    (order) =>
      order?.status === "cancelled" ||
      order?.status === "rejected",
  ).length;

  const active = orders.filter(
    (order) =>
      [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "assigned",
        "heading_to_shop",
        "arrived_at_shop",
        "picked_up",
        "on_the_way",
      ].includes(
        String(order?.status || "").toLowerCase(),
      ),
  ).length;

  const RECENT_PAGE_SIZE = 5;

  const recentTotalPages = Math.max(
    1,
    Math.ceil(
      orders.length / RECENT_PAGE_SIZE,
    ),
  );

  const safeRecentPage = Math.min(
    recentPage,
    recentTotalPages,
  );

  const recentOrders = orders.slice(
    (safeRecentPage - 1) * RECENT_PAGE_SIZE,
    safeRecentPage * RECENT_PAGE_SIZE,
  );

  useEffect(() => {
    if (recentPage > recentTotalPages) {
      setRecentPage(1);
    }
  }, [recentPage, recentTotalPages]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={appTheme.primaryColor}
            colors={[appTheme.primaryColor]}
          />
        }
      >
        {/* Header */}
        <View
        style={[
          styles.header,
          {
            position: "relative",
            zIndex: 999999,
            elevation: 999999,
            overflow: "visible",
          },
        ]}
      >
          <View
            style={[
              styles.headerActions,
              {
                overflow: "visible",
              },
            ]}
          >
            <NotificationBell />
            <SupportQuickAccess />

            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    appTheme.primaryColor,
                },
              ]}
            >
              <Text style={styles.avatarText}>
                {(user?.name || "م").trim().charAt(0)}
              </Text>
            </View>
          </View>

          <View style={styles.brandPill}>
            <View style={styles.brandPillIcon}>
              <Ionicons
                name="bicycle-outline"
                size={17}
                color="#C85C0B"
              />
            </View>

            <Text style={styles.brandPillText}>
              زاجل ديلفري
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCircleOne} />
          <View style={styles.heroCircleTwo} />

          <View style={styles.heroTop}>
            <View style={styles.heroBrand}>
              <View style={styles.heroBrandAvatar}>
                <Text style={styles.heroBrandAvatarText}>
                  {(user?.name || "م").trim().charAt(0)}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                style={styles.heroBrandName}
              >
                {user?.name || "اسم المطعم"}
              </Text>
            </View>

            <View style={styles.heroTopLabel}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={22}
                  color="#C85C0B"
                />
              </View>

              <Text style={styles.heroLabel}>
                لوحة المطعم
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            إدارة طلباتك بسهولة
          </Text>

          <Text style={styles.heroText}>
            أنشئ الطلبات وتابع حالتها وشاهد سجل الطلبات من مكان واحد.
          </Text>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => navigation.navigate("الطلبات")}
            style={styles.heroButton}
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.heroButtonText}>
              إدارة الطلبات
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ملخص الطلبات
          </Text>

          <Text style={styles.sectionHint}>
            تحديث مباشر
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color={appTheme.primaryColor}
            />

            <Text style={styles.loadingText}>
              جاري تحميل الطلبات...
            </Text>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard
                title="النشطة"
                value={active}
                icon="pulse-outline"
                accent={appTheme.primaryColor}
                styles={styles}
                appTheme={appTheme}
                onPress={() => navigation.navigate("الطلبات")}
              />

              <StatCard
                title="المكتملة"
                value={completed}
                icon="checkmark-circle-outline"
                accent={appTheme.successColor}
                styles={styles}
                appTheme={appTheme}
                onPress={() => navigation.navigate("الطلبات")}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="الإجمالي"
                value={orders.length}
                icon="receipt-outline"
                accent={appTheme.infoColor}
                styles={styles}
                appTheme={appTheme}
                onPress={() => navigation.navigate("الطلبات")}
              />

              <StatCard
                title="الملغاة"
                value={cancelled}
                icon="close-circle-outline"
                accent={appTheme.dangerColor}
                styles={styles}
                appTheme={appTheme}
                onPress={() => navigation.navigate("الطلبات")}
              />
            </View>
            {/* Quick support */}
{/* Active orders */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                آخر الطلبات
              </Text>

              <Text style={styles.sectionHint}>
                {orders.length} طلب
              </Text>
            </View>

            <View style={styles.ordersCard}>
              {recentOrders.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyIconText}>
                      ✓
                    </Text>
                  </View>

                  <Text style={styles.emptyTitle}>
                    لا توجد طلبات حتى الآن
                  </Text>

                  <Text style={styles.emptyText}>
                    عند إنشاء طلب جديد سيظهر هنا.
                  </Text>
                </View>
              ) : (
                recentOrders.map((order, index) => (
                  <OrderRow
                    key={String(
                      order?._id ||
                        order?.id ||
                        index,
                    )}
                    order={order}
                    styles={styles}
                    appTheme={appTheme}
                    last={
                      index ===
                      recentOrders.length - 1
                    }
                  />
                ))
              )}
            
            {recentTotalPages > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 14,
                  marginBottom: 4,
                  gap: 6,
                }}
              >
                {Array.from(
                  { length: recentTotalPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <TouchableOpacity
                    key={`recent-page-${page}`}
                    onPress={() =>
                      setRecentPage(page)
                    }
                    style={{
                      minWidth: 36,
                      height: 36,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        page === safeRecentPage
                          ? SHOP_PRIMARY
                          : "#F3E9DF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "900",
                        color:
                          page === safeRecentPage
                            ? "#FFFFFF"
                            : "#6B5545",
                      }}
                    >
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
</View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
  styles,
  appTheme,
  onPress,
}: {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  styles: ReturnType<typeof createStyles>;
  appTheme: ReturnType<typeof useAppTheme>;
  onPress: () => void;
}) {
  const palette =
    title === "النشطة"
      ? {
          card: "#FF9F1C",
          border: "#F07D00",
          icon: "#FFD66B",
          iconBorder: "#FFC13D",
          accent: "#8A3F00",
        }
      : title === "المكتملة"
      ? {
          card: "#FFC52F",
          border: "#ECA800",
          icon: "#FFE58A",
          iconBorder: "#FFD04F",
          accent: "#7A4A00",
        }
      : title === "الإجمالي"
      ? {
          card: "#FFAE1A",
          border: "#E88A00",
          icon: "#FFE08A",
          iconBorder: "#FFC84A",
          accent: "#733600",
        }
      : {
          card: "#FF7B12",
          border: "#E85D00",
          icon: "#FFD39A",
          iconBorder: "#F5A95E",
          accent: "#7A2500",
        };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.statCard,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.statTop}>
        <View
          style={[
            styles.statIcon,
            {
              backgroundColor: palette.icon,
              borderColor: palette.iconBorder,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={19}
            color={palette.accent}
          />
        </View>

        <Text style={styles.statLabel}>
          {title}
        </Text>
      </View>

      <Text style={styles.statNumber}>
        {value}
      </Text>

      <Text style={styles.statFooter}>
        {title === "النشطة"
          ? "قيد التنفيذ"
          : title === "المكتملة"
            ? "تم توصيلها"
            : title === "الملغاة"
              ? "ملغاة أو مرفوضة"
              : "كل الطلبات"}
      </Text>
    </TouchableOpacity>
  );
}

function OrderRow({
  order,
  styles,
  appTheme,
  last,
}: {
  order: any;
  styles: ReturnType<typeof createStyles>;
  appTheme: ReturnType<typeof useAppTheme>;
  last: boolean;
}) {
  const status = order?.status || "pending";

  const statusInfo = getStatusInfo(
    status,
    appTheme,
  );

  const orderNumber =
    order?.orderNumber ||
    order?._id ||
    order?.id ||
    "—";

  const customerName =
    order?.customerSnapshot?.name ||
    order?.customerName ||
    order?.customer?.name ||
    "طلب توصيل";

  const address =
    order?.customerSnapshot?.address ||
    order?.deliveryAddress ||
    order?.address?.address ||
    "عنوان التوصيل";

  const total = Number(
    order?.total ??
      order?.subtotal ??
      0,
  ).toLocaleString("en-US");

  const icon =
    status === "delivered" ||
    status === "completed"
      ? "checkmark-done-outline"
      : status === "rejected" ||
        status === "cancelled"
      ? "close-outline"
      : "receipt-outline";

  return (
    <View
      style={[
        styles.orderRow,
        !last && styles.orderSpacing,
      ]}
    >
      <View
        style={[
          styles.orderStatusIcon,
          {
            backgroundColor:
              statusInfo.color + "14",
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={statusInfo.color}
        />
      </View>

      <View style={styles.orderMain}>
        <View style={styles.orderTopLine}>
          <Text style={styles.orderNumber}>
            #{orderNumber}
          </Text>

          <View style={styles.orderStatus}>
            <Text
              style={[
                styles.orderStatusText,
                { color: statusInfo.color },
              ]}
            >
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={1}
          style={styles.orderCustomer}
        >
          {customerName}
        </Text>

        <View style={styles.orderMetaRow}>
          <View style={styles.orderMetaItem}>
            <Ionicons
              name="location-outline"
              size={14}
              color="#9A806C"
            />

            <Text
              numberOfLines={1}
              style={styles.orderAddress}
            >
              {address}
            </Text>
          </View>

          <View style={styles.orderPricePill}>
            <Ionicons
              name="cash-outline"
              size={14}
              color="#C85C0B"
            />

            <Text style={styles.orderPriceText}>
              {total} د.ع
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function getStatusInfo(
  status: string,
  appTheme: ReturnType<typeof useAppTheme>,
) {
  switch (status) {
    case "pending":
      return {
        label: "قيد الانتظار",
        color: appTheme.warningColor,
      };

    case "confirmed":
      return {
        label: "تم التأكيد",
        color: appTheme.primaryColor,
      };

    case "preparing":
      return {
        label: "جاري التجهيز",
        color: appTheme.infoColor,
      };

    case "ready_for_pickup":
      return {
        label: "جاهز للاستلام",
        color: appTheme.infoColor,
      };

    case "assigned":
      return {
        label: "تم تعيين الكابتن",
        color: appTheme.infoColor,
      };

    case "heading_to_shop":
      return {
        label: "الكابتن في الطريق للمطعم",
        color: appTheme.infoColor,
      };

    case "arrived_at_shop":
      return {
        label: "الكابتن وصل للمطعم",
        color: appTheme.infoColor,
      };

    case "picked_up":
      return {
        label: "تم استلام الطلب",
        color: appTheme.infoColor,
      };

    case "on_the_way":
      return {
        label: "الطلب في الطريق",
        color: appTheme.secondaryColor,
      };

    case "delivered":
    case "completed":
      return {
        label: "مكتمل",
        color: appTheme.successColor,
      };

    case "cancelled":
      return {
        label: "ملغي",
        color: appTheme.dangerColor,
      };

    case "rejected":
      return {
        label: "مرفوض",
        color: appTheme.dangerColor,
      };

    default:
      return {
        label: "قيد الانتظار",
        color: appTheme.warningColor,
      };
  }
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 40,
      backgroundColor: "#FFF1C7",
      minHeight: "100%",

    },

    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },

    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    brandPill: {
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#ECDACB",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      shadowColor: "#7A4B27",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },

    brandPillIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor: "#FFF0E1",
      alignItems: "center",
      justifyContent: "center",
    },

    brandPillText: {
      color: "#E8751A",
      fontSize: 13,
      fontWeight: "900",
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 12,
    },

    avatarText: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "900",
    },

    hero: {
      minHeight: 215,
      borderRadius: 26,
      backgroundColor: "#2B211B",
      overflow: "hidden",
      marginBottom: 22,
      padding: 19,
      shadowColor: "#5B3820",
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 4,
    },

    heroCircleOne: {
      position: "absolute",
      width: 190,
      height: 190,
      borderRadius: 95,
      right: -72,
      top: -86,
      backgroundColor: "#E8751A",
      opacity: 0.24,
    },

    heroCircleTwo: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      left: -40,
      bottom: -60,
      backgroundColor: "#F5B56C",
      opacity: 0.08,
    },

    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    heroBrand: {
      maxWidth: "54%",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    heroBrandAvatar: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: "#E8751A",
      alignItems: "center",
      justifyContent: "center",
    },

    heroBrandAvatarText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },

    heroBrandName: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      textAlign: "left",
    },

    heroTopLabel: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 9,
    },

    heroIcon: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor: "#FFE9D3",
      alignItems: "center",
      justifyContent: "center",
    },

    heroLabel: {
      color: "#FFDAB8",
      fontSize: 11,
      fontWeight: "900",
    },

    heroTitle: {
      marginTop: 18,
      color: "#FFFFFF",
      fontSize: 23,
      fontWeight: "900",
      textAlign: "right",
    },

    heroText: {
      marginTop: 7,
      color: "#E9DDD3",
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "600",
      textAlign: "right",
    },

    heroButton: {
      alignSelf: "flex-end",
      marginTop: 18,
      minHeight: 46,
      paddingHorizontal: 17,
      borderRadius: 15,
      backgroundColor: "#E8751A",
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },

    heroButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
      marginTop: 2,
    },

    sectionTitle: {
      color: appTheme.textColor,
      fontSize: 17,
      fontWeight: "900",
    },

    sectionHint: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "700",
    },

    statsRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },

    statCard: {
      flex: 1,
      minHeight: 58,
      height: 62,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 17,
      borderWidth: 1,
      overflow: "hidden",
      shadowColor: "#A85A12",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 7,
      elevation: 3,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
    },

    statTop: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 7,
    },

    statIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    statLabel: {
      flex: 1,
      color: "#6B4325",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.2,
      textAlign: "right",
      marginRight: 0,
    },

    statNumber: {
      color: "#3A2414",
      fontSize: 21,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 0,
      lineHeight: 24,
      minWidth: 27,
    },

    statFooter: {
      display: "none",
    },

    ordersCard: {
      padding: 10,
      borderRadius: 23,
      backgroundColor: "#FFE7B5",
      borderWidth: 1,
      borderColor: "#F1BF69",
      shadowColor: "#B96A16",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },

    orderRow: {
      minHeight: 112,
      padding: 13,
      borderRadius: 19,
      backgroundColor: "#FFF2D4",
      borderWidth: 1,
      borderColor: "#E9BE69",
      flexDirection: "row-reverse",
      alignItems: "center",
      shadowColor: "#6D4A31",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.055,
      shadowRadius: 10,
      elevation: 2,
    },

    orderSpacing: {
      marginBottom: 10,
    },

    orderStatusIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 11,
      backgroundColor: "#FFE8AF",
    },

    orderMain: {
      flex: 1,
      minWidth: 0,
      alignItems: "stretch",
    },

    orderTopLine: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },

    orderNumber: {
      flex: 1,
      color: "#2E231C",
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
    },

    orderCustomer: {
      color: "#6E5A4A",
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
      marginTop: 4,
    },

    orderAddress: {
      flex: 1,
      color: "#9A806C",
      fontSize: 10,
      fontWeight: "600",
      textAlign: "right",
    },

    orderStatus: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#F8F3EE",
    },

    orderStatusText: {
      fontSize: 9,
      fontWeight: "900",
    },

    orderMetaRow: {
      marginTop: 9,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },

    orderMetaItem: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 5,
    },

    orderPricePill: {
      minHeight: 29,
      paddingHorizontal: 9,
      borderRadius: 10,
      backgroundColor: "#FFF1E4",
      borderWidth: 1,
      borderColor: "#F3D4BA",
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 5,
    },

    orderPriceText: {
      color: "#C85C0B",
      fontSize: 10,
      fontWeight: "900",
    },

    empty: {
      paddingVertical: 42,
      paddingHorizontal: 20,
      borderRadius: 19,
      backgroundColor: "#FFE0A8",
      borderWidth: 1,
      borderColor: "#F0B85F",
      alignItems: "center",
    },

    emptyIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor:
        appTheme.successColor + "12",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },

    emptyIconText: {
      color: appTheme.successColor,
      fontSize: 23,
      fontWeight: "900",
    },

    emptyTitle: {
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "900",
    },

    emptyText: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      marginTop: 5,
      textAlign: "center",
    },

    loadingCard: {
      minHeight: 220,
      borderRadius: 20,
      backgroundColor: "#FFDFA6",
      borderWidth: 1,
      borderColor: "#F0B85F",
      alignItems: "center",
      justifyContent: "center",
    },

    loadingText: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 12,
    },
  });
