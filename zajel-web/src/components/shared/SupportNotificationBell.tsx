import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiGet } from "../../api/request";

export default function SupportNotificationBell() {
  const navigation = useNavigation<any>();
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const response =
        await apiGet(
          "/support-tickets/my/unread-count",
        );

      const value = Number(
        response?.count ?? 0,
      );

      setCount(
        Number.isFinite(value) && value > 0
          ? value
          : 0,
      );
    } catch (error) {
      console.error(
        "Support notification error:",
        error,
      );

      setCount(0);
    }
  }, []);

  useEffect(() => {
    void loadCount();

    const timer = setInterval(
      () => void loadCount(),
      10000,
    );

    return () => clearInterval(timer);
  }, [loadCount]);

  return (
    <Pressable
      onPress={() =>
        navigation.navigate(
          "SupportQuickSupport",
        )
      }
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="الدعم"
    >
      <Ionicons
        name="notifications-outline"
        size={22}
        color="#0F172A"
      />

      {count > 0 ? (
        <Text style={styles.badge}>
          {count > 99 ? "99+" : count}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  pressed: {
    opacity: 0.7,
  },

  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
