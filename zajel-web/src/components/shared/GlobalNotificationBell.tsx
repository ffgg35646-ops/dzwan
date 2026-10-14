import React from "react";
import { StyleSheet, View } from "react-native";
import NotificationBell from "./NotificationBell";

export default function GlobalNotificationBell() {
  return (
    <View
      pointerEvents="box-none"
      style={styles.layer}
    >
      <View style={styles.glass}>
        <NotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 10,
    right: 10,
    left: "auto",
    zIndex: 99999,
    elevation: 99999,
    width: 54,
    height: 54,
    overflow: "visible",
  },

  glass: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },
});
