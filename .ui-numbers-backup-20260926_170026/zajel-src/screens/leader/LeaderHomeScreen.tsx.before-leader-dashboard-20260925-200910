import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import { getLeaderDashboard } from "../../api/leader";

type Props = any;

export default function LeaderHomeScreen({}: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");

      const result = await getLeaderDashboard();
      setData(result);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "تعذر تحميل لوحة القائد.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function refresh() {
    setRefreshing(true);
    void load(true);
  }

  const scope = data?.scope;
  const stats = data?.stats || {};
  const recentOrders = Array.isArray(data?.recentOrders)
    ? data.recentOrders
    : [];

  if (loading && !data) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.loadingText}>
            جاري تحميل لوحة القائد...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.hero}>
          <View>
            <Text style={styles.kicker}>
              مركز التشغيل
            </Text>
            <Text style={styles.title}>
              لوحة القائد
            </Text>
            <Text style={styles.subtitle}>
              تابع منطقتك وطلباتك وكباتنك من مكان واحد.
            </Text>
          </View>

          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="shield-account-outline"
              size={30}
              color="#FF6A00"
            />
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.retry}>
                إعادة المحاولة
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.scopeCard}>
          <View style={styles.scopeIcon}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={25}
              color="#FF6A00"
            />
          </View>

          <View style={styles.scopeCopy}>
            <Text style={styles.scopeLabel}>
              نطاق مسؤوليتك
            </Text>
            <Text style={styles.scopeGov}>
              {scope?.governorateName || "غير محدد"}
            </Text>

            <Text style={styles.scopeAreas}>
              {scope?.areas?.length
                ? scope.areas
                    .map((area: any) => area.name)
                    .join(" • ")
                : "المحافظة كاملة"}
            </Text>
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>
            حالة التشغيل
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="clipboard-text-outline"
            label="كل الطلبات"
            value={stats.orders}
          />
          <StatCard
            icon="progress-clock"
            label="طلبات نشطة"
            value={stats.activeOrders}
          />
          <StatCard
            icon="truck-fast-outline"
            label="الكباتن"
            value={stats.captains}
          />
          <StatCard
            icon="wifi"
            label="الكباتن المتصلون"
            value={stats.onlineCaptains}
          />
          <StatCard
            icon="storefront-outline"
            label="المنشآت"
            value={stats.establishments}
          />
          <StatCard
            icon="store-check-outline"
            label="المنشآت العاملة"
            value={stats.activeEstablishments}
          />
        </View>

        <View style={styles.attentionCard}>
          <View style={styles.attentionIcon}>
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={25}
              color="#B45309"
            />
          </View>

          <View style={styles.attentionCopy}>
            <Text style={styles.attentionTitle}>
              طلبات تحتاج متابعة
            </Text>
            <Text style={styles.attentionText}>
              الطلبات التي ما زالت في بداية دورة التشغيل.
            </Text>
          </View>

          <Text style={styles.attentionNumber}>
            {stats.pendingOrders ?? 0}
          </Text>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>
            آخر الطلبات
          </Text>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="clipboard-text-off-outline"
              size={35}
              color="#B8A697"
            />
            <Text style={styles.emptyTitle}>
              لا توجد طلبات حتى الآن
            </Text>
            <Text style={styles.emptyText}>
              ستظهر هنا أحدث الطلبات داخل نطاقك.
            </Text>
          </View>
        ) : (
          recentOrders.map((order: any) => (
            <View
              key={String(order._id)}
              style={styles.orderCard}
            >
              <View style={styles.orderTop}>
                <Text style={styles.orderNumber}>
                  #{order.orderNumber || String(order._id).slice(-6)}
                </Text>

                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>
                    {String(order.status || "غير محدد")}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderEstablishment}>
                {order.establishmentId?.name ||
                  "منشأة غير محددة"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: any;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <MaterialCommunityIcons
          name={icon as any}
          size={22}
          color="#FF6A00"
        />
      </View>
      <Text style={styles.statLabel}>
        {label}
      </Text>
      <Text style={styles.statValue}>
        {Number(value || 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6F625A",
    fontWeight: "800",
  },
  hero: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F5D7B5",
    marginBottom: 14,
  },
  kicker: {
    color: "#B86A2D",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "right",
  },
  title: {
    color: "#26160B",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "right",
  },
  subtitle: {
    color: "#7A6A5D",
    marginTop: 5,
    maxWidth: 270,
    lineHeight: 20,
    textAlign: "right",
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  scopeCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  scopeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF4E8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  scopeCopy: {
    flex: 1,
  },
  scopeLabel: {
    color: "#9B8777",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  scopeGov: {
    color: "#26160B",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "right",
  },
  scopeAreas: {
    color: "#75665B",
    fontSize: 12,
    marginTop: 3,
    textAlign: "right",
  },
  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#26160B",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE3D9",
    padding: 15,
    marginBottom: 10,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF4E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  statLabel: {
    color: "#786A5F",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  statValue: {
    color: "#26160B",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "right",
  },
  attentionCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F4E0A4",
    padding: 15,
    marginBottom: 18,
  },
  attentionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFF7D5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  attentionCopy: {
    flex: 1,
  },
  attentionTitle: {
    color: "#713F12",
    fontWeight: "900",
    textAlign: "right",
  },
  attentionText: {
    color: "#8A6E32",
    fontSize: 12,
    marginTop: 3,
    textAlign: "right",
  },
  attentionNumber: {
    color: "#92400E",
    fontSize: 28,
    fontWeight: "900",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  orderTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNumber: {
    color: "#26160B",
    fontWeight: "900",
  },
  statusPill: {
    backgroundColor: "#FFF4E8",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    color: "#C45306",
    fontSize: 11,
    fontWeight: "900",
  },
  orderEstablishment: {
    color: "#7A6A5D",
    marginTop: 7,
    textAlign: "right",
  },
  errorBox: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: "#9F1239",
    fontWeight: "800",
    textAlign: "right",
  },
  retry: {
    color: "#D94F00",
    fontWeight: "900",
    marginTop: 8,
    textAlign: "right",
  },
  empty: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#43372F",
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#8A7B70",
    marginTop: 5,
    textAlign: "center",
  },
});
