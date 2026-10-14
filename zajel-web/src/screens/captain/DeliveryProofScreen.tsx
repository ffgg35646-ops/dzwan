import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
import PhotoPickerButton from "../../components/PhotoPickerButton";
import { useAppTheme } from "../../theme/useAppTheme";
import {
  submitDeliveryPhoto,
  completeDelivery,
} from "../../api/captainOrder";

export default function DeliveryProofScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const orderId = String(
    route.params?.orderId || "",
  );

  const [photo, setPhoto] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  async function submitPhotoProof() {
    if (!orderId) {
      Alert.alert(
        "طلب غير صالح",
        "تعذر تحديد رقم الطلب.",
      );
      return;
    }

    if (!photo) {
      Alert.alert(
        "الصورة مطلوبة",
        "التقط صورة واضحة مع الزبون أولًا.",
      );
      return;
    }

    setBusy(true);

    try {
      // أولًا: رفع صورة إثبات التسليم.
      await submitDeliveryPhoto(
        orderId,
        photo,
      );

      // ثانيًا: بعد نجاح الرفع فقط نكمل الطلب.
      await completeDelivery(orderId);

      Alert.alert(
        "تم التسليم",
        "تم حفظ صورة التسليم وإكمال الطلب بنجاح.",
      );

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        "تعذر إتمام التسليم",
        error?.response?.data?.message ||
          "تعذر حفظ صورة إثبات التسليم.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>

        <View style={styles.header}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor:
                  `${appTheme.successColor}12`,
              },
            ]}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={28}
              color={appTheme.successColor}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              آخر خطوة
            </Text>

            <Text style={styles.title}>
              إثبات التسليم
            </Text>
          </View>
        </View>

        <View style={styles.successBanner}>
          <Ionicons
            name="shield-checkmark-outline"
            size={23}
            color={appTheme.successColor}
          />

          <Text style={styles.successText}>
            صوّر صورة واضحة مع الزبون لإثبات إتمام التسليم.
          </Text>
        </View>

        <View style={styles.proofCard}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                {
                  backgroundColor:
                    `${appTheme.infoColor}12`,
                },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={23}
                color={appTheme.infoColor}
              />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>
                صورة التسليم
              </Text>

              <Text style={styles.cardSubtitle}>
                يجب أن تكون الصورة واضحة وتُظهر التسليم للزبون.
              </Text>
            </View>
          </View>

          <PhotoPickerButton
            title={
              photo
                ? "إعادة تصوير التسليم"
                : "تصوير مع الزبون"
            }
            onSelected={setPhoto}
          />

          {photo && (
            <View style={styles.selected}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={appTheme.successColor}
              />

              <Text style={styles.selectedText}>
                تم اختيار صورة إثبات التسليم
              </Text>
            </View>
          )}

          <AppButton
            title="تأكيد التسليم"
            onPress={submitPhotoProof}
            loading={busy}
            disabled={!photo}
          />
        </View>

        <Text style={styles.footerHint}>
          لا يتم إنهاء الطلب إلا بعد نجاح رفع صورة إثبات التسليم.
        </Text>

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
      padding: 20,
      gap: 17,
    },

    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 13,
    },

    headerIcon: {
      width: 58,
      height: 58,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },

    headerText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      fontSize: 13,
      color: appTheme.secondaryTextColor,
      marginBottom: 4,
    },

    title: {
      fontSize: 24,
      fontWeight: "800",
      color: appTheme.textColor,
      textAlign: "right",
    },

    successBanner: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      padding: 15,
      borderRadius: 16,
      backgroundColor:
        `${appTheme.successColor}10`,
    },

    successText: {
      flex: 1,
      color: appTheme.textColor,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "right",
    },

    proofCard: {
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      borderRadius: 20,
      padding: 18,
      gap: 18,
      backgroundColor: appTheme.surfaceColor,
    },

    cardHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 12,
    },

    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },

    cardHeaderText: {
      flex: 1,
      alignItems: "flex-end",
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: appTheme.textColor,
      textAlign: "right",
    },

    cardSubtitle: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 20,
      color: appTheme.secondaryTextColor,
      textAlign: "right",
    },

    selected: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 8,
    },

    selectedText: {
      color: appTheme.successColor,
      fontSize: 14,
      fontWeight: "700",
    },

    footerHint: {
      color: appTheme.secondaryTextColor,
      fontSize: 13,
      lineHeight: 21,
      textAlign: "center",
    },
  });
