import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { useAppTheme } from "../../theme/useAppTheme";
import { useAuthStore } from "../../store/authStore";
import { recordCash } from "../../api/captainOrder";

export default function CashScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const route = useRoute<any>();
  const user = useAuthStore((s) => s.user);

  const orderId = String(route.params?.orderId || "");

  // قيمة الطلب القادمة من تفاصيل الطلب
  const orderTotal = Number(
    route.params?.orderTotal ?? 0
  );

  // أجرة التوصيل القادمة من تفاصيل الطلب
  const orderDeliveryFee = Number(
    route.params?.deliveryFee ?? 0
  );

  // المبلغ الذي سيدفعه الكابتن للمحل
  const [paid, setPaid] = useState(
    Number.isFinite(orderTotal)
      ? String(orderTotal)
      : ""
  );

  // المبلغ الذي سيحصله الكابتن من الزبون
  const [collected, setCollected] = useState(
    Number.isFinite(orderTotal + orderDeliveryFee)
      ? String(orderTotal + orderDeliveryFee)
      : ""
  );

  // أجرة التوصيل
  const [deliveryFee, setDeliveryFee] = useState(
    Number.isFinite(orderDeliveryFee)
      ? String(orderDeliveryFee)
      : ""
  );
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user?.id) return;

    const paidValue = Number(paid);
    const collectedValue = Number(collected);
    const feeValue = Number(deliveryFee);

    if (
      !Number.isFinite(paidValue) ||
      !Number.isFinite(collectedValue) ||
      !Number.isFinite(feeValue) ||
      paidValue < 0 ||
      collectedValue < 0 ||
      feeValue < 0
    ) {
      Alert.alert(
        "بيانات غير صحيحة",
        "تأكد من إدخال المبالغ بشكل صحيح."
      );
      return;
    }

    setBusy(true);

    try {
      await recordCash(orderId, user.id, {
        paidToEstablishment: paidValue,
        collectedFromCustomer: collectedValue,
        deliveryFee: feeValue,
      });

      Alert.alert(
        "تم التسجيل",
        "تم حفظ الحركة النقدية بنجاح."
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر حفظ الحركة",
        error?.response?.data?.message ||
          "تعذر تسجيل الحركة النقدية."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="cash-outline"
              size={25}
              color={appTheme.primaryColor}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>زاجل ديلفري</Text>
            <Text style={styles.title}>الحركة النقدية</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="wallet-outline"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              العملية النقدية
            </Text>

            <Text style={styles.heroText}>
              يدفع الكابتن قيمة الطلب للمحل، ثم يحصل من الزبون
              قيمة الطلب مع أجرة التوصيل.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>تفاصيل الحركة</Text>
          <Text style={styles.sectionHint}>بالدينار العراقي</Text>
        </View>

        <View style={styles.card}>
          <MoneyInput
            icon="storefront-outline"
            label="المبلغ المدفوع للمحل"
            placeholder="0"
            value={paid}
            onChangeText={setPaid}
            appTheme={appTheme}
          />

          <MoneyInput
            icon="person-outline"
            label="المبلغ المستلم من الزبون"
            placeholder="0"
            value={collected}
            onChangeText={setCollected}
            appTheme={appTheme}
          />

          <MoneyInput
            icon="bicycle-outline"
            label="أجرة التوصيل"
            placeholder="0"
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            appTheme={appTheme}
          />

          <View style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 14,
            backgroundColor: appTheme.primaryColor + "10",
          }}>
            <Text style={{
              color: appTheme.secondaryTextColor,
              fontSize: 12,
              textAlign: "right",
            }}>
              صافي أجرة التوصيل في هذه العملية
            </Text>

            <Text style={{
              marginTop: 5,
              color: appTheme.primaryDarkColor,
              fontSize: 20,
              fontWeight: "900",
              textAlign: "right",
            }}>
              {Math.max(
                0,
                Number(collected || 0) - Number(paid || 0)
              ).toLocaleString("en-US")} د.ع
            </Text>
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={appTheme.infoColor}
          />
          <Text style={styles.noteText}>
            تأكد من مراجعة المبالغ قبل الحفظ، لأن الحركة النقدية مرتبطة بالطلب.
          </Text>
        </View>

        <AppButton
          title="حفظ الحركة النقدية"
          onPress={submit}
          loading={busy}
        />
      </ScrollView>
    </Screen>
  );
}

function MoneyInput({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  appTheme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  const styles = createStyles(appTheme);

  return (
    <View style={styles.inputBlock}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>

        <View style={styles.inputIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={appTheme.primaryColor}
          />
        </View>
      </View>

      <AppInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
      />
    </View>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 2,
      paddingTop: 2,
      paddingBottom: 35,
      gap: 14,
    },

    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
      marginBottom: 5,
    },

    headerIcon: {
      width: 50,
      height: 50,
      borderRadius: 17,
      backgroundColor: appTheme.primaryColor + "14",
      alignItems: "center",
      justifyContent: "center",
    },

    headerText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 2,
    },

    title: {
      color: appTheme.textColor,
      fontSize: 27,
      fontWeight: "900",
      textAlign: "right",
    },

    hero: {
      minHeight: 145,
      borderRadius: 24,
      backgroundColor: appTheme.primaryDarkColor,
      padding: 21,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 15,
      overflow: "hidden",
    },

    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.13)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroContent: {
      flex: 1,
      alignItems: "flex-end",
    },

    heroTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "900",
      textAlign: "right",
    },

    heroText: {
      color: "#CCFBF1",
      fontSize: 12,
      lineHeight: 20,
      marginTop: 6,
      textAlign: "right",
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 5,
    },

    sectionTitle: {
      color: appTheme.textColor,
      fontSize: 17,
      fontWeight: "900",
    },

    sectionHint: {
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      fontWeight: "700",
    },

    card: {
      padding: 17,
      borderRadius: 22,
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
    },

    inputBlock: {
      marginBottom: 8,
    },

    inputLabelRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 7,
    },

    inputLabel: {
      color: appTheme.textColor,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
    },

    inputIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: appTheme.primaryColor + "12",
      alignItems: "center",
      justifyContent: "center",
    },

    note: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      gap: 9,
      padding: 14,
      borderRadius: 17,
      backgroundColor: appTheme.infoColor + "0D",
      borderWidth: 1,
      borderColor: appTheme.infoColor + "22",
    },

    noteText: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "right",
    },
  });
