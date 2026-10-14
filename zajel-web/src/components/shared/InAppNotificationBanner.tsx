import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

type BannerState = {
  title: string;
  body: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    // عند فتح التطبيق نعرض الإشعار داخل واجهة زاجل بدل
    // بانر النظام الذي قد يظهر خارج مساحة التطبيق.
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

export default function InAppNotificationBanner() {
  const [notification, setNotification] =
    useState<BannerState | null>(null);
  const translateY = useRef(new Animated.Value(-180)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription =
      Notifications.addNotificationReceivedListener(
        (incoming) => {
          const content = incoming.request.content;

          setNotification({
            title: String(content.title || "إشعار جديد"),
            body: String(content.body || ""),
          });

          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();

          timerRef.current = setTimeout(() => {
            Animated.timing(translateY, {
              toValue: -180,
              duration: 220,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                setNotification(null);
              }
            });
          }, 6000);
        },
      );

    return () => {
      subscription.remove();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [translateY]);

  function close() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.timing(translateY, {
      toValue: -180,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setNotification(null));
  }

  if (!notification) {
    return null;
  }

  const topOffset = (StatusBar.currentHeight || 24) + 8;

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        style={[
          styles.wrapper,
          { top: topOffset, transform: [{ translateY }] },
        ]}
      >
        <Pressable
          onPress={close}
          style={({ pressed }) => [
            styles.card,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="إغلاق الإشعار"
        >
          <View style={styles.icon}>
            <Ionicons
              name="notifications"
              size={22}
              color="#E85D04"
            />
          </View>

          <View style={styles.content}>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {notification.title}
            </Text>

            {notification.body ? (
              <Text
                style={styles.body}
                numberOfLines={3}
              >
                {notification.body}
              </Text>
            ) : null}
          </View>

          <Ionicons
            name="close"
            size={18}
            color="#8A5A2E"
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 100000,
    elevation: 100000,
  },

  card: {
    minHeight: 76,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0D9BE",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 12,
  },

  pressed: {
    opacity: 0.88,
  },

  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E3",
    marginLeft: 10,
  },

  content: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    marginLeft: 10,
  },

  title: {
    width: "100%",
    color: "#24150B",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },

  body: {
    width: "100%",
    marginTop: 3,
    color: "#6F5A49",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "right",
  },
});
