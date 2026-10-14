import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Tone = "info" | "error" | "success" | "warning";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  tone?: Tone;
  buttonText?: string;
  onClose: () => void;
}

const config = {
  info: {
    icon: "information-outline" as const,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  error: {
    icon: "alert-circle-outline" as const,
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  success: {
    icon: "check-circle-outline" as const,
    color: "#059669",
    bg: "#ECFDF5",
  },
  warning: {
    icon: "alert-outline" as const,
    color: "#D97706",
    bg: "#FFFBEB",
  },
};

export default function AppMessageModal({
  visible,
  title,
  message,
  tone = "info",
  buttonText = "حسنًا",
  onClose,
}: Props) {
  const current = config[tone];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View
            style={[
              styles.icon,
              { backgroundColor: current.bg },
            ]}
          >
            <MaterialCommunityIcons
              name={current.icon}
              size={30}
              color={current.color}
            />
          </View>

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>
            {message}
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: current.color },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {buttonText}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    backgroundColor: "rgba(20, 14, 10, 0.58)",
  },

  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 24,
    backgroundColor: "#FFFDFC",
    borderWidth: 1,
    borderColor: "#F0D9BE",
    padding: 24,
    alignItems: "center",
    shadowColor: "#24150B",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },

  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    color: "#24150B",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  message: {
    color: "#8A5A2E",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 23,
    textAlign: "center",
    marginTop: 9,
  },

  button: {
    width: "100%",
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
