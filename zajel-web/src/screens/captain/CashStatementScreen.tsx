import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import { useAppTheme } from "../../theme/useAppTheme";
import { useAuthStore } from "../../store/authStore";
import { getCaptainCashStatement } from "../../api/captainRuntime";

function money(value: unknown) {
  const n = Number(value ?? 0);

  return `${new Intl.NumberFormat("ar-IQ-u-nu-latn").format(
    Number.isFinite(n) ? n : 0,
  )} د.ع`;
}

function integer(value: unknown) {
  const n = Number(value ?? 0);

  return new Intl.NumberFormat("ar-IQ-u-nu-latn").format(
    Number.isFinite(n) ? n : 0,
  );
}

function pick(
  data: any,
  keys: string[],
  fallback = 0,
) {
  for (const key of keys) {
    if (
      data?.[key] !== undefined &&
      data?.[key] !== null
    ) {
      return data[key];
    }
  }

  return fallback;
}

export default function CashStatementScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result: any =
          await getCaptainCashStatement(user.id);

        const statement =
          result?.statement ??
          result?.data?.statement ??
          result?.data ??
          result;

        setData(statement || {});
      } catch {
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const orders = Number(
      pick(data, [
        "orders",
        "ordersCount",
        "totalOrders",
        "count",
      ]),
    );

    const collected = Number(
      pick(data, [
        "collectedFromCustomers",
        "totalCollectedCustomers",
        "collected",
      ]),
    );

    const paid = Number(
      pick(data, [
        "paidToEstablishments",
        "totalPaidShops",
        "paidToShops",
      ]),
    );

    const fees = Number(
      pick(data, [
        "deliveryFees",
        "totalDeliveryFees",
        "earnings",
      ]),
    );

    const net = Number(
      pick(
        data,
        [
          "netCash",
          "cashBalance",
          "remainingCash",
          "balance",
        ],
        collected - paid,
      ),
    );

    return {
      orders,
      collected,
      paid,
      fees,
      net,
    };
  }, [data]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={appTheme.primaryColor}
          />

          <Text style={styles.loadingText}>
            جاري تحميل كشف الحساب...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageIcon}>
            <Ionicons
              name="receipt-outline"
              size={21}
              color={appTheme.primaryColor}
            />
          </View>

          <View style={styles.pageHeaderText}>
            <Text style={styles.eyebrow}>
              الحسابات
            </Text>

            <Text style={styles.title}>
              كشف الحساب
            </Text>
          </View>
        </View>

        <View style={styles.receipt}>
          <View style={styles.receiptTop}>
            <View style={styles.receiptTitleWrap}>
              <Text style={styles.receiptTitle}>
                كشف حساب الكابتن
              </Text>

              <Text style={styles.receiptSubtitle}>
                الحركات النقدية المسجلة في النظام
              </Text>
            </View>

            <View style={styles.receiptIcon}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={appTheme.primaryColor}
              />
            </View>
          </View>

          <View style={styles.receiptLine} />

          <StatementRow
            icon="cube-outline"
            label="عدد الطلبات"
            value={integer(summary.orders)}
            styles={styles}
          />

          <StatementRow
            icon="arrow-down-circle-outline"
            label="المستلم من الزبائن"
            value={money(summary.collected)}
            valueTone="green"
            styles={styles}
          />

          <StatementRow
            icon="arrow-up-circle-outline"
            label="المدفوع للمحلات"
            value={money(summary.paid)}
            valueTone="orange"
            styles={styles}
          />

          <StatementRow
            icon="bicycle-outline"
            label="أجور التوصيل"
            value={money(summary.fees)}
            valueTone="blue"
            styles={styles}
          />

          <View style={styles.totalSeparator} />

          <View style={styles.totalRow}>
            <View style={styles.totalIcon}>
              <Ionicons
                name="wallet-outline"
                size={21}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.totalText}>
              <Text style={styles.totalLabel}>
                الرصيد النقدي
              </Text>

              <Text style={styles.totalHint}>
                صافي الحركة النقدية
              </Text>
            </View>

            <Text style={styles.totalValue}>
              {money(summary.net)}
            </Text>
          </View>
        </View>

        <View style={styles.note}>
          <View style={styles.noteIcon}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={appTheme.primaryColor}
            />
          </View>

          <Text style={styles.noteText}>
            هذا كشف محاسبي مبني على البيانات الفعلية
            المسجلة للكابتن في النظام، وليس محفظة
            إلكترونية.
          </Text>
        </View>

        {!data ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={25}
              color={appTheme.secondaryTextColor}
            />

            <Text style={styles.errorTitle}>
              تعذر تحميل الكشف
            </Text>

            <Text style={styles.errorText}>
              اسحب الصفحة للأسفل للمحاولة مرة أخرى.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function StatementRow({
  icon,
  label,
  value,
  valueTone = "normal",
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueTone?: "normal" | "green" | "orange" | "blue";
  styles: ReturnType<typeof createStyles>;
}) {
  const valueColor =
    valueTone === "green"
      ? "#16A34A"
      : valueTone === "orange"
        ? "#EA580C"
        : valueTone === "blue"
          ? "#2563EB"
          : styles.rowValue.color;

  return (
    <View style={styles.statementRow}>
      <View style={styles.statementIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={styles.primaryIcon.color as string}
        />
      </View>

      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.rowValue,
          { color: valueColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 2,
      paddingBottom: 28,
    },

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },

    loadingText: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "700",
    },

    pageHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },

    pageIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "12",
    },

    pageHeaderText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 11,
      fontWeight: "900",
    },

    title: {
      marginTop: 2,
      color: appTheme.textColor,
      fontSize: 28,
      fontWeight: "900",
      textAlign: "right",
    },

    receipt: {
      marginTop: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
      overflow: "hidden",
    },

    receiptTop: {
      padding: 18,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
    },

    receiptTitleWrap: {
      flex: 1,
      alignItems: "flex-end",
    },

    receiptTitle: {
      color: appTheme.textColor,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "right",
    },

    receiptSubtitle: {
      marginTop: 3,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "right",
    },

    receiptIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "10",
    },

    receiptLine: {
      height: 1,
      backgroundColor: appTheme.borderColor,
      marginHorizontal: 16,
    },

    statementRow: {
      minHeight: 72,
      paddingHorizontal: 16,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 11,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },

    statementIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "0D",
    },

    primaryIcon: {
      color: appTheme.primaryColor,
    },

    rowLabel: {
      flex: 1,
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
    },

    rowValue: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "left",
    },

    totalSeparator: {
      height: 7,
      backgroundColor:
        appTheme.backgroundColor,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: appTheme.borderColor,
    },

    totalRow: {
      padding: 16,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },

    totalIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor,
    },

    totalText: {
      flex: 1,
      alignItems: "flex-end",
    },

    totalLabel: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "right",
    },

    totalHint: {
      marginTop: 2,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "right",
    },

    totalValue: {
      color: appTheme.primaryColor,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "left",
    },

    note: {
      marginTop: 12,
      padding: 13,
      borderRadius: 17,
      backgroundColor:
        appTheme.primaryColor + "08",
      borderWidth: 1,
      borderColor:
        appTheme.primaryColor + "16",
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      gap: 9,
    },

    noteIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        appTheme.primaryColor + "10",
    },

    noteText: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      lineHeight: 17,
      fontWeight: "700",
      textAlign: "right",
    },

    errorBox: {
      marginTop: 12,
      padding: 24,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
      alignItems: "center",
    },

    errorTitle: {
      marginTop: 9,
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "900",
    },

    errorText: {
      marginTop: 4,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      textAlign: "center",
    },
  });
