import React from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
} from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

export default function AppInput(props: TextInputProps) {
  const theme = useAppTheme();

  const styles = StyleSheet.create({
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 15,
      backgroundColor: theme.surfaceColor,
      color: theme.textColor,
      paddingHorizontal: 16,
      paddingVertical: 12,
      textAlign: "right",
      fontSize: 15,
    },
  });

  return (
    <TextInput
      {...props}
      placeholderTextColor={
        props.placeholderTextColor ??
        theme.secondaryTextColor
      }
      selectionColor={theme.primaryColor}
      style={[styles.input, props.style]}
    />
  );
}
