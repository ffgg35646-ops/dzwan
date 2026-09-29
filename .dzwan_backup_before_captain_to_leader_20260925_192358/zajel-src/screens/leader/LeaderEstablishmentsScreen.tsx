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
import { getLeaderEstablishments } from "../../api/leader";

export default function LeaderEstablishmentsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result =
        await getLeaderEstablishments();

      setItems(
        Array.isArray(result?.establishments)
          ? result.establishments
          : [],
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
          المنشآت
        </Text>

        <Text style={styles.title}>
          المطاعم والمحلات
        </Text>

        <Text style={styles.subtitle}>
          المنشآت الموجودة داخل نطاق مسؤوليتك.
        </Text>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="store-off-outline"
              size={35}
              color="#B8A697"
            />
            <Text style={styles.emptyTitle}>
              لا توجد منشآت
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <View
              key={String(item._id)}
              style={styles.card}
            >
              <View style={styles.icon}>
                <MaterialCommunityIcons
                  name={
                    item.type === "restaurant"
                      ? "silverware-fork-knife"
                      : "storefront-outline"
                  }
                  size={24}
                  color="#FF6A00"
                />
              </View>

              <View style={styles.copy}>
                <Text style={styles.name}>
                  {item.name}
                </Text>

                <Text style={styles.phone}>
                  {item.phone || "بدون هاتف"}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.area}>
                    {item.areaId?.name ||
                      "المنطقة غير محددة"}
                  </Text>

                  <Text style={styles.status}>
                    {item.status}
                  </Text>
                </View>
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
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 5,
    marginBottom: 18,
    textAlign: "right",
  },
  card: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF4E8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  copy: {
    flex: 1,
  },
  name: {
    color: "#26160B",
    fontWeight: "900",
    textAlign: "right",
  },
  phone: {
    color: "#84756A",
    marginTop: 3,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 8,
  },
  area: {
    color: "#927F70",
    fontSize: 11,
  },
  status: {
    color: "#C45306",
    fontSize: 11,
    fontWeight: "900",
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
