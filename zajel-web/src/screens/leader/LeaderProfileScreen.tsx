import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import { getLeaderScope } from "../../api/leader";

export default function LeaderProfileScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await getLeaderScope();
        setData(result);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const user = data?.user || {};
  const scope = data?.scope || {};

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.kicker}>
          الحساب
        </Text>

        <Text style={styles.title}>
          حسابي
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {String(
                user.fullName || "?",
              ).slice(0, 1)}
            </Text>
          </View>

          <Text style={styles.name}>
            {user.fullName || "—"}
          </Text>

          <Text style={styles.role}>
            {user.role === "governorate_leader"
              ? "قائد محافظة"
              : "قائد مناطق"}
          </Text>
        </View>

        <Info
          label="رقم الهاتف"
          value={user.phone || "—"}
        />

        <Info
          label="البريد الإلكتروني"
          value={user.email || "غير مضاف"}
        />

        <Info
          label="المحافظة"
          value={
            scope.governorateName ||
            "غير محددة"
          }
        />

        <Info
          label="نطاق المناطق"
          value={
            scope.areas?.length
              ? scope.areas
                  .map((area: any) => area.name)
                  .join(" • ")
              : "المحافظة كاملة"
          }
        />

        <Info
          label="حالة الحساب"
          value={user.status || "—"}
        />
      </ScrollView>
    </Screen>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>
      <Text style={styles.infoValue}>
        {value}
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
    marginBottom: 18,
  },
  profileCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#F5D7B5",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#D94F00",
    fontSize: 30,
    fontWeight: "900",
  },
  name: {
    color: "#26160B",
    fontSize: 22,
    fontWeight: "900",
  },
  role: {
    color: "#B86A2D",
    marginTop: 4,
    fontWeight: "800",
  },
  info: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEE3D9",
    borderRadius: 17,
    padding: 15,
    marginBottom: 10,
  },
  infoLabel: {
    color: "#927F70",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  infoValue: {
    color: "#2E221B",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "right",
  },
});
