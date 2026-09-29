import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
import LoadingState from "../../components/LoadingState";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import { useAppTheme } from "../../theme/useAppTheme";
import { useAuthStore } from "../../store/authStore";
import { acceptCaptainOrder } from "../../api/captainOrder";
import { sendEmergencyAlert } from "../../api/captainEmergency";
import {
  cancelOrder,
  getOrder,
  getTimeline,
  sendEmergency,
  updateOrderStatus,
} from "../../api/orders";

const STATUS_ACTIONS: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; status: any } | null
> = {
  assigned: {
    label: "الوصول للمحل",
    icon: "storefront-outline",
    status: "picked_up",
  },
  picked_up: {
    label: "بدء التوصيل",
    icon: "bicycle-outline",
    status: "on_the_way",
  },
  on_the_way: {
    label: "إثبات التسليم",
    icon: "checkmark-circle-outline",
    status: "delivered",
  },
};

export default function OrderDetailsScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const orderId = String(route.params?.orderId || "");

  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const [orderData, timelineData] = await Promise.all([
        getOrder(orderId),
        getTimeline(orderId),
      ]);

      setOrder(orderData);
      setTimeline(timelineData);
    } catch (error: any) {
      if (!silent) {
        Alert.alert(
          "تعذر تحميل الطلب",
          error?.response?.data?.message ||
            "تعذر تحميل تفاصيل الطلب."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();

    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  const status = order?.status;
  const action = STATUS_ACTIONS[status] || null;

  const final = [
    "delivered",
    "cancelled",
    "rejected",
  ].includes(status);

  const customer = useMemo(
    () => ({
      name:
        order?.customerSnapshot?.name ||
        order?.customer?.name ||
        order?.customerName ||
        "—",
      phone:
        order?.customerSnapshot?.phone ||
        order?.customer?.phone ||
        order?.customerPhone ||
        "—",
      address:
        order?.address?.address ||
        order?.deliveryAddress ||
        "—",
    }),
    [order]
  );

  async function acceptCurrentOrder() {
    if (!user?.id) {
      Alert.alert("تعذر قبول الطلب", "حساب الكابتن غير متوفر.");
      return;
    }

    setBusy(true);

    try {
      await acceptCaptainOrder(orderId, user.id);
      await load(true);

      Alert.alert(
        "تم قبول الطلب",
        "تم تعيين الطلب لك بنجاح."
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر قبول الطلب",
        error?.response?.data?.message ||
          "لا يمكن قبول الطلب الآن."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(nextStatus: any) {
    setBusy(true);

    try {
      await updateOrderStatus(orderId, nextStatus);
      await load(true);
    } catch (error: any) {
      Alert.alert(
        "تعذر تحديث الطلب",
        error?.response?.data?.message ||
          "لا يمكن تحديث حالة الطلب."
      );
    } finally {
      setBusy(false);
    }
  }

  async function emergency() {
    try {
      await sendEmergency(
        orderId,
        "الكابتن يحتاج تدخل الإدارة.",
        "high"
      );

      Alert.alert(
        "تم إرسال الطوارئ",
        "تم إرسال التنبيه للإدارة."
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر إرسال الطوارئ",
        error?.response?.data?.message ||
          "تعذر إرسال التنبيه."
      );
    }
  }

  async function cancel() {
    Alert.alert(
      "إلغاء الطلب",
      "هل أنت متأكد من إلغاء هذا الطلب؟",
      [
        { text: "رجوع", style: "cancel" },
        {
          text: "إلغاء الطلب",
          style: "destructive",
          onPress: async () => {
            setBusy(true);

            try {
              await cancelOrder(
                orderId,
                "إلغاء الطلب من تطبيق الكابتن."
              );

              await load(true);
            } catch (error: any) {
              Alert.alert(
                "تعذر الإلغاء",
                error?.response?.data?.message ||
                  "لا يمكن إلغاء الطلب في هذه المرحلة."
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState message="جاري تحميل تفاصيل الطلب..." />
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
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={appTheme.primaryColor}
            colors={[appTheme.primaryColor]}
          />
        }
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="cube-outline"
              size={23}
              color={appTheme.primaryColor}
            />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>تفاصيل الطلب</Text>
            <Text style={styles.title}>
              #{order?.orderNumber || orderId}
            </Text>
          </View>

          <OrderStatusBadge status={status} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>إجمالي الطلب</Text>

          <Text style={styles.heroMoney}>
            {order?.total ??
              order?.subtotal ??
              0}{" "}
            د.ع
          </Text>

          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Ionicons
                name="bicycle-outline"
                size={17}
                color="#CCFBF1"
              />
              <Text style={styles.heroMetaText}>
                توصيل
              </Text>
            </View>

            <View style={styles.heroMetaItem}>
              <Ionicons
                name="cash-outline"
                size={17}
                color="#CCFBF1"
              />
              <Text style={styles.heroMetaText}>
                {order?.deliveryFee ?? 0} د.ع توصيل
              </Text>
            </View>
          </View>
        </View>

        <SectionTitle
          title="بيانات الزبون"
          icon="person-outline"
          appTheme={appTheme}
        />

        <View style={styles.card}>
          <InfoRow
            icon="person-outline"
            label="الاسم"
            value={customer.name}
            appTheme={appTheme}
          />

          <InfoRow
            icon="call-outline"
            label="الهاتف"
            value={customer.phone}
            appTheme={appTheme}
          />

          <InfoRow
            icon="location-outline"
            label="عنوان التوصيل"
            value={customer.address}
            appTheme={appTheme}
            last
          />

          {order?.customerNote && (
            <View style={styles.noteBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={appTheme.warningColor}
              />

              <View style={styles.noteContent}>
                <Text style={styles.noteLabel}>
                  ملاحظات الزبون
                </Text>
                <Text style={styles.noteText}>
                  {order.customerNote}
                </Text>
              </View>
            </View>
          )}
        </View>

        <SectionTitle
          title="سجل الطلب"
          icon="time-outline"
          appTheme={appTheme}
        />

        <View style={styles.card}>
          {timeline?.events?.length ? (
            timeline.events.map((event: any, index: number) => (
              <View
                key={String(event?._id || index)}
                style={styles.event}
              >
                <View style={styles.eventLine}>
                  {index !== timeline.events.length - 1 && (
                    <View style={styles.verticalLine} />
                  )}

                  <View style={styles.eventDot}>
                    <Ionicons
                      name="checkmark"
                      size={11}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <View style={styles.eventBody}>
                  <Text style={styles.eventName}>
                    {event?.message ||
                      event?.type ||
                      "تحديث"}
                  </Text>

                  {!!event?.createdAt && (
                    <Text style={styles.eventDate}>
                      {new Date(
                        event.createdAt
                      ).toLocaleString("ar-IQ")}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInline}>
              لا توجد أحداث مسجلة حتى الآن.
            </Text>
          )}
        </View>

        {!!timeline?.durations && (
          <>
            <SectionTitle
              title="مدة المراحل"
              icon="timer-outline"
              appTheme={appTheme}
            />

            <View style={styles.card}>
              <DurationRow
                title="انتظار الكابتن"
                value={timeline.durations.captain_wait_ms}
                appTheme={appTheme}
              />

              <DurationRow
                title="الوصول للمحل"
                value={timeline.durations.captain_to_shop_ms}
                appTheme={appTheme}
              />

              <DurationRow
                title="انتظار المحل"
                value={timeline.durations.shop_wait_ms}
                appTheme={appTheme}
              />

              <DurationRow
                title="مدة التوصيل"
                value={timeline.durations.delivery_ms}
                appTheme={appTheme}
              />

              <DurationRow
                title="إجمالي الطلب"
                value={timeline.durations.total_ms}
                appTheme={appTheme}
                last
              />
            </View>
          </>
        )}

        {!final && (
          <View style={styles.actions}>
            {status === "pending" && !order?.captainId && (
              <AppButton
                title="قبول الطلب"
                onPress={acceptCurrentOrder}
                loading={busy}
              />
            )}

            {action && status === "assigned" && (
              <AppButton
                title={action.label}
                onPress={() =>
                  navigation.navigate("Pickup", {
                    orderId,
                  })
                }
                loading={busy}
              />
            )}

            {action && status === "picked_up" && (
              <AppButton
                title={action.label}
                onPress={() => changeStatus(action.status)}
                loading={busy}
              />
            )}

            {status === "on_the_way" && (
              <AppButton
                title="إثبات التسليم"
                onPress={() =>
                  navigation.navigate("DeliveryProof", {
                    orderId,
                  })
                }
              />
            )}

            {(status === "assigned" ||
              status === "picked_up") && (
              <AppButton
                title="الحركة النقدية"
                secondary
                onPress={() =>
                  navigation.navigate("Cash", {
                    orderId,
                  })
                }
              />
            )}

            <AppButton
              title="إرسال طوارئ"
              secondary
              onPress={emergency}
            />

            <AppButton
              title="إلغاء الطلب"
              secondary
              onPress={cancel}
              loading={busy}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({
  title,
  icon,
  appTheme,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  const styles = createStyles(appTheme);

  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={appTheme.primaryColor}
        />
      </View>

      <Text style={styles.sectionText}>{title}</Text>
    </View>
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
  const styles = createStyles(appTheme);

  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={appTheme.primaryColor}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function DurationRow({
  title,
  value,
  appTheme,
  last = false,
}: {
  title: string;
  value: number | null | undefined;
  appTheme: ReturnType<typeof useAppTheme>;
  last?: boolean;
}) {
  const styles = createStyles(appTheme);

  let text = "غير متاح";

  if (typeof value === "number") {
    const totalSeconds = Math.floor(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    text = `${minutes} دقيقة ${seconds} ثانية`;
  }

  return (
    <View
      style={[
        styles.durationRow,
        !last && styles.durationBorder,
      ]}
    >
      <Text style={styles.durationTitle}>
        {title}
      </Text>

      <Text style={styles.durationValue}>
        {text}
      </Text>
    </View>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 2,
      paddingBottom: 34,
    },

    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      marginBottom: 18,
    },

    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.primaryColor + "12",
      marginLeft: 11,
    },

    headerContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 11,
      fontWeight: "800",
    },

    title: {
      marginTop: 2,
      color: appTheme.textColor,
      fontSize: 23,
      fontWeight: "900",
    },

    hero: {
      padding: 21,
      borderRadius: 24,
      backgroundColor: appTheme.primaryDarkColor,
      marginBottom: 4,
    },

    heroLabel: {
      color: "#99F6E4",
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
    },

    heroMoney: {
      marginTop: 5,
      color: "#FFFFFF",
      fontSize: 30,
      fontWeight: "900",
      textAlign: "right",
    },

    heroMeta: {
      marginTop: 15,
      flexDirection: "row-reverse",
      gap: 16,
    },

    heroMetaItem: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
    },

    heroMetaText: {
      color: "#CCFBF1",
      fontSize: 11,
      fontWeight: "700",
    },

    sectionTitle: {
      marginTop: 22,
      marginBottom: 9,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 7,
    },

    sectionIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.primaryColor + "12",
    },

    sectionText: {
      color: appTheme.textColor,
      fontSize: 17,
      fontWeight: "900",
    },

    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      backgroundColor: appTheme.cardColor,
      paddingHorizontal: 16,
      paddingVertical: 5,
    },

    infoRow: {
      minHeight: 68,
      flexDirection: "row-reverse",
      alignItems: "center",
    },

    infoBorder: {
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },

    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.primaryColor + "12",
      marginLeft: 11,
    },

    infoContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    infoLabel: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "700",
    },

    infoValue: {
      marginTop: 3,
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
    },

    noteBox: {
      marginVertical: 12,
      padding: 12,
      borderRadius: 14,
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      backgroundColor: appTheme.warningColor + "0D",
    },

    noteContent: {
      flex: 1,
      marginRight: 9,
      alignItems: "flex-end",
    },

    noteLabel: {
      color: appTheme.warningColor,
      fontSize: 11,
      fontWeight: "800",
    },

    noteText: {
      marginTop: 3,
      color: appTheme.textColor,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "right",
    },

    event: {
      minHeight: 65,
      flexDirection: "row-reverse",
    },

    eventLine: {
      width: 30,
      alignItems: "center",
    },

    verticalLine: {
      position: "absolute",
      top: 25,
      bottom: 0,
      width: 1,
      backgroundColor: appTheme.borderColor,
    },

    eventDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: appTheme.primaryColor,
    },

    eventBody: {
      flex: 1,
      paddingRight: 8,
      paddingBottom: 12,
      alignItems: "flex-end",
    },

    eventName: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
    },

    eventDate: {
      marginTop: 3,
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      textAlign: "right",
    },

    emptyInline: {
      paddingVertical: 18,
      color: appTheme.secondaryTextColor,
      textAlign: "center",
    },

    durationRow: {
      minHeight: 52,
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
    },

    durationBorder: {
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },

    durationTitle: {
      color: appTheme.textColor,
      fontSize: 12,
      fontWeight: "700",
    },

    durationValue: {
      color: appTheme.primaryDarkColor,
      fontSize: 12,
      fontWeight: "900",
    },

    actions: {
      marginTop: 22,
      gap: 10,
    },
  });
