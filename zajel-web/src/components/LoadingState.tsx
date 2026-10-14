import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

export default function LoadingState({
  message = "جاري تحميل البيانات...",
}: {
  message?: string;
}) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={appTheme.primaryColor}
      />

      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const createStyles = (appTheme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    text: {
      marginTop: 12,
      color: appTheme.secondaryTextColor,
      fontSize: 14,
      textAlign: "center",
    },
  });
