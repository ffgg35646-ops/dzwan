import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_APP_URL ||
  "https://zajel-web-debug.vercel.app/";

export default function WebVersionLink() {
  // The web build is already the web version; avoid linking back to itself.
  if (Platform.OS === "web") return null;

  const openWebVersion = async () => {
    try {
      await Linking.openURL(WEB_APP_URL);
    } catch {
      Alert.alert(
        "تعذر فتح نسخة الويب",
        "تأكد من اتصال الإنترنت ومن إعداد رابط الويب."
      );
    }
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="فتح نسخة الويب"
      onPress={openWebVersion}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name="web"
          size={22}
          color="#FFFFFF"
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>فتح نسخة الويب</Text>
        <Text style={styles.subtitle}>
          استخدم زاجل من المتصفح
        </Text>
      </View>
      <MaterialCommunityIcons
        name="open-in-new"
        size={18}
        color="#B4460A"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 62,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#F3C79D",
    backgroundColor: "#FFF4E8",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 11,
    marginTop: 12,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E5501C",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
    alignItems: "flex-end",
  },
  title: {
    color: "#4A1B0C",
    fontSize: 14,
    fontWeight: "900",
  },
  subtitle: {
    color: "#8A5A2E",
    fontSize: 11,
    fontWeight: "600",
  },
});
