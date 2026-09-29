import { useAppTheme } from "../../theme/useAppTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
export default function WaitingApprovalScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const navigation = useNavigation<any>();

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>الحساب قيد المراجعة</Text>

        <Text style={styles.text}>
          تم إرسال بيانات الحساب إلى الإدارة.
          سيتم تفعيل الوظائف التشغيلية بعد الموافقة.
        </Text>

        <AppButton
          title="العودة لتسجيل الدخول"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </Screen>
  );
}

const createStyles = (appTheme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 14,
  },
  icon: {
    fontSize: 54,
  },
  title: {
    color: appTheme.textColor,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  text: {
    color: appTheme.secondaryTextColor,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "center",
    marginBottom: 10,
  },
});
