import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import LoadingState from "../../components/LoadingState";
import { useAppTheme } from "../../theme/useAppTheme";
import {
  getCaptainCashStatement,
  getCaptainKpi,
  getCaptainRating,
} from "../../api/captainRuntime";
import { useAuthStore } from "../../store/authStore";

export default function ReportsScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const user = useAuthStore((s) => s.user);

  const [cash, setCash] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [rating, setRating] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const [cashData, kpiData, ratingData] =
        await Promise.all([
          getCaptainCashStatement(user.id),
          getCaptainKpi(user.id),
          getCaptainRating(user.id),
        ]);

      setCash(cashData);
      setKpi(kpiData);
      setRating(ratingData);
    } catch (error: any) {
      Alert.alert(
        "تعذر تحميل التقارير",
        error?.response?.data?.message ||
          "تعذر تحميل بيانات التقارير."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <LoadingState message="جاري تحميل التقارير..." />
      </Screen>
    );
  }

  const collected =
    cash?.collectedFromCustomers ??
    cash?.totalCollectedCustomers ??
    0;

  const paid =
    cash?.paidToEstablishments ??
    cash?.totalPaidShops ??
    0;

  const fees =
    cash?.deliveryFees ??
    cash?.totalDeliveryFees ??
    0;

  const completed =
    kpi?.completed ??
    kpi?.completedOrders ??
    0;

  const cancelled =
    kpi?.cancelled ??
    kpi?.cancelledOrders ??
    0;

  const average =
    rating?.average ??
    rating?.averageRating ??
    0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={appTheme.primaryColor}
            colors={[appTheme.primaryColor]}
          />
        }
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={appTheme.primaryColor}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>زاجل ديلفري</Text>
            <Text style={styles.title}>التقارير</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>
            ملخص الحساب
          </Text>

          <Text style={styles.summaryValue}>
            {completed}
          </Text>

          <Text style={styles.summaryText}>
            طلب مكتمل
          </Text>
        </View>

        <ReportSection
          title="الحركات النقدية"
          icon="cash-outline"
          appTheme={appTheme}
        >
          <ReportRow
            title="المستلم من الزبائن"
            value={`${collected} د.ع`}
            icon="arrow-down-circle-outline"
            appTheme={appTheme}
          />

          <ReportRow
            title="المدفوع للمحلات"
            value={`${paid} د.ع`}
            icon="arrow-up-circle-outline"
            appTheme={appTheme}
          />

          <ReportRow
            title="أجور التوصيل"
            value={`${fees} د.ع`}
            icon="bicycle-outline"
            appTheme={appTheme}
            last
          />
        </ReportSection>

        <ReportSection
          title="الأداء"
          icon="trending-up-outline"
          appTheme={appTheme}
        >
          <ReportRow
            title="الطلبات المكتملة"
            value={completed}
            icon="checkmark-circle-outline"
            appTheme={appTheme}
          />

          <ReportRow
            title="الطلبات الملغاة"
            value={cancelled}
            icon="close-circle-outline"
            appTheme={appTheme}
          />

          <ReportRow
            title="متوسط التوصيل"
            value={
              kpi?.averageDeliveryTime ??
              kpi?.avgDeliveryTime ??
              0
            }
            icon="time-outline"
            appTheme={appTheme}
            last
          />
        </ReportSection>

        <ReportSection
          title="التقييم"
          icon="star-outline"
          appTheme={appTheme}
        >
          <ReportRow
            title="متوسط التقييم"
            value={average}
            icon="star-outline"
            appTheme={appTheme}
          />

          <ReportRow
            title="عدد التقييمات"
            value={
              rating?.count ??
              rating?.totalRatings ??
              0
            }
            icon="people-outline"
            appTheme={appTheme}
            last
          />
        </ReportSection>
      </ScrollView>
    </Screen>
  );
}

function ReportSection({
  title,
  icon,
  children,
  appTheme,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  const styles = createStyles(appTheme);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name={icon}
            size={20}
            color={appTheme.primaryColor}
          />
        </View>

        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {children}
    </View>
  );
}

function ReportRow({
  title,
  value,
  icon,
  appTheme,
  last,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  appTheme: ReturnType<typeof useAppTheme>;
  last?: boolean;
}) {
  const styles = createStyles(appTheme);

  return (
    <View
      style={[
        styles.row,
        !last && styles.rowBorder,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={appTheme.primaryColor}
        />
      </View>

      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 2,
      paddingTop: 2,
      paddingBottom: 35,
      gap: 14,
    },

    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
    },

    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 17,
      backgroundColor: appTheme.primaryColor + "14",
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
    },

    summary: {
      minHeight: 145,
      borderRadius: 24,
      backgroundColor: appTheme.primaryDarkColor,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },

    summaryLabel: {
      color: "#99F6E4",
      fontSize: 12,
      fontWeight: "800",
    },

    summaryValue: {
      color: "#FFFFFF",
      fontSize: 40,
      fontWeight: "900",
      marginTop: 4,
    },

    summaryText: {
      color: "#CCFBF1",
      fontSize: 12,
    },

    section: {
      borderRadius: 21,
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      paddingHorizontal: 17,
      paddingTop: 16,
    },

    sectionHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      marginBottom: 3,
    },

    sectionIcon: {
      width: 37,
      height: 37,
      borderRadius: 12,
      backgroundColor: appTheme.primaryColor + "12",
      alignItems: "center",
      justifyContent: "center",
    },

    sectionTitle: {
      flex: 1,
      color: appTheme.textColor,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "right",
    },

    row: {
      minHeight: 61,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },

    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },

    rowIcon: {
      width: 33,
      height: 33,
      borderRadius: 10,
      backgroundColor: appTheme.primaryColor + "0D",
      alignItems: "center",
      justifyContent: "center",
    },

    rowTitle: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
    },

    rowValue: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "900",
    },
  });
