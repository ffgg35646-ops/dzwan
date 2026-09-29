import { useAppTheme } from "../../theme/useAppTheme";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";

import Screen from "../../components/Screen";
import LoadingState from "../../components/LoadingState";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import AppButton from "../../components/AppButton";
import {
  getOrder,
  getTimeline,
} from "../../api/orders";

export default function OrderTrackingScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const orderId = String(route.params?.orderId || "");

  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const [orderResponse, timelineResponse] =
          await Promise.all([
            getOrder(orderId),
            getTimeline(orderId),
          ]);

        setOrder(
          orderResponse?.data ??
            orderResponse?.order ??
            orderResponse
        );

        setTimeline(
          timelineResponse?.data ??
            timelineResponse?.timeline ??
            timelineResponse
        );
      } catch (error: any) {
        if (!silent) {
          Alert.alert(
            "تعذر تحميل الطلب",
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              "تعذر تحميل حالة الطلب."
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    load();

    const timer = setInterval(() => {
      load(true);
    }, 10000);

    return () => clearInterval(timer);
  }, [load]);

  function handleRefresh() {
    setRefreshing(true);
    load(true);
  }

  function openCaptainRating() {
    const captainId =
      route.params?.captainId ??
      order?.captainId ??
      order?.captain?._id ??
      order?.captain?.id;

    if (!captainId) {
      Alert.alert(
        "التقييم",
        "لا يوجد كابتن مرتبط بهذا الطلب."
      );
      return;
    }

    navigation.navigate("RateCaptain", {
      orderId:
        order?._id ??
        order?.id ??
        orderId,
      captainId,
    });
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState message="جاري تحميل حالة الطلب..." />
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>!</Text>
          </View>

          <Text style={styles.emptyTitle}>
            تعذر العثور على الطلب
          </Text>

          <Text style={styles.emptyText}>
            لم نتمكن من تحميل بيانات هذا الطلب.
          </Text>

          <AppButton
            title="إعادة المحاولة"
            onPress={() => load()}
          />
        </View>
      </Screen>
    );
  }

  const events = Array.isArray(timeline?.events)
    ? timeline.events
    : Array.isArray(timeline)
      ? timeline
      : [];

  const status = order?.status;
  const isDelivered = status === "delivered";

  const subtotal = Number(order?.subtotal ?? 0);
  const deliveryFee = Number(order?.deliveryFee ?? 0);

  const total = Number(
    order?.total ??
      subtotal + deliveryFee
  );

  const orderNumber =
    order?.orderNumber || orderId;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={appTheme.primaryColor}
            colors={[appTheme.primaryColor]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.trackingIcon}>
              <Text style={styles.trackingIconText}>
                ↗
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.eyebrow}>
                التوصيل
              </Text>

              <Text style={styles.title}>
                تتبع الطلب
              </Text>

              <Text style={styles.orderNumber}>
                #{orderNumber}
              </Text>
            </View>
          </View>

          <View style={styles.statusBar}>
            <OrderStatusBadge status={status} />

            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                مباشر
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>
              الحالة الحالية
            </Text>

            <View style={styles.heroStatusIcon}>
              <Text style={styles.heroStatusIconText}>
                ✓
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            {getStatusTitle(status)}
          </Text>

          <Text style={styles.heroDescription}>
            {getStatusDescription(status)}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>
                01
              </Text>
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                ملخص الطلب
              </Text>

              <Text style={styles.sectionSubtitle}>
                التفاصيل المالية
              </Text>
            </View>
          </View>

          <View style={styles.summary}>
            <SummaryRow
              label="قيمة الطلب"
              value={`${subtotal.toLocaleString("ar-IQ")} د.ع`}
              styles={styles}
              appTheme={appTheme}
            />

            <SummaryRow
              label="أجرة التوصيل"
              value={`${deliveryFee.toLocaleString("ar-IQ")} د.ع`}
              styles={styles}
              appTheme={appTheme}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>
                {total.toLocaleString("ar-IQ")} د.ع
              </Text>

              <Text style={styles.totalLabel}>
                الإجمالي
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>
                02
              </Text>
            </View>

            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                رحلة الطلب
              </Text>

              <Text style={styles.sectionSubtitle}>
                آخر تحديثات الطلب
              </Text>
            </View>
          </View>

          {events.length === 0 ? (
            <View style={styles.noEvents}>
              <Text style={styles.noEventsText}>
                لا توجد تحديثات مسجلة حتى الآن.
              </Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {events.map(
                (event: any, index: number) => {
                  const last =
                    index === events.length - 1;

                  return (
                    <View
                      key={String(
                        event?._id ??
                          event?.id ??
                          index
                      )}
                      style={styles.timelineItem}
                    >
                      <View style={styles.timelineRail}>
                        <View
                          style={[
                            styles.timelineDot,
                            index === 0 &&
                              styles.timelineDotActive,
                          ]}
                        />

                        {!last && (
                          <View
                            style={styles.timelineLine}
                          />
                        )}
                      </View>

                      <View
                        style={[
                          styles.eventBody,
                          !last &&
                            styles.eventBodySpacing,
                        ]}
                      >
                        <Text style={styles.eventName}>
                          {event?.message ||
                            event?.type ||
                            "تحديث"}
                        </Text>

                        <Text style={styles.date}>
                          {event?.createdAt
                            ? new Date(
                                event.createdAt
                              ).toLocaleString(
                                "ar-IQ"
                              )
                            : "وقت غير متوفر"}
                        </Text>
                      </View>
                    </View>
                  );
                }
              )}
            </View>
          )}
        </View>

        {timeline?.durations && (
          <View style={styles.durationCard}>
            <View style={styles.durationIcon}>
              <Text style={styles.durationIconText}>
                ⏱
              </Text>
            </View>

            <View style={styles.durationContent}>
              <Text style={styles.durationTitle}>
                مدة الطلب
              </Text>

              <Text style={styles.durationValue}>
                {formatDuration(
                  timeline.durations.total_ms
                )}
              </Text>
            </View>
          </View>
        )}

        {isDelivered && (
          <View style={styles.ratingCard}>
            <View style={styles.ratingIcon}>
              <Text style={styles.ratingIconText}>
                ★
              </Text>
            </View>

            <View style={styles.ratingContent}>
              <Text style={styles.ratingTitle}>
                تم توصيل طلبك بنجاح
              </Text>

              <Text style={styles.ratingText}>
                شاركنا رأيك في تجربة التوصيل.
              </Text>
            </View>

            <AppButton
              title="تقييم الكابتن"
              onPress={openCaptainRating}
            />
          </View>
        )}

        <AppButton
          title="تحديث حالة الطلب"
          onPress={handleRefresh}
          loading={refreshing}
        />

        <Text style={styles.footerHint}>
          يتم تحديث حالة الطلب تلقائيًا كل 10 ثوانٍ.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  styles,
  appTheme,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryValue}>
        {value}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

