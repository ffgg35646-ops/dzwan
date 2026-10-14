
import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { getAppVersion, getMaintenanceState } from "../../api/appGate";
import AppButton from "../../components/AppButton";
import Screen from "../../components/Screen";
import { useAuthStore } from "../../store/authStore";
type Props = {
  children: React.ReactNode;
};

export function AppGateScreen({ children }: Props) {
  const { authenticated, accountType } = useAuthStore() as any;

  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const maintenanceState = await getMaintenanceState();

        if (!mounted) return;

        if (maintenanceState.enabled) {
          setMaintenance(true);
          setMaintenanceMessage(
            maintenanceState.message ||
              "النظام تحت الصيانة حاليًا. حاول مرة أخرى لاحقًا."
          );
          return;
        }

        if (authenticated && accountType) {
          const version = await getAppVersion(accountType);

          if (!mounted) return;

          const currentAppVersion =
            Constants.expoConfig?.version ?? "1.0.0";

          if (
            version.minimumVersion &&
            (
              version.forceUpdate ||
              compare(currentAppVersion, version.minimumVersion) < 0
            )
          ) {
            setForceUpdate(true);
          }
        }
      } catch {
        // لا نمنع التطبيق بالكامل عند فشل فحص البوابة.
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [authenticated, accountType]);

  if (maintenance) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.icon}>🛠️</Text>
          <Text style={styles.title}>الصيانة</Text>
          <Text style={styles.message}>{maintenanceMessage}</Text>
        </View>
      </Screen>
    );
  }

  if (forceUpdate) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.icon}>⬆️</Text>
          <Text style={styles.title}>تحديث مطلوب</Text>
          <Text style={styles.message}>
            يجب تحديث التطبيق إلى إصدار أحدث لمتابعة استخدام زاجل.
          </Text>

          <AppButton
            title="تحديث التطبيق"
            onPress={() => {
              Linking.openURL(
                "https://example.com"
              );
            }}
          />
        </View>
      </Screen>
    );
  }

  return <>{children}</>;
}

function compare(a: string, b: string) {
  const aa = a.split(".").map(Number);
  const bb = b.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const x = aa[i] || 0;
    const y = bb[i] || 0;

    if (x > y) return 1;
    if (x < y) return -1;
  }

  return 0;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    fontSize: 54,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
    color: "#1F2937",
    marginBottom: 20,
  },
});
