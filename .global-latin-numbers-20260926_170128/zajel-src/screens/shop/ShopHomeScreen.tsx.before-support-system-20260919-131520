import { useAppTheme } from "../../theme/useAppTheme";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import { getOrders } from "../../api/orders";
import { useAuthStore } from "../../store/authStore";

export default function ShopHomeScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const user = useAuthStore((s) => s.user);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      order?.status &&
      order.status !== "delivered" &&
      order.status !== "cancelled" &&
      order.status !== "rejected",
  ).length;

  const recentOrders = orders.slice(0, 5);

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
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>زاجل ديلفري</Text>

            <Text style={styles.title}>
              الرئيسية
            </Text>

            <Text style={styles.subtitle}>
              أهلاً {user?.name || "بك"} 👋
            </Text>
          </View>

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

        {/* Main banner */}
        <View style={styles.hero}>
          <View style={styles.heroCircle} />

          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>
              إدارة الطلبات
            </Text>

            <Text style={styles.heroTitle}>
              كل طلباتك في مكان واحد
            </Text>

            <Text style={styles.heroText}>
              تابع الطلبات الجديدة والمكتملة
              وحالة التوصيل بسهولة.
            </Text>
          </View>
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
                icon="↗"
                accent={appTheme.primaryColor}
                styles={styles}
                appTheme={appTheme}
              />

              <StatCard
                title="المكتملة"
                value={completed}
                icon="✓"
                accent={appTheme.successColor}
                styles={styles}
                appTheme={appTheme}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="الإجمالي"
                value={orders.length}
                icon="#"
                accent={appTheme.infoColor}
                styles={styles}
                appTheme={appTheme}
              />

              <StatCard
                title="الملغاة"
                value={cancelled}
                icon="×"
                accent={appTheme.dangerColor}
                styles={styles}
                appTheme={appTheme}
              />
            </View>

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
}: {
  title: string;
  value: number;
  icon: string;
  accent: string;
  styles: ReturnType<typeof createStyles>;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <View
          style={[
            styles.statIcon,
            {
              backgroundColor: accent + "14",
            },
          ]}
        >
          <Text
            style={[
              styles.statIconText,
              { color: accent },
            ]}
          >
            {icon}
          </Text>
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
    </View>
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

  return (
    <View
      style={[
        styles.orderRow,
        !last && styles.orderDivider,
      ]}
    >
      <View style={styles.orderMain}>
        <Text style={styles.orderNumber}>
          #
          {order?.orderNumber ||
            order?._id ||
            order?.id ||
            "—"}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.orderAddress}
        >
          {order?.customerName ||
            order?.deliveryAddress ||
            "طلب توصيل"}
        </Text>
      </View>

      <View
        style={[
          styles.orderStatus,
          {
            backgroundColor:
              statusInfo.color + "14",
          },
        ]}
      >
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
      paddingHorizontal: 2,
      paddingTop: 2,
      paddingBottom: 36,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 2,
    },

    title: {
      color: appTheme.textColor,
      fontSize: 28,
      fontWeight: "900",
    },

    subtitle: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 3,
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
      minHeight: 175,
      borderRadius: 24,
      backgroundColor: appTheme.primaryDarkColor,
      overflow: "hidden",
      marginBottom: 24,
    },

    heroCircle: {
      position: "absolute",
      width: 210,
      height: 210,
      borderRadius: 105,
      right: -80,
      top: -95,
      backgroundColor: appTheme.secondaryColor,
      opacity: 0.17,
    },

    heroContent: {
      padding: 22,
      alignItems: "flex-end",
    },

    heroLabel: {
      color: "#99F6E4",
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 6,
    },

    heroTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "900",
      textAlign: "right",
    },

    heroText: {
      color: "#CCFBF1",
      fontSize: 13,
      lineHeight: 21,
      marginTop: 8,
      textAlign: "right",
      maxWidth: "90%",
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
      gap: 12,
      marginBottom: 12,
    },

    statCard: {
      flex: 1,
      minHeight: 137,
      padding: 16,
      borderRadius: 20,
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      shadowColor: "#0F172A",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.045,
      shadowRadius: 12,
      elevation: 2,
    },

    statTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },

    statIconText: {
      fontSize: 17,
      fontWeight: "900",
    },

    statLabel: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      marginRight: 8,
    },

    statNumber: {
      color: appTheme.textColor,
      fontSize: 30,
      fontWeight: "900",
      textAlign: "right",
      marginTop: 15,
    },

    statFooter: {
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      textAlign: "right",
      marginTop: 2,
    },

    ordersCard: {
      borderRadius: 20,
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      overflow: "hidden",
    },

    orderRow: {
      minHeight: 72,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    orderDivider: {
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },

    orderMain: {
      flex: 1,
      alignItems: "flex-end",
      marginRight: 12,
    },

    orderNumber: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "900",
    },

    orderAddress: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      marginTop: 4,
      maxWidth: "100%",
    },

    orderStatus: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
    },

    orderStatusText: {
      fontSize: 10,
      fontWeight: "900",
    },

    empty: {
      paddingVertical: 35,
      paddingHorizontal: 20,
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
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
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
