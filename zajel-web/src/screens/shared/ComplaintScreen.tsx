import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
import { apiPost } from "../../api/request";

export default function ComplaintScreen({
  navigation,
}: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      Alert.alert("تنبيه", "اكتب عنوان المشكلة.");
      return;
    }

    if (!cleanDescription) {
      Alert.alert("تنبيه", "اكتب تفاصيل المشكلة.");
      return;
    }

    try {
      setLoading(true);

      await apiPost("/support-tickets", {
        type: "complaint",
        title: cleanTitle,
        description: cleanDescription,
      });

      Alert.alert(
        "تم إرسال الدعم",
        "تم تسجيل مشكلتك وسيتم الرد سريعًا من الإدارة.",
        [
          {
            text: "حسنًا",
            onPress: () => navigation.goBack(),
          },
        ],
      );

      setTitle("");
      setDescription("");
    } catch (error: any) {
      Alert.alert(
        "تعذر إرسال الطلب",
        error?.response?.data?.message ||
          error?.message ||
          "حدث خطأ أثناء إرسال المشكلة.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            نظام الدعم السريع
          </Text>

          <Text style={styles.subtitle}>
            اكتب مشكلتك وسيتم الرد سريعًا
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>
            عنوان المشكلة
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="اكتب عنوان المشكلة"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            editable={!loading}
          />

          <Text style={styles.label}>
            تفاصيل المشكلة
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="اكتب تفاصيل المشكلة هنا"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.textarea,
            ]}
            editable={!loading}
          />

          <AppButton
            title={
              loading
                ? "جاري الإرسال..."
                : "إرسال"
            }
            onPress={submit}
            disabled={loading}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    fontSize: 14,
  },

  textarea: {
    minHeight: 150,
  },
});
