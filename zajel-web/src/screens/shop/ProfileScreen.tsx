import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import { useAuthStore } from "../../store/authStore";
import { useAppTheme } from "../../theme/useAppTheme";

export default function ShopProfileScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const user = useAuthStore((s) => s.user);

  const name = user?.name || "حساب المتجر";
  const phone = user?.phone || "غير متوفر";
  const email = user?.email || "غير متوفر";
  const status = user?.status || "غير محدد";

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              إعدادات المتجر
            </Text>

            <Text style={styles.title}>
              الحساب
            </Text>

            <Text style={styles.subtitle}>
              بيانات حسابك وحالة المتجر
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="person-outline"
              size={25}
              color={appTheme.primaryColor}
            />
          </View>
        </View>

        {/* Profile Hero */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name.charAt(0)}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {name}
            </Text>

            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      appTheme.successColor,
                  },
                ]}
              />

              <Text style={styles.statusText}>
                {status}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <Text style={styles.sectionTitle}>
          بيانات الحساب
        </Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon="person-outline"
            label="اسم المتجر / المستخدم"
            value={name}
            appTheme={appTheme}
          />

          <InfoRow
            icon="call-outline"
            label="رقم الهاتف"
            value={phone}
            appTheme={appTheme}
          />

          <InfoRow
            icon="mail-outline"
            label="البريد الإلكتروني"
            value={email}
            appTheme={appTheme}
            last
          />
        </View>

        {/* Account Status */}
        <Text style={styles.sectionTitle}>
          حالة الحساب
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusCardIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={23}
              color={appTheme.successColor}
            />
          </View>

          <View style={styles.statusCardContent}>
            <Text style={styles.statusCardTitle}>
              حالة الحساب
            </Text>

            <Text style={styles.statusCardValue}>
              {status}
            </Text>
          </View>

          <Ionicons
            name="checkmark-circle"
            size={22}
            color={appTheme.successColor}
          />
        </View>

        {/* Info */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={appTheme.infoColor}
          />

          <Text style={styles.infoBannerText}>
            بيانات الحساب يتم تحميلها من حسابك المسجل
            على المنصة.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
  appTheme,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  appTheme: ReturnType<typeof useAppTheme>;
  last?: boolean;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row-reverse",
          alignItems: "center",
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: appTheme.borderColor,
        },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 11,
          backgroundColor: `${appTheme.primaryColor}10`,
        }}
      >
        <Ionicons
          name={icon}
          size={19}
          color={appTheme.primaryColor}
        />
      </View>

      <View
        style={{
          flex: 1,
          alignItems: "flex-end",
        }}
      >
        <Text
          style={{
            color: appTheme.secondaryTextColor,
            fontSize: 10,
            fontWeight: "700",
            marginBottom: 3,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: appTheme.textColor,
            fontSize: 14,
            fontWeight: "800",
            textAlign: "right",
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      flexDirection: "row-reverse",
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
      fontWeight: "900",
      marginBottom: 3,
    },

    title: {
      color: appTheme.textColor,
      fontSize: 29,
      fontWeight: "900",
      textAlign: "right",
    },

    subtitle: {
      marginTop: 4,
      color: appTheme.secondaryTextColor,
      fontSize: 13,
      fontWeight: "500",
      textAlign: "right",
    },

    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 14,
      backgroundColor: appTheme.surfaceColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
    },

    profileCard: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: appTheme.primaryColor,
      borderRadius: 22,
      padding: 18,
      marginBottom: 22,
    },

    avatar: {
      width: 64,
      height: 64,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
      marginLeft: 14,
    },

    avatarText: {
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: "900",
    },

    profileInfo: {
      flex: 1,
      alignItems: "flex-end",
    },

    profileName: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "900",
      textAlign: "right",
    },

    statusPill: {
      flexDirection: "row-reverse",
      alignItems: "center",
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.14)",
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginLeft: 6,
    },

    statusText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },

    sectionTitle: {
      color: appTheme.textColor,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "right",
      marginBottom: 9,
    },

    infoCard: {
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      borderRadius: 20,
      paddingHorizontal: 15,
      marginBottom: 20,
    },

    statusCard: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      borderRadius: 20,
      padding: 15,
      marginBottom: 18,
    },

    statusCardIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 11,
      backgroundColor: `${appTheme.successColor}12`,
    },

    statusCardContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    statusCardTitle: {
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "700",
    },

    statusCardValue: {
      color: appTheme.textColor,
      fontSize: 15,
      fontWeight: "900",
      marginTop: 3,
    },

    infoBanner: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      padding: 14,
      borderRadius: 17,
      backgroundColor: `${appTheme.infoColor}0D`,
      borderWidth: 1,
      borderColor: `${appTheme.infoColor}20`,
    },

    infoBannerText: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: "600",
      textAlign: "right",
      marginRight: 9,
    },
  });
