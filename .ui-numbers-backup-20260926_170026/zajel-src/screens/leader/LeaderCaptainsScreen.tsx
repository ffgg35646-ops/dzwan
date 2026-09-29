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
import { getLeaderCaptains } from "../../api/leader";

export default function LeaderCaptainsScreen() {
  const [captains, setCaptains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getLeaderCaptains();
      setCaptains(
        Array.isArray(result?.captains)
          ? result.captains
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
          الفريق
        </Text>

        <Text style={styles.title}>
          الكباتن
        </Text>

        <Text style={styles.subtitle}>
          الكباتن الموجودون داخل نطاق مسؤوليتك.
        </Text>

        {captains.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={35}
              color="#B8A697"
            />
            <Text style={styles.emptyTitle}>
              لا يوجد كباتن
            </Text>
          </View>
        ) : (
          captains.map((captain) => {
            const online = Boolean(
              captain.isOnline,
            );

            return (
              <View
                key={String(captain._id)}
                style={styles.card}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {String(
                      captain.fullName || "?",
                    ).slice(0, 1)}
                  </Text>
                </View>

                <View style={styles.copy}>
                  <Text style={styles.name}>
                    {captain.fullName}
                  </Text>

                  <Text style={styles.phone}>
                    {captain.phone}
                  </Text>

                  <View style={styles.row}>
                    <View
                      style={[
                        styles.pill,
                        online
                          ? styles.online
                          : styles.offline,
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          online
                            ? styles.onlineDot
                            : styles.offlineDot,
                        ]}
                      />
                      <Text
                        style={
                          online
                            ? styles.onlineText
                            : styles.offlineText
                        }
                      >
                        {online
                          ? "متصل"
                          : "غير متصل"}
                      </Text>
                    </View>

                    <Text style={styles.status}>
                      {captain.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#FFF4E8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  avatarText: {
    color: "#D94F00",
    fontSize: 20,
    fontWeight: "900",
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
    alignItems: "center",
    marginTop: 9,
    gap: 8,
  },
  pill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  online: {
    backgroundColor: "#ECFDF5",
  },
  offline: {
    backgroundColor: "#F5F5F4",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 10,
    marginLeft: 5,
  },
  onlineDot: {
    backgroundColor: "#10B981",
  },
  offlineDot: {
    backgroundColor: "#A8A29E",
  },
  onlineText: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "900",
  },
  offlineText: {
    color: "#78716C",
    fontSize: 11,
    fontWeight: "900",
  },
  status: {
    color: "#8A7B70",
    fontSize: 11,
    fontWeight: "800",
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
