import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import Screen from "../../components/Screen";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { api } from "../../api/client";
import { useAppTheme } from "../../theme/useAppTheme";

export default function CaptainRegisterVerifyScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const verificationId = String(
    route.params?.verificationId || "",
  );

  const verificationType =
    route.params?.verificationType === "establishment"
      ? "establishment"
      : "captain";

  const gmail = String(route.params?.gmail || "");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function verify() {
    setMessage("");

    const code = otp.trim();

    if (!verificationId) {
      setMessage("معرّف التحقق غير موجود.");
      return;
    }

    if (!code) {
      setMessage("أدخل كود التحقق.");
      return;
    }

    if (!/^\d{4,8}$/.test(code)) {
      setMessage("أدخل كود التحقق بشكل صحيح.");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        verificationType === "establishment"
          ? "/establishment-registration/verify-email"
          : "/captain-registration/verify-email";

      const response = await api.post(
        endpoint,
        {
          verificationId,
          otp: code,
        },
      );

      const successMessage =
        response?.data?.message ||
        "تم تأكيد البريد الإلكتروني بنجاح.";

      if (Platform.OS === "web") {
        setMessage(successMessage);
      } else {
        Alert.alert("تم بنجاح", successMessage);
      }

      navigation.replace("WaitingApproval");
    } catch (error: any) {
      console.error(
        "Captain registration verification error:",
        error,
      );

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "حدث خطأ أثناء تأكيد كود التحقق.";

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            تأكيد البريد الإلكتروني
          </Text>

          <Text style={styles.subtitle}>
            تم إرسال كود التحقق إلى:
          </Text>

          <Text style={styles.gmail}>
            {gmail || "حساب Gmail"}
          </Text>

          <Text style={styles.help}>
            أدخل الكود المرسل إلى بريدك الإلكتروني لإكمال
            طلب تسجيل الكابتن.
          </Text>

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                {message}
              </Text>
            </View>
          ) : null}

          <AppInput
            placeholder="كود التحقق"
            value={otp}
            onChangeText={(value) => {
              setMessage("");
              setOtp(value.replace(/\D/g, ""));
            }}
            keyboardType="number-pad"
            maxLength={8}
          />

          <AppButton
            title="تأكيد الكود"
            onPress={verify}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (
  theme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    container: {
      padding: 20,
      gap: 14,
    },

    title: {
      fontSize: 28,
      fontWeight: "900",
      color: theme.textColor,
      textAlign: "right",
    },

    subtitle: {
      color: theme.secondaryTextColor,
      fontSize: 15,
      textAlign: "right",
      marginTop: 8,
    },

    gmail: {
      color: theme.primaryColor,
      fontSize: 17,
      fontWeight: "900",
      textAlign: "right",
    },

    help: {
      color: theme.secondaryTextColor,
      lineHeight: 23,
      textAlign: "right",
      marginBottom: 8,
    },

    messageBox: {
      backgroundColor: "#FFF1F1",
      borderWidth: 1,
      borderColor: "#F3B4B4",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    messageText: {
      color: "#B42318",
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 22,
      textAlign: "right",
    },
  });
