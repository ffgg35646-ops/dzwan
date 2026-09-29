import React from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import AppButton from "./AppButton";

type Props = {
  title: string;
  onSelected: (uri: string) => void;
  secondary?: boolean;
  disabled?: boolean;
};

export default function PhotoPickerButton({
  title,
  onSelected,
  secondary = false,
  disabled = false,
}: Props) {
  async function openCamera() {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "صلاحية الكاميرا",
        "يجب السماح للتطبيق باستخدام الكاميرا."
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    onSelected(result.assets[0].uri);
  }

  return (
    <AppButton
      title={title}
      onPress={openCamera}
      secondary={secondary}
      disabled={disabled}
    />
  );
}
