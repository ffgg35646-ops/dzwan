
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getRuntimeState } from "../api/runtime";
import { useAuthStore } from "../store/authStore";

export default function RuntimeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth: any = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const role =
          auth?.accountType === "shop"
            ? "shop"
            : "captain";

        const runtime = await getRuntimeState(role);

        if (!active) return;

        setMaintenance(Boolean(runtime.maintenance));
        setMessage(runtime.maintenanceMessage ?? "");

        setForceUpdate(
          Boolean(
            auth?.authenticated &&
            runtime.forceUpdate
          )
        );
      } catch {
        // عدم منع التطبيق عند تعطل فحص البوابة مؤقتًا.
      } finally {
        if (active) setLoading(false);
      }
    }

    check();

    return () => {
      active = false;
    };
  }, [auth?.authenticated, auth?.accountType]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>
          جاري تجهيز التطبيق...
        </Text>
      </View>
    );
  }

  if (maintenance) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>🛠️</Text>
        <Text style={styles.title}>
          النظام تحت الصيانة
        </Text>
        <Text style={styles.text}>
          {message || "حاول مرة أخرى لاحقًا."}
        </Text>
      </View>
    );
  }

  if (forceUpdate) {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>⬆️</Text>
        <Text style={styles.title}>
          تحديث مطلوب
        </Text>
        <Text style={styles.text}>
          يجب تثبيت الإصدار الأحدث من التطبيق.
        </Text>

        <Text
          style={styles.link}
          onPress={() =>
            Linking.openURL(process.env.EXPO_PUBLIC_UPDATE_URL || "https://example.com")
          }
        >
          فتح صفحة التحديث
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  icon: {
    fontSize: 54,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: "#6B7280",
    textAlign: "center",
  },
  link: {
    marginTop: 20,
    color: "#F59E0B",
    fontWeight: "800",
    fontSize: 16,
  },
});
