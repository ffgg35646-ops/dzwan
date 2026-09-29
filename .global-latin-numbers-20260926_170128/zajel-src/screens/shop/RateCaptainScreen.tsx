import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import AppButton from "../../components/AppButton";
import { submitCaptainRating } from "../../api/ratingRuntime";
import { useAppTheme } from "../../theme/useAppTheme";

export default function RateCaptainScreen({
  route,
  navigation,
}: any) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const orderId = route?.params?.orderId;
  const captainId = route?.params?.captainId;

  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!orderId || !captainId) {
      Alert.alert(
        "تعذر التقييم",
        "بيانات الطلب أو الكابتن غير متوفرة."
      );
      return;
    }

    try {
      setLoading(true);

      await submitCaptainRating({
        orderId,
        captainId,
        stars,
        text: text.trim(),
      });

      Alert.alert(
        "شكراً لتقييمك",
        "تم حفظ تقييمك بنجاح.",
        [
          {
            text: "حسنًا",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر حفظ التقييم",
        error?.response?.data?.message ||
          error?.message ||
          "حدث خطأ أثناء حفظ التقييم."
      );
    } finally {
      setLoading(false);
    }
  }

  const ratingText =
    stars === 5
      ? "ممتاز جدًا"
      : stars === 4
      ? "ممتاز"
      : stars === 3
      ? "جيد"
      : stars === 2
      ? "يحتاج تحسين"
      : "غير مرضٍ";

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              شاركنا رأيك
            </Text>

            <Text style={styles.title}>
              تقييم الكابتن
            </Text>

            <Text style={styles.subtitle}>
              تقييمك يساعدنا على تحسين جودة الخدمة
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="star-outline"
              size={25}
              color={appTheme.primaryColor}
            />
          </View>
        </View>

        {/* Rating Card */}
        <View style={styles.ratingCard}>
          <View style={styles.captainIcon}>
            <Ionicons
              name="bicycle-outline"
              size={32}
              color={appTheme.primaryColor}
            />
          </View>

          <Text style={styles.ratingTitle}>
            كيف كانت تجربة التوصيل؟
          </Text>

          <Text style={styles.ratingSubtitle}>
            اختر تقييمك للكابتن
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((item) => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                onPress={() => setStars(item)}
                style={styles.starButton}
              >
                <Ionicons
                  name={
                    item <= stars
                      ? "star"
                      : "star-outline"
                  }
                  size={38}
                  color={
                    item <= stars
                      ? appTheme.warningColor
                      : appTheme.borderColor
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.ratingPill}>
            <Text style={styles.ratingPillText}>
              {ratingText}
            </Text>
          </View>
        </View>

        {/* Comment */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ملاحظتك
          </Text>

          <Text style={styles.optional}>
            اختياري
          </Text>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="اكتب ملاحظتك عن تجربة التوصيل..."
            placeholderTextColor={
              appTheme.secondaryTextColor
            }
            multiline
            textAlign="right"
            textAlignVertical="top"
            maxLength={500}
            style={styles.input}
          />

          <Text style={styles.counter}>
            {text.length}/500
          </Text>
        </View>

        {/* Info */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={appTheme.successColor}
          />

          <Text style={styles.infoText}>
            تقييمك خاص بالخدمة ويساعد زاجل على الحفاظ
            على مستوى توصيل ممتاز.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <AppButton
            title={
              loading
                ? "جاري حفظ التقييم..."
                : "حفظ التقييم"
            }
            onPress={submit}
            disabled={loading}
            loading={loading}
          />
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
      alignItems: "flex-end",
    },

    eyebrow: {
      color: appTheme.primaryColor,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 3,
    },

    title: {
      color: appTheme.textColor,
      fontSize: 27,
      fontWeight: "900",
      textAlign: "right",
    },

    subtitle: {
      marginTop: 4,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "500",
      textAlign: "right",
    },

    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 14,
      backgroundColor: appTheme.surfaceColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
    },

    ratingCard: {
      alignItems: "center",
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      borderRadius: 22,
      padding: 22,
      marginBottom: 20,
    },

    captainIcon: {
      width: 68,
      height: 68,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${appTheme.primaryColor}10`,
      marginBottom: 15,
    },

    ratingTitle: {
      color: appTheme.textColor,
      fontSize: 18,
      fontWeight: "900",
      textAlign: "center",
    },

    ratingSubtitle: {
      marginTop: 5,
      color: appTheme.secondaryTextColor,
      fontSize: 12,
      fontWeight: "500",
      textAlign: "center",
    },

    stars: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 18,
    },

    starButton: {
      paddingHorizontal: 4,
    },

    ratingPill: {
      marginTop: 13,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: `${appTheme.warningColor}12`,
    },

    ratingPillText: {
      color: appTheme.warningColor,
      fontSize: 12,
      fontWeight: "900",
    },

    sectionHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },

    sectionTitle: {
      color: appTheme.textColor,
      fontSize: 15,
      fontWeight: "900",
    },

    optional: {
      color: appTheme.secondaryTextColor,
      fontSize: 10,
      fontWeight: "700",
    },

    inputCard: {
      backgroundColor: appTheme.cardColor,
      borderWidth: 1,
      borderColor: appTheme.borderColor,
      borderRadius: 18,
      padding: 4,
      marginBottom: 14,
    },

    input: {
      minHeight: 125,
      paddingHorizontal: 13,
      paddingTop: 13,
      paddingBottom: 10,
      color: appTheme.textColor,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "right",
    },

    counter: {
      color: appTheme.secondaryTextColor,
      fontSize: 9,
      fontWeight: "600",
      textAlign: "left",
      marginHorizontal: 12,
      marginBottom: 8,
    },

    infoBanner: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      padding: 14,
      borderRadius: 17,
      backgroundColor: `${appTheme.successColor}0D`,
      borderWidth: 1,
      borderColor: `${appTheme.successColor}20`,
    },

    infoText: {
      flex: 1,
      color: appTheme.secondaryTextColor,
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "600",
      textAlign: "right",
      marginRight: 9,
    },

    buttonContainer: {
      marginTop: 18,
    },
  });
