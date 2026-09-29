import React from "react";
import { StyleSheet, Text } from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

export default function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  return <Text style={styles.text}>{children}</Text>;
}

const createStyles = (appTheme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    text: {
      color: appTheme.textColor,
      fontSize: 19,
      fontWeight: "900",
      textAlign: "right",
    },
  });
