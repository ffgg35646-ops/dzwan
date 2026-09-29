import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ShopQuickSupport({
  navigation,
}: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => navigation?.navigate("QuickSupport")}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="نظام الدعم السريع"
    >
      <View style={styles.iconBox}>
        <Ionicons
          name="headset-outline"
          size={24}
          color="#0F172A"
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>نظام الدعم السريع</Text>
        <Text style={styles.subtitle}>
          اكتب مشكلتك وسيتم الرد سريعًا
        </Text>
      </View>

      <Ionicons
        name="chevron-back-outline"
        size={20}
        color="#64748B"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },
});
