import { useAppTheme } from "../../theme/useAppTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
export default function MaintenanceScreen({
  message = "النظام في وضع الصيانة حاليًا.",
}: {
  message?: string;
}) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.icon}>🔧</Text>

        <Text style={styles.title}>
          النظام تحت الصيانة
        </Text>

        <Text style={styles.text}>
          {message}
        </Text>
      </View>
    </Screen>
  );
}

const createStyles = (appTheme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  icon: {
    fontSize: 54,
  },
  title: {
    marginTop: 14,
    color: appTheme.textColor,
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  text: {
    marginTop: 9,
    color: appTheme.secondaryTextColor,
    lineHeight: 24,
    textAlign: "center",
  },
});
