import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import { getMyEstablishmentReport } from "../../api/shopOrders";
import { useAppTheme } from "../../theme/useAppTheme";

type ReportRow = {
  id: string;
  orderNumber?: string;
  createdAt?: string;
  status?: string;
  captain?: {
    id?: string;
    name?: string;
    phone?: string | null;
  } | null;
  subtotal?: number;
  total?: number;
  deliveryFee?: number;
};

type ReportData = {
  orders?: {
    total?: number;
    pending?: number;
    active?: number;
    delivered?: number;
    cancelled?: number;
  };
  revenue?: {
    subtotal?: number;
    deliveryFees?: number;
    gross?: number;
    averageOrderValue?: number;
  };
  rows?: ReportRow[];
};

export default function ShopReportsScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const [report, setReport] =
    useState<ReportData | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const buildDate = (
    value: string,
    endOfDay = false,
  ) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return undefined;
    }

    return new Date(
      `${trimmed}T${
        endOfDay
          ? "23:59:59.999"
          : "00:00:00.000"
      }Z`,
    ).toISOString();
  };

  const load = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const from = buildDate(fromDate);
        const to = buildDate(toDate, true);

        const params: Record<string, string> = {};

        if (from) {
          params.from = from;
        }

        if (to) {
          params.to = to;
        }

        const response = await getMyEstablishmentReport(params);

        setReport(
          response?.data?.data ??
          response?.data ??
          response ??
          null,
        );
      } catch (err: any) {
        setReport(null);
        setError(
          err?.response?.data?.message ??
            "تعذر تحميل التقرير.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(false);
  }, [load]);

  const formatMoney = (value: any) =>
    Number(value || 0).toLocaleString("ar-IQ");

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "confirmed":
        return "تم التأكيد";
      case "preparing":
        return "جاري التحضير";
      case "ready_for_pickup":
        return "جاهز للاستلام";
      case "assigned":
        return "تم إسناده";
      case "picked_up":
        return "تم الاستلام";
      case "on_the_way":
        return "في الطريق";
      case "delivered":
      case "completed":
        return "مكتمل";
      case "cancelled":
        return "ملغي";
      default:
        return "غير محدد";
    }
  };

  const getStatusColor = (status: string) => {
    if (
      status === "delivered" ||
      status === "completed"
    ) {
      return appTheme.successColor;
    }

    if (status === "cancelled") {
      return appTheme.dangerColor;
    }

    return appTheme.infoColor;
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("ar-IQ");
  };

  const formatTime = (value?: string) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleTimeString("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rows = useMemo(() => {
    const source = Array.isArray(report?.rows)
      ? report!.rows!
      : [];

    const query = search.trim().toLowerCase();

    if (!query) {
      return source;
    }

    return source.filter((row) => {
      const orderNumber =
        String(row.orderNumber ?? "").toLowerCase();

      const captainName =
        String(
          row.captain?.name ?? "",
        ).toLowerCase();

      return (
        orderNumber.includes(query) ||
        captainName.includes(query)
      );
    });
  }, [report, search]);

  const orders = report?.orders ?? {};
  const revenue = report?.revenue ?? {};

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={appTheme.primaryColor}
          />
          <Text style={styles.loadingText}>
            جاري تحميل التقارير...
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
            onRefresh={onRefresh}
            tintColor={appTheme.primaryColor}
            colors={[appTheme.primaryColor]}
          />
        }
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              تقارير المنشأة
            </Text>

            <Text style={styles.title}>
              التقارير
            </Text>

            <Text style={styles.subtitle}>
              جميع طلبات المحل أو المطعم والإحصائيات
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="stats-chart-outline"
              size={25}
              color={appTheme.primaryColor}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.filtersCard}>
          <Text style={styles.sectionTitle}>
            البحث والفلترة
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث برقم الطلب أو اسم الكابتن"
            placeholderTextColor="#999"
            style={styles.input}
          />

          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>
                من تاريخ
              </Text>

              <TextInput
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
            </View>

            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>
                إلى تاريخ
              </Text>

              <TextInput
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
            </View>
          </View>

          <Pressable
            onPress={() => load()}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  appTheme.primaryColor,
              },
            ]}
          >
            <Text style={styles.filterButtonText}>
              تطبيق الفلترة
            </Text>
          </Pressable>
        </View>

        <View style={styles.mainKpi}>
          <Text style={styles.kpiLabel}>
            إجمالي الطلبات
          </Text>

          <Text style={styles.kpiValue}>
            {orders.total ?? 0}
          </Text>

          <Text style={styles.kpiHint}>
            جميع الطلبات ضمن الفترة المحددة
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <Metric
            title="مكتملة"
            value={orders.delivered ?? 0}
            icon="checkmark-circle-outline"
            color={appTheme.successColor}
            styles={styles}
          />

          <Metric
            title="ملغاة"
            value={orders.cancelled ?? 0}
            icon="close-circle-outline"
            color={appTheme.dangerColor}
            styles={styles}
          />

          <Metric
            title="نشطة"
            value={orders.active ?? 0}
            icon="time-outline"
            color={appTheme.warningColor}
            styles={styles}
          />

          <Metric
            title="أجرة التوصيل"
            value={`${formatMoney(
              revenue.deliveryFees,
            )} د.ع`}
            icon="bicycle-outline"
            color={appTheme.primaryColor}
            styles={styles}
            compact
          />

          <Metric
            title="إجمالي قيمة الطلبات"
            value={`${formatMoney(
              revenue.gross,
            )} د.ع`}
            icon="cash-outline"
            color={appTheme.primaryColor}
            styles={styles}
            compact
          />

          <Metric
            title="متوسط الطلب"
            value={`${formatMoney(
              revenue.averageOrderValue,
            )} د.ع`}
            icon="calculator-outline"
            color={appTheme.infoColor}
            styles={styles}
            compact
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            جميع الطلبات
          </Text>

          <Text style={styles.sectionCount}>
            {rows.length} طلب
          </Text>
        </View>

        <View style={styles.tableCard}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={38}
                color={appTheme.primaryColor}
              />
              <Text style={styles.emptyTitle}>
                لا توجد طلبات
              </Text>
              <Text style={styles.emptyText}>
                غيّر الفترة أو عبارة البحث.
              </Text>
            </View>
          ) : (
            rows.map((row, index) => {
              const status = String(
                row.status ?? "",
              );

              return (
                <View
                  key={row.id}
                  style={[
                    styles.orderCard,
                    index === rows.length - 1 &&
                      styles.lastOrderCard,
                  ]}
                >
                  <View style={styles.orderTop}>
                    <Text style={styles.orderNumber}>
                      #{row.orderNumber ?? "—"}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(status),
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <Detail
                      label="تاريخ الطلب"
                      value={formatDate(
                        row.createdAt,
                      )}
                      styles={styles}
                    />

                    <Detail
                      label="وقت الطلب"
                      value={formatTime(
                        row.createdAt,
                      )}
                      styles={styles}
                    />

                    <Detail
                      label="الكابتن"
                      value={
                        row.captain?.name ?? "لم يتم التعيين"
                      }
                      styles={styles}
                    />

                    <Detail
                      label="قيمة الطلب"
                      value={`${formatMoney(
                        row.total,
                      )} د.ع`}
                      styles={styles}
                    />

                    <Detail
                      label="أجرة التوصيل"
                      value={`${formatMoney(
                        row.deliveryFee,
                      )} د.ع`}
                      styles={styles}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({
  title,
  value,
  icon,
  color,
  styles,
  compact = false,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  styles: ReturnType<typeof createStyles>;
  compact?: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons
        name={icon}
        size={22}
        color={color}
      />

      <Text style={styles.metricTitle}>
        {title}
      </Text>

      <Text
        style={[
          styles.metricValue,
          compact && styles.metricValueCompact,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Detail({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(appTheme: any) {
  return StyleSheet.create({
    container: {
      padding: 16,
      paddingBottom: 40,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      color: appTheme.textColor,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerText: {
      flex: 1,
    },
    eyebrow: {
      fontSize: 12,
      color: appTheme.primaryColor,
      marginBottom: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: appTheme.textColor,
    },
    subtitle: {
      marginTop: 5,
      color: appTheme.mutedTextColor,
      fontSize: 13,
    },
    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.cardColor,
    },
    errorBox: {
      padding: 12,
      borderRadius: 14,
      backgroundColor: "#FDECEC",
      marginBottom: 14,
    },
    errorText: {
      color: appTheme.dangerColor,
      textAlign: "right",
    },
    filtersCard: {
      backgroundColor: appTheme.cardColor,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: appTheme.textColor,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: appTheme.textColor,
      backgroundColor: appTheme.backgroundColor,
      marginBottom: 10,
      textAlign: "right",
    },
    filterRow: {
      flexDirection: "row",
      gap: 10,
    },
    filterField: {
      flex: 1,
    },
    filterLabel: {
      fontSize: 12,
      color: appTheme.mutedTextColor,
      marginBottom: 6,
      textAlign: "right",
    },
    filterButton: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    filterButtonText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },
    mainKpi: {
      backgroundColor: appTheme.primaryColor,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
    },
    kpiLabel: {
      color: "#FFFFFF",
      opacity: 0.9,
      fontSize: 14,
    },
    kpiValue: {
      color: "#FFFFFF",
      fontSize: 40,
      fontWeight: "900",
      marginTop: 4,
    },
    kpiHint: {
      color: "#FFFFFF",
      opacity: 0.9,
      marginTop: 2,
    },
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 20,
    },
    metricCard: {
      width: "31%",
      minWidth: 105,
      flexGrow: 1,
      backgroundColor: appTheme.cardColor,
      borderRadius: 16,
      padding: 14,
    },
    metricTitle: {
      color: appTheme.mutedTextColor,
      fontSize: 12,
      marginTop: 8,
    },
    metricValue: {
      color: appTheme.textColor,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 5,
    },
    metricValueCompact: {
      fontSize: 14,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    sectionCount: {
      color: appTheme.mutedTextColor,
      fontSize: 12,
    },
    tableCard: {
      backgroundColor: appTheme.cardColor,
      borderRadius: 18,
      overflow: "hidden",
    },
    orderCard: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },
    lastOrderCard: {
      borderBottomWidth: 0,
    },
    orderTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    orderNumber: {
      fontSize: 16,
      fontWeight: "900",
      color: appTheme.textColor,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },
    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 12,
    },
    detailItem: {
      width: "50%",
      paddingVertical: 7,
      paddingHorizontal: 4,
    },
    detailLabel: {
      color: appTheme.mutedTextColor,
      fontSize: 11,
      marginBottom: 3,
    },
    detailValue: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "700",
    },
    empty: {
      padding: 30,
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: appTheme.textColor,
      marginTop: 10,
    },
    emptyText: {
      fontSize: 13,
      color: appTheme.mutedTextColor,
      marginTop: 5,
      textAlign: "center",
    },
  });
}
