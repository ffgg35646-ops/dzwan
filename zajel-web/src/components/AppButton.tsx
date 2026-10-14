import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { useAppTheme } from "../theme/useAppTheme";

type Props = {
  title: string;
  onPress: () => void | Promise<void>;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export default function AppButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
  style,
}: Props) {
  const theme = useAppTheme();

  const styles = StyleSheet.create({
    button: {
      minHeight: 52,
      paddingHorizontal: 20,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      backgroundColor: secondary
        ? theme.surfaceColor
        : theme.primaryColor,
      borderWidth: 1,
      borderColor: secondary
        ? theme.borderColor
        : theme.primaryColor,
      shadowColor: "#0F172A",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: secondary ? 0.04 : 0.12,
      shadowRadius: 10,
      elevation: secondary ? 1 : 3,
    },

    text: {
      fontSize: 16,
      fontWeight: "800",
      color: secondary
        ? theme.primaryDarkColor
        : theme.surfaceColor,
    },
  });

  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      android_ripple={{
        color: secondary
          ? theme.borderColor
          : theme.primaryDarkColor,
      }}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && {
          transform: [{ scale: 0.985 }],
          opacity: 0.92,
        },
        isDisabled && {
          opacity: 0.5,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            secondary
              ? theme.primaryDarkColor
              : theme.surfaceColor
          }
        />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}
