
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";

export default function SupportScreen() {
  function openWhatsApp() {
    Linking.openURL("https://wa.me/");
  }

  function callSupport() {
    Linking.openURL("tel:");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        الدعم والمساعدة
      </Text>

      <Text style={styles.text}>
        إذا واجهت مشكلة أثناء استخدام التطبيق يمكنك التواصل مع فريق الدعم.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={openWhatsApp}
      >
        <Text style={styles.buttonText}>
          التواصل عبر واتساب
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={callSupport}
      >
        <Text style={styles.buttonText}>
          الاتصال بالدعم
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },

  text: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#0F766E",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
});
