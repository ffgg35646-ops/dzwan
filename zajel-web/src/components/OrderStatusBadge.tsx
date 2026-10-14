import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

const names: Record<string, string> = {
  pending: "بانتظار كابتن",
  confirmed: "تم التأكيد",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تم تعيين كابتن",
  picked_up: "تم الاستلام",
  on_the_way: "بالطريق للزبون",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

export default function OrderStatusBadge({
  status,
}: {
  status?: string;
}) {
  const appTheme = useAppTheme();

  const tone: Record<string, string> = {
    pending: appTheme.primaryColor,
    confirmed: appTheme.secondaryColor,
    preparing: appTheme.secondaryColor,
    ready_for_pickup: appTheme.primaryColor,
    assigned: appTheme.primaryDarkColor,
    picked_up: appTheme.secondaryColor,
    on_the_way: appTheme.primaryDarkColor,
    delivered: appTheme.successColor,
    cancelled: appTheme.dangerColor,
    rejected: appTheme.dangerColor,
  };

  const currentStatus = status || "";
  const color =
    tone[currentStatus] || appTheme.textColor;

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor:
            tone[currentStatus] || appTheme.borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color,
          },
        ]}
      >
        {names[currentStatus] || status || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
  },
});
