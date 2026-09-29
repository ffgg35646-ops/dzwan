
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createComplaint } from "../../api/complaintsRuntime";
import AppButton from "../../components/AppButton";
import Screen from "../../components/Screen";

export default function CreateComplaintScreen({
  route,
  navigation,
}: any) {
  const orderId = route?.params?.orderId;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    try {
      setSending(true);

      await createComplaint({
        type: "order",
        orderId,
        title,
        description,
      });

      Alert.alert(
        "تم إرسال الشكوى",
        "تم تسجيل الشكوى وسيتم مراجعتها من الإدارة."
      );

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        "تعذر إرسال الشكوى",
        error?.message ?? "حدث خطأ."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>تقديم شكوى</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="عنوان الشكوى"
          style={styles.input}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="تفاصيل الشكوى"
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.textarea]}
        />

        <AppButton
          title={
            sending
              ? "جاري الإرسال..."
              : "إرسال الشكوى"
          }
          onPress={submit}
          disabled={sending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  textarea: {
    minHeight: 140,
  },
});
