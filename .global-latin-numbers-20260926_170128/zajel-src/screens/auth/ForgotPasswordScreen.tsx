import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import Screen from "../../components/Screen";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { api } from "../../api/client";
import { useAppTheme } from "../../theme/useAppTheme";
import { useAuthStore } from "../../store/authStore";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const navigation = useNavigation<any>();

  const role = useAuthStore((s) => s.accountType);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const title =
    role === "captain"
      ? "استعادة كلمة مرور الكابتن"
      : "استعادة كلمة مرور المطعم / المحل";

  async function requestCode() {
    if (!email.trim()) {
      Alert.alert("تنبيه", "أدخل البريد الإلكتروني.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/forgot-password",
        {
          email: email.trim().toLowerCase(),
        },
      );

      setVerificationId(
        String(response.data?.verificationId || ""),
      );

      setStep("otp");

      Alert.alert(
        "تم إرسال الكود",
        "تم إرسال كود التحقق إلى بريدك الإلكتروني.\n\nإذا لم تجده في الوارد، تحقق من Spam / الرسائل غير المرغوب فيها.",
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر إرسال الكود",
        error?.response?.data?.message ||
          "تعذر إرسال كود التحقق.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!otp.trim()) {
      Alert.alert("تنبيه", "أدخل كود التحقق.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/forgot-password/verify",
        {
          verificationId,
          otp: otp.trim(),
        },
      );

      setResetToken(
        String(response.data?.resetToken || ""),
      );

      setStep("password");
    } catch (error: any) {
      Alert.alert(
        "الكود غير صحيح",
        error?.response?.data?.message ||
          "كود التحقق غير صحيح.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 6) {
      Alert.alert(
        "تنبيه",
        "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "تنبيه",
        "كلمتا المرور غير متطابقتين.",
      );
      return;
    }

    setLoading(true);

    try {
      await api.post(
        "/auth/forgot-password/reset",
        {
          verificationId,
          resetToken,
          newPassword,
        },
      );

      setStep("done");
    } catch (error: any) {
      Alert.alert(
        "تعذر تغيير كلمة المرور",
        error?.response?.data?.message ||
          "تعذر تغيير كلمة المرور.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        {step !== "done" ? (
          <>
            <Text style={styles.title}>{title}</Text>

            {step === "email" && (
              <>
                <Text style={styles.subtitle}>
                  أدخل Gmail المرتبط بالحساب لإرسال كود
                  التحقق.
                </Text>

                <View style={styles.form}>
                  <AppInput
                    placeholder="Gmail"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <AppButton
                    title="إرسال كود التحقق"
                    onPress={requestCode}
                    loading={loading}
                  />
                </View>
              </>
            )}

            {step === "otp" && (
              <>
                <Text style={styles.subtitle}>
                  أدخل الكود الذي وصلك على Gmail.
                </Text>

                <View style={styles.form}>
                  <AppInput
                    placeholder="كود التحقق"
                    value={otp}
                    onChangeText={(value) =>
                      setOtp(
                        value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    keyboardType="number-pad"
                  />

                  <AppButton
                    title="تأكيد الكود"
                    onPress={verifyCode}
                    loading={loading}
                  />

                  <Text style={styles.spamNote}>
                    📩 قد تصل الرسالة إلى Spam / الرسائل
                    غير المرغوب فيها.
                  </Text>
                </View>
              </>
            )}

            {step === "password" && (
              <>
                <Text style={styles.subtitle}>
                  أدخل كلمة المرور الجديدة.
                </Text>

                <View style={styles.form}>
                  <AppInput
                    placeholder="كلمة المرور الجديدة"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />

                  <AppInput
                    placeholder="تأكيد كلمة المرور"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />

                  <AppButton
                    title="حفظ كلمة المرور الجديدة"
                    onPress={resetPassword}
                    loading={loading}
                  />
                </View>
              </>
            )}

            <AppButton
              title="العودة لتسجيل الدخول"
              secondary
              onPress={() => navigation.goBack()}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>
              تم تغيير كلمة المرور
            </Text>

            <Text style={styles.subtitle}>
              تم تحديث كلمة المرور بنجاح، ويمكنك الآن تسجيل
              الدخول بالحساب باستخدام كلمة المرور الجديدة.
            </Text>

            <AppButton
              title="العودة لتسجيل الدخول"
              onPress={() => navigation.goBack()}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      gap: 20,
    },

    title: {
      color: appTheme.textColor,
      fontSize: 27,
      fontWeight: "900",
      textAlign: "right",
    },

    subtitle: {
      color: appTheme.textColor,
      fontSize: 14,
      lineHeight: 23,
      textAlign: "right",
    },

    form: {
      gap: 12,
    },

    spamNote: {
      color: appTheme.textColor,
      fontSize: 12,
      lineHeight: 20,
      textAlign: "right",
    },
  });
