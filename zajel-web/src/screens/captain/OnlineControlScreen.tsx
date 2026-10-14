import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
import { useAppTheme } from "../../theme/useAppTheme";
import { useAuthStore } from "../../store/authStore";
import {
  setCaptainOnline,
} from "../../api/captainRuntime";
import {
  getOnlineState,
} from "../../api/captainOnlineRuntime";

export default function OnlineControlScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const user = useAuthStore((s) => s.user);

  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    loadState();
    requestLocation();
  }, []);

  async function loadState() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result: any = await getOnlineState();

      const value =
        result?.online ??
        result?.isOnline ??
        result?.data?.online ??
        result?.data?.isOnline ??
        false;

      setOnline(Boolean(value));
    } catch {
      // Keep the UI safe if the state endpoint is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }

  async function requestLocation() {
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      setLocationGranted(permission.granted);

      if (!permission.granted) {
        Alert.alert(
          "صلاحية الموقع",
          "صلاحية الموقع مطلوبة أثناء تشغيل الكابتن."
        );
      }
    } catch {
      setLocationGranted(false);
    }
  }

  async function toggle() {
    if (!user?.id) return;

    if (!online && !locationGranted) {
      Alert.alert(
        "الموقع مطلوب",
        "فعّل صلاحية الموقع أولًا حتى تتمكن من تشغيل حالة الاتصال."
      );

      await requestLocation();
      return;
    }

    setBusy(true);

    try {
      const next = !online;

      await setCaptainOnline(user.id, next);

      setOnline(next);

      Alert.alert(
        next ? "أصبحت متصلًا" : "تم إيقاف الاتصال",
        next
          ? "يمكن للنظام إرسال الطلبات إليك وفق الشفت والقواعد."
          : "لن تستقبل طلبات جديدة."
      );
    } catch (e: any) {
      Alert.alert(
        "تعذر تغيير الحالة",
        e?.response?.data?.message ||
          "تعذر تحديث حالة الاتصال."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: online
                  ? `${appTheme.successColor}18`
                  : `${appTheme.secondaryTextColor}12`,
              },
            ]}
          >
            <Ionicons
              name="radio-outline"
              size={28}
              color={
                online
                  ? appTheme.successColor
                  : appTheme.secondaryTextColor
              }
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>حالة الكابتن</Text>
            <Text style={styles.title}>حالة الاتصال</Text>
          </View>
        </View>

        <View
          style={[
            styles.hero,
            {
              borderColor: online
                ? `${appTheme.successColor}35`
                : appTheme.borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.statusCircle,
              {
                backgroundColor: online
                  ? `${appTheme.successColor}16`
                  : `${appTheme.secondaryTextColor}10`,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={appTheme.primaryColor}
              />
            ) : (
              <Ionicons
                name={
                  online
                    ? "checkmark-circle"
                    : "moon-outline"
                }
                size={48}
                color={
                  online
                    ? appTheme.successColor
                    : appTheme.secondaryTextColor
                }
              />
            )}
          </View>

          <Text style={styles.statusLabel}>
            الحالة الحالية
          </Text>

          <Text
            style={[
              styles.statusTitle,
              {
                color: online
                  ? appTheme.successColor
                  : appTheme.textColor,
              },
            ]}
          >
            {loading
              ? "جاري التحقق..."
              : online
                ? "متصل"
                : "غير متصل"}
          </Text>

          <Text style={styles.statusDescription}>
            {online
              ? "أنت متاح حاليًا لاستقبال الطلبات حسب الشفت وقواعد التوزيع."
              : "أنت غير متاح حاليًا لاستقبال طلبات جديدة."}
          </Text>

          <View
            style={[
              styles.statePill,
              {
                backgroundColor: online
                  ? `${appTheme.successColor}12`
                  : `${appTheme.secondaryTextColor}10`,
              },
            ]}
          >
            <View
              style={[
                styles.stateDot,
                {
                  backgroundColor: online
                    ? appTheme.successColor
                    : appTheme.secondaryTextColor,
                },
              ]}
            />

            <Text
              style={[
                styles.statePillText,
                {
                  color: online
                    ? appTheme.successColor
                    : appTheme.secondaryTextColor,
                },
              ]}
            >
              {online ? "جاهز لاستقبال الطلبات" : "متوقف"}
            </Text>
          </View>
        </View>

        <View style={styles.requirements}>
          <View style={styles.requirementRow}>
            <View
              style={[
                styles.requirementIcon,
                {
                  backgroundColor: locationGranted
                    ? `${appTheme.successColor}12`
                    : `${appTheme.warningColor}12`,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={
                  locationGranted
                    ? appTheme.successColor
                    : appTheme.warningColor
                }
              />
            </View>

            <View style={styles.requirementText}>
              <Text style={styles.requirementTitle}>
                صلاحية الموقع
              </Text>
              <Text style={styles.requirementDescription}>
                {locationGranted
                  ? "تم السماح باستخدام الموقع."
                  : "الموقع مطلوب أثناء تشغيل الكابتن."}
              </Text>
            </View>

            <Ionicons
              name={
                locationGranted
                  ? "checkmark-circle"
                  : "alert-circle-outline"
              }
              size={21}
              color={
                locationGranted
                  ? appTheme.successColor
                  : appTheme.warningColor
              }
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.requirementRow}>
            <View
              style={[
                styles.requirementIcon,
                {
                  backgroundColor: `${appTheme.infoColor}12`,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={appTheme.infoColor}
              />
            </View>

            <View style={styles.requirementText}>
              <Text style={styles.requirementTitle}>
                قواعد الشفت
              </Text>
              <Text style={styles.requirementDescription}>
                حالة الاتصال لا تتجاوز قواعد الشفت والحد الأقصى للطلبات.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <AppButton
            title={
              online
                ? "إيقاف الاتصال"
                : "تشغيل الاتصال"
            }
            onPress={toggle}
            loading={busy}
            secondary={online}
          />

          <Text style={styles.footerHint}>
            التوزيع النهائي للطلبات يتم من النظام بناءً على
            الشفت والتوفر وقواعد التوزيع.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      gap: 16,
    },
    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 13,
    },
    headerIcon: {
      width: 58,
      height: 58,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      alignItems: "flex-end",
    },
    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 12,
      fontWeight: "800",
    },
    title: {
      color: appTheme.textColor,
      fontSize: 28,
      fontWeight: "900",
      marginTop: 2,
      textAlign: "right",
    },
    hero: {
      alignItems: "center",
      padding: 23,
      borderRadius: 26,
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
    },
    statusCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 13,
    },
    statusLabel: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "700",
    },
    statusTitle: {
      fontSize: 31,
      fontWeight: "900",
      marginTop: 3,
    },
    statusDescription: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      lineHeight: 20,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 310,
    },
    statePill: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 30,
      marginTop: 14,
    },
    stateDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statePillText: {
      fontSize: 11,
      fontWeight: "800",
    },
    requirements: {
      padding: 15,
      borderRadius: 22,
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
    },
    requirementRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    requirementIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    requirementText: {
      flex: 1,
      alignItems: "flex-end",
    },
    requirementTitle: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "right",
    },
    requirementDescription: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 2,
      textAlign: "right",
    },
    divider: {
      height: 1,
      backgroundColor: appTheme.borderColor,
      marginVertical: 13,
    },
    footer: {
      marginTop: "auto",
      gap: 9,
    },
    footerHint: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      lineHeight: 18,
      textAlign: "center",
    },
  });
