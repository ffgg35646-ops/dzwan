
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
import Screen from "../../components/Screen";
import { createCaptainRating } from "../../api/rating";

export default function RateCaptainScreen({
  route,
  navigation,
}: any) {
  const orderId = route?.params?.orderId;
  const captainId = route?.params?.captainId;

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);

      await createCaptainRating({
        orderId,
        captainId,
        stars,
        comment,
      });

      Alert.alert(
        "تم التقييم",
        "تم حفظ تقييم الكابتن بنجاح."
      );

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        "تعذر حفظ التقييم",
        error?.message ?? "حدث خطأ."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>
          تقييم الكابتن
        </Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setStars(item)}
            >
              <Text style={styles.star}>
                {item <= stars ? "★" : "☆"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          placeholder="اكتب ملاحظتك..."
          value={comment}
          onChangeText={setComment}
          multiline
          textAlignVertical="top"
          style={styles.input}
        />

        <AppButton
          title={
            loading
              ? "جاري الحفظ..."
              : "حفظ التقييم"
          }
          onPress={submit}
          disabled={loading}
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
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 25,
  },
  star: {
    fontSize: 42,
    color: "#F59E0B",
    marginHorizontal: 4,
  },
  input: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
});
