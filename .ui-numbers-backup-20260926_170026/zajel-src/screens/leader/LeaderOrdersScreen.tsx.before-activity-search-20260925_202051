import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import { getLeaderOrders } from "../../api/leader";

export default function LeaderOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const result = await getLeaderOrders();
      setOrders(
        Array.isArray(result?.orders)
          ? result.orders
          : [],
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "تعذر تحميل الطلبات.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#FF6A00"
          />
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
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={styles.kicker}>
          التشغيل
        </Text>
        <Text style={styles.title}>
          الطلبات
        </Text>
        <Text style={styles.subtitle}>
          كل الطلبات الموجودة داخل نطاقك.
        </Text>

        {!!error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {orders.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="clipboard-text-off-outline"
              size={34}
              color="#B8A697"
            />
            <Text style={styles.emptyTitle}>
              لا توجد طلبات
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <View
              key={String(order._id)}
              style={styles.card}
            >
              <View style={styles.top}>
                <Text style={styles.number}>
                  #{order.orderNumber || String(order._id).slice(-6)}
                </Text>

                <Text style={styles.status}>
                  {String(order.status || "")}
                </Text>
              </View>

              <Text style={styles.establishment}>
                {order.establishmentId?.name ||
                  "منشأة غير محددة"}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>
                  المبلغ: {Number(order.total || 0)}
                </Text>

                <Text style={styles.meta}>
                  {order.captainId?.fullName ||
                    "بدون كابتن"}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
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
  },
  kicker: {
    color: "#B86A2D",
    fontWeight: "900",
    textAlign: "right",
  },
  title: {
    color: "#26160B",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 2,
  },
  subtitle: {
    color: "#7A6A5D",
    textAlign: "right",
    marginTop: 5,
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  top: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  number: {
    color: "#26160B",
    fontWeight: "900",
  },
  status: {
    color: "#C45306",
    backgroundColor: "#FFF4E8",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: "900",
  },
  establishment: {
    color: "#55473E",
    marginTop: 10,
    fontWeight: "800",
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 10,
  },
  meta: {
    color: "#8A7B70",
    fontSize: 12,
  },
  error: {
    backgroundColor: "#FFF1F2",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#9F1239",
    fontWeight: "800",
    textAlign: "right",
  },
  empty: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#54463D",
    fontWeight: "900",
    marginTop: 10,
  },
});