function formatDuration(
  value: number | null | undefined
) {
  if (typeof value !== "number") {
    return "غير متاح";
  }

  const totalSeconds = Math.max(
    0,
    Math.floor(value / 1000)
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours} ساعة ${minutes} دقيقة`;
  }

  return `${minutes} دقيقة ${seconds} ثانية`;
}

function getStatusTitle(status: string) {
  switch (status) {
    case "pending":
      return "بانتظار تأكيد الطلب";

    case "confirmed":
      return "تم تأكيد الطلب";

    case "preparing":
      return "جاري تجهيز الطلب";

    case "ready_for_pickup":
      return "الطلب جاهز للاستلام";

    case "assigned":
      return "تم تعيين كابتن";

    case "picked_up":
      return "تم استلام الطلب";

    case "on_the_way":
      return "الطلب في الطريق";

    case "delivered":
      return "تم توصيل الطلب";

    case "cancelled":
      return "تم إلغاء الطلب";

    case "rejected":
      return "تم رفض الطلب";

    default:
      return "جاري متابعة الطلب";
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "pending":
      return "سيتم تحديث الحالة فور اتخاذ الإجراء التالي.";

    case "confirmed":
      return "تم قبول الطلب وسيبدأ التجهيز.";

    case "preparing":
      return "يتم تجهيز الطلب حاليًا.";

    case "ready_for_pickup":
      return "الطلب جاهز ليتم استلامه من الكابتن.";

    case "assigned":
      return "تم ربط الطلب بأحد الكباتن.";

    case "picked_up":
      return "الكابتن استلم الطلب ويقوم بتنفيذ التوصيل.";

    case "on_the_way":
      return "الكابتن في طريقه إلى عنوان الزبون.";

    case "delivered":
      return "اكتملت عملية التوصيل بنجاح.";

    case "cancelled":
      return "تم إلغاء عملية التوصيل.";

    case "rejected":
      return "تم رفض الطلب.";

    default:
      return "نتابع حالة الطلب لحظة بلحظة.";
  }
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>
) =>
  StyleSheet.create({
    container: {
      paddingBottom: 38,
      gap: 16,
    },

    header: {
      gap: 15,
    },

    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },

    trackingIcon: {
      width: 54,
      height: 54,
      borderRadius: 17,
      backgroundColor: appTheme.primaryColor,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: appTheme.primaryColor,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 5,
    },

    trackingIconText: {
      color: "#FFFFFF",
      fontSize: 27,
      fontWeight: "900",
    },

    headerInfo: {
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
      fontSize: 27,
      fontWeight: "900",
      textAlign: "right",
    },

    orderNumber: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 2,
      textAlign: "right",
    },

    statusBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    live: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 5,
      backgroundColor: appTheme.successColor,
    },

    liveText: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "800",
    },

    heroCard: {
      backgroundColor: appTheme.primaryColor,
      borderRadius: 23,
      padding: 20,
      shadowColor: appTheme.primaryColor,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 5,
    },

    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    heroLabel: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 12,
      fontWeight: "800",
    },

    heroStatusIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroStatusIconText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
    },

    heroTitle: {
      color: "#FFFFFF",
      fontSize: 23,
      fontWeight: "900",
      textAlign: "right",
      marginTop: 14,
    },

    heroDescription: {
      color: "rgba(255,255,255,0.75)",
      fontSize: 12,
      lineHeight: 19,
      textAlign: "right",
      marginTop: 5,
    },

    card: {
      backgroundColor: appTheme.cardColor,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      padding: 16,
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.045,
      shadowRadius: 10,
      elevation: 2,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        appTheme.secondaryColor + "14",
      alignItems: "center",
      justifyContent: "center",
    },

    sectionIconText: {
      color: appTheme.primaryColor,
      fontSize: 11,
      fontWeight: "900",
    },

    sectionHeaderContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    sectionTitle: {
      color: appTheme.textColor,
      fontSize: 16,
      fontWeight: "900",
      textAlign: "right",
    },

    sectionSubtitle: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      marginTop: 2,
      textAlign: "right",
    },

    summary: {
      marginTop: 12,
    },

    summaryRow: {
      minHeight: 43,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: appTheme.borderColor,
    },

    summaryLabel: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "700",
    },

    summaryValue: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "800",
    },

    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 13,
    },

    totalLabel: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "900",
    },

    totalValue: {
      color: appTheme.primaryColor,
      fontSize: 18,
      fontWeight: "900",
    },

    timeline: {
      marginTop: 15,
    },

    timelineItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },

    timelineRail: {
      width: 15,
      alignItems: "center",
    },

    timelineDot: {
      width: 9,
      height: 9,
      borderRadius: 6,
      backgroundColor: appTheme.borderColor,
      marginTop: 5,
    },

    timelineDotActive: {
      width: 11,
      height: 11,
      backgroundColor: appTheme.primaryColor,
      shadowColor: appTheme.primaryColor,
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 2,
    },

    timelineLine: {
      width: 1,
      flex: 1,
      minHeight: 42,
      backgroundColor: appTheme.borderColor,
      marginTop: 4,
    },

    eventBody: {
      flex: 1,
      alignItems: "flex-end",
    },

    eventBodySpacing: {
      minHeight: 58,
    },

    eventName: {
      color: appTheme.textColor,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "800",
      textAlign: "right",
    },

    date: {
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      marginTop: 3,
      textAlign: "right",
    },

    noEvents: {
      marginTop: 14,
      backgroundColor: appTheme.backgroundColor,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
    },

    noEventsText: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
    },

    durationCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: appTheme.cardColor,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      padding: 16,
    },

    durationIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        appTheme.infoColor + "12",
      alignItems: "center",
      justifyContent: "center",
    },

    durationIconText: {
      color: appTheme.infoColor,
      fontSize: 19,
    },

    durationContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    durationTitle: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "700",
    },

    durationValue: {
      color: appTheme.textColor,
      fontSize: 17,
      fontWeight: "900",
      marginTop: 2,
    },

    ratingCard: {
      backgroundColor:
        appTheme.warningColor + "10",
      borderWidth: 1,
      borderColor:
        appTheme.warningColor + "30",
      borderRadius: 20,
      padding: 16,
      gap: 12,
    },

    ratingIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor: appTheme.warningColor,
      alignItems: "center",
      justifyContent: "center",
    },

    ratingIconText: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "900",
    },

    ratingContent: {
      alignItems: "flex-end",
    },

    ratingTitle: {
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
    },

    ratingText: {
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 3,
      textAlign: "right",
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 25,
      gap: 12,
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor:
        appTheme.dangerColor + "12",
      alignItems: "center",
      justifyContent: "center",
    },

    emptyIconText: {
      color: appTheme.dangerColor,
      fontSize: 25,
      fontWeight: "900",
    },

    emptyTitle: {
      color: appTheme.textColor,
      fontSize: 19,
      fontWeight: "900",
      textAlign: "center",
    },

    emptyText: {
      color: appTheme.secondaryTextColor,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 8,
    },

    footerHint: {
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      textAlign: "center",
      marginTop: -5,
    },
  });
