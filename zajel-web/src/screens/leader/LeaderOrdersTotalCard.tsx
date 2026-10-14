import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiGet } from "../../api/request";

function unwrap(value: any): any {
  return value?.data ?? value ?? {};
}

function getOrders(value: any): any[] {
  const root = unwrap(value);

  const candidates = [
    root?.orders,
    root?.items,
    root?.results,
    root?.data?.orders,
    root?.data?.items,
    root?.data?.results,
    root?.data,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) {
      return item;
    }
  }

  return [];
}

function getNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

function getStatus(order: any): string {
  return String(
    order?.status ??
      order?.state ??
      order?.orderStatus ??
      "",
  ).toLowerCase();
}

function isCompleted(order: any): boolean {
  return [
    "completed",
    "delivered",
    "done",
    "finished",
    "closed",
  ].includes(getStatus(order));
}

function isRejected(order: any): boolean {
  return [
    "rejected",
    "declined",
    "refused",
  ].includes(getStatus(order));
}

export default function LeaderOrdersTotalCard() {
  const navigation = useNavigation<any>();

  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [rejected, setRejected] = useState(0);

  const load = useCallback(async () => {
    try {
      const raw = await apiGet("/orders?limit=10000");
      const root = unwrap(raw);
      const orders = getOrders(root);

      const serverTotal =
        getNumber(root?.total) ??
        getNumber(root?.totalOrders) ??
        getNumber(root?.count) ??
        getNumber(root?.pagination?.total) ??
        getNumber(root?.meta?.total);

      setTotal(serverTotal ?? orders.length);

      setActive(
        orders.filter(
          (order) =>
            !isCompleted(order) &&
            !isRejected(order),
        ).length,
      );

      setCompleted(
        orders.filter(isCompleted).length,
      );

      setRejected(
        orders.filter(isRejected).length,
      );
    } catch (error) {
      console.warn(
        "LeaderOrdersTotalCard:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = setInterval(() => {
      void load();
    }, 30000);

    return () => clearInterval(timer);
  }, [load]);

  return (
    <Pressable
      onPress={() =>
        navigation.navigate("الطلبات")
      }
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>
            إحصائية شاملة
          </Text>

          <Text style={styles.title}>
            مجموع الطلبات
          </Text>

          <Text style={styles.subtitle}>
            جميع الطلبات بكل الحالات
          </Text>
        </View>

        <View style={styles.icon}>
          <Text style={styles.iconText}>
            #
          </Text>
        </View>
      </View>

      <Text style={styles.total}>
        {total}
      </Text>

      <View style={styles.breakdown}>
        <View style={styles.smallCard}>
          <Text style={styles.smallValue}>
            {active}
          </Text>

          <Text style={styles.smallLabel}>
            نشط
          </Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.smallValue}>
            {completed}
          </Text>

          <Text style={styles.smallLabel}>
            مكتمل
          </Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.smallValue}>
            {rejected}
          </Text>

          <Text style={styles.smallLabel}>
            مرفوض
          </Text>
        </View>
      </View>

      <Text style={styles.action}>
        اضغط لعرض كل الطلبات ←
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#0B1B2A",
    borderWidth: 1,
    borderColor: "#1D8CC8",
  },

  pressed: {
    opacity: 0.82,
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerText: {
    flex: 1,
    alignItems: "flex-end",
  },

  kicker: {
    color: "#76D7FF",
    fontSize: 11,
    fontWeight: "900",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 4,
  },

  subtitle: {
    color: "#A9BCCB",
    fontSize: 11,
    marginTop: 4,
  },

  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#113A55",
    alignItems: "center",
    justifyContent: "center",
  },

  iconText: {
    color: "#72D9FF",
    fontSize: 24,
    fontWeight: "900",
  },

  total: {
    color: "#FFFFFF",
    fontSize: 48,
    lineHeight: 55,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 10,
  },

  breakdown: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 12,
  },

  smallCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#0F2A3C",
    alignItems: "center",
    justifyContent: "center",
  },

  smallValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  smallLabel: {
    color: "#91A7B8",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },

  action: {
    color: "#6EDBFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 13,
  },
});
