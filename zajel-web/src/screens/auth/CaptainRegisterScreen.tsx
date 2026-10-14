import { registerPushToken } from "../../api/pushRegistration";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Screen from "../../components/Screen";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import LocationSelector from "../../components/LocationSelector";
import { api } from "../../api/client";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/useAppTheme";

type ImageValue = {
  uri: string;
  name?: string;
  type?: string;
  file?: any;
} | null;

export default function CaptainRegisterScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const navigation = useNavigation<any>();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");

  const [governorateId, setGovernorateId] = useState("");
  const [areaId, setAreaId] = useState("");

  const [idFront, setIdFront] = useState<ImageValue>(null);
  const [idBack, setIdBack] = useState<ImageValue>(null);
  const [resFront, setResFront] = useState<ImageValue>(null);
  const [resBack, setResBack] = useState<ImageValue>(null);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<1 | 2>(1);
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState<
    "error" | "success"
  >("error");
  const [formError, setFormError] = useState("");

  async function pickImage(
    setter: React.Dispatch<React.SetStateAction<ImageValue>>,
  ) {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "صلاحية مطلوبة",
        "يجب السماح للتطبيق باختيار الصور.",
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    setter({
      uri: asset.uri,
      name: asset.fileName || "document.jpg",
      type: asset.mimeType || "image/jpeg",
      file: (asset as any).file,
    });
  }

  function showMessage(title: string, message: string) {
    setFormError(`${title}: ${message}`);

    if (Platform.OS !== "web") {
      Alert.alert(title, message);
    }
  }

  function validate() {
    const name = fullName.trim();
    const phoneValue = phone.trim();
    const gmailValue = gmail.trim().toLowerCase();

    if (!name) return "أدخل الاسم الثلاثي.";

    if (!phoneValue) {
      return "أدخل رقم الهاتف.";
    }

    if (!/^07\d{9}$/.test(phoneValue)) {
      return "رقم الهاتف غير صحيح. يجب أن يكون رقمًا عراقيًا مكونًا من 11 رقمًا ويبدأ بـ 07.";
    }

    if (!gmailValue) {
      return "أدخل حساب Gmail.";
    }

    if (!/^[^\s@]+@gmail\.com$/.test(gmailValue)) {
      return "أدخل عنوان Gmail صحيحًا.";
    }

    if (!password.trim()) {
      return "أدخل كلمة المرور.";
    }

    if (password.length < 6) {
      return "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.";
    }

    if (!governorateId) {
      return "اختر المحافظة.";
    }

    if (!areaId) {
      return "اختر المنطقة.";
    }

    if (!idFront || !idBack || !resFront || !resBack) {
      return "يجب رفع صور الهوية وبطاقة السكن كاملة.";
    }

    return null;
  }

  function goNext() {
    setFormMessage("");
    setFormError("");

    const name = fullName.trim();
    const phoneValue = phone.trim();
    const gmailValue = gmail.trim().toLowerCase();

    if (!name) {
      setFormMessageType("error");
      setFormMessage("أدخل الاسم الثلاثي.");
      return;
    }

    if (!phoneValue) {
      setFormMessageType("error");
      setFormMessage("أدخل رقم الهاتف.");
      return;
    }

    if (!/^07\d{9}$/.test(phoneValue)) {
      setFormMessageType("error");
      setFormMessage(
        "رقم الهاتف غير صحيح. يجب أن يكون رقمًا عراقيًا مكونًا من 11 رقمًا ويبدأ بـ 07."
      );
      return;
    }

    if (!gmailValue) {
      setFormMessageType("error");
      setFormMessage("أدخل حساب Gmail.");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/.test(gmailValue)) {
      setFormMessageType("error");
      setFormMessage("أدخل عنوان Gmail صحيحًا.");
      return;
    }

    if (!password.trim()) {
      setFormMessageType("error");
      setFormMessage("أدخل كلمة المرور.");
      return;
    }

    if (password.length < 6) {
      setFormMessageType("error");
      setFormMessage("كلمة المرور يجب أن تكون 6 أحرف أو أكثر.");
      return;
    }

    setFormMessage("");
    setFormError("");
    setPage(2);
  }

  async function submit() {
    setFormMessage("");

    const error = validate();

    if (error) {
      setFormMessageType("error");
      setFormMessage(error);
      return;
    }

    const form = new FormData();

    form.append("fullName", fullName.trim());
    form.append("phone", phone.trim());
    form.append("gmail", gmail.trim().toLowerCase());
    form.append("password", password);
    form.append("governorateId", governorateId);
    form.append("areaId", areaId);

    const appendFile = (
      field: string,
      file: ImageValue,
    ) => {
      if (!file) return;

      if (
        Platform.OS === "web" &&
        file.file
      ) {
        form.append(field, file.file);
        return;
      }

      form.append(field, {
        uri: file.uri,
        name: file.name || `${field}.jpg`,
        type: file.type || "image/jpeg",
      } as any);
    };

    appendFile("idFront", idFront);
    appendFile("idBack", idBack);
    appendFile("residenceFront", resFront);
    appendFile("residenceBack", resBack);

    setLoading(true);

    try {
      const pushToken =
        await registerPushToken();

      if (pushToken) {
        form.append("pushToken", pushToken);
      }

      const response = await api.post(
        "/captain-registration",
        form,
      );

      const verificationId =
        response?.data?.verificationId;

      if (!verificationId) {
        throw new Error(
          "تم إرسال الطلب لكن لم يصل معرّف التحقق.",
        );
      }

      navigation.navigate(
        "CaptainRegisterVerify",
        {
          verificationId,
          gmail: gmail.trim().toLowerCase(),
        },
      );
    } catch (error: any) {
      console.error("Captain registration error:", error);

      setFormMessageType("error");

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "حدث خطأ أثناء إرسال طلب التسجيل.";

      setFormMessage(message);
    } finally {
      setLoading(false);
    }
  }

  const docButton = (
    title: string,
    value: ImageValue,
    setter: React.Dispatch<React.SetStateAction<ImageValue>>,
  ) => (
    <View style={styles.document}>
      <Text style={styles.documentTitle}>{title}</Text>

      <AppButton
        title={value ? "تم اختيار الصورة ✓" : "اختيار صورة"}
        secondary
        onPress={() => pickImage(setter)}
      />
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Pressable
              onPress={() =>
                page === 1
                  ? navigation.goBack()
                  : setPage(1)
              }
              style={({ pressed }) => [
                styles.backButton,
                pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
              ]}
            >
              <MaterialCommunityIcons
                name="arrow-right"
                size={22}
                color="#E5501C"
              />
            </Pressable>

            <Text style={styles.title}>
            تسجيل الكابتن
          </Text>

          <Text style={styles.subtitle}>
            أدخل بياناتك على خطوتين بسيطة لإرسال طلب التسجيل إلى الإدارة.
          </Text>

          <View style={styles.stepHeader}>
            <View
              style={[
                styles.stepPill,
                page === 1 && styles.stepPillActive,
              ]}
            >
              <Text
                style={[
                  styles.stepPillText,
                  page === 1 && styles.stepPillTextActive,
                ]}
              >
                1
              </Text>
            </View>

            <View
              style={[
                styles.stepLine,
                page === 2 && styles.stepLineActive,
              ]}
            />

            <View
              style={[
                styles.stepPill,
                page === 2 && styles.stepPillActive,
              ]}
            >
              <Text
                style={[
                  styles.stepPillText,
                  page === 2 && styles.stepPillTextActive,
                ]}
              >
                2
              </Text>
            </View>
          </View>

          <Text style={styles.pageHint}>
            {page === 1
              ? "الخطوة الأولى — البيانات الأساسية"
              : "الخطوة الثانية — الموقع والوثائق"}
          </Text>

          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {formError}
              </Text>
            </View>
          ) : null}

          {page === 1 ? (
            <>
              <AppInput
                placeholder="الاسم الثلاثي"
                value={fullName}
                onChangeText={(value) => {
                  setFormError("");
                  setFormMessage("");
                  setFullName(value);
                }}
              />

              <AppInput
                placeholder="رقم الهاتف"
                value={phone}
                onChangeText={(value) => {
                  setFormError("");
                  setFormMessage("");
                  setPhone(value);
                }}
                keyboardType="phone-pad"
              />

              <AppInput
                placeholder="حساب Gmail"
                value={gmail}
                onChangeText={(value) => {
                  setFormError("");
                  setFormMessage("");
                  setGmail(value);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AppInput
                placeholder="كلمة المرور"
                value={password}
                onChangeText={(value) => {
                  setFormError("");
                  setFormMessage("");
                  setPassword(value);
                }}
                secureTextEntry
                autoCapitalize="none"
              />

              <AppButton
                title="التالي"
                onPress={goNext}
              />
            </>
          ) : (
            <>
              <LocationSelector
                type="captain"
                governorateId={governorateId}
                areaId={areaId}
                onGovernorateChange={(value) => {
                  setFormError("");
                  setFormMessage("");
                  setGovernorateId(value);
                }}
                onAreaChange={(value) => {
                  setFormError("");
                  setFormMessage("");
                  setAreaId(value);
                }}
              />

              {docButton(
                "الهوية — الوجه",
                idFront,
                setIdFront,
              )}

              {docButton(
                "الهوية — الظهر",
                idBack,
                setIdBack,
              )}

              {docButton(
                "بطاقة السكن — الوجه",
                resFront,
                setResFront,
              )}

              {docButton(
                "بطاقة السكن — الظهر",
                resBack,
                setResBack,
              )}

              {formMessage ? null : null}

              <AppButton
                title="إرسال طلب التسجيل"
                onPress={submit}
                loading={loading}
              />
            </>
          )}

          {formMessage ? (
            <View
              style={[
                styles.messageBox,
                formMessageType === "success"
                  ? styles.successBox
                  : styles.errorBox,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  formMessageType === "success"
                    ? styles.successText
                    : styles.errorText,
                ]}
              >
                {formMessage}
              </Text>
            </View>
          ) : null}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}


const createStyles = (
  appTheme: ReturnType<typeof useAppTheme>,
) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    container: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 34,
      alignItems: "center",
    },

    backButton: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: "#FFF0DD",
      borderWidth: 1,
      borderColor: "#F0D9BE",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
      shadowColor: "#8A5A2E",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 5,
    },

    formCard: {
      width: "100%",
      position: "relative",
      maxWidth: 380,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#F0D9BE",
      padding: 18,
      shadowColor: "#8A5A2E",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.09,
      shadowRadius: 18,
      elevation: 4,
    },

    stepHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      marginBottom: 8,
      gap: 8,
    },

    stepPill: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFF2E5",
      borderWidth: 1,
      borderColor: "#F0D9BE",
    },

    stepPillActive: {
      backgroundColor: "#E5501C",
      borderColor: "#E5501C",
    },

    stepPillText: {
      color: "#8A5A2E",
      fontSize: 13,
      fontWeight: "900",
    },

    stepPillTextActive: {
      color: "#FFFFFF",
    },

    stepLine: {
      width: 54,
      height: 3,
      borderRadius: 2,
      backgroundColor: "#F0D9BE",
    },

    stepLineActive: {
      backgroundColor: "#E5501C",
    },

    pageHint: {
      color: "#8A5A2E",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 12,
    },

    title: {
      color: "#24150B",
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
      marginBottom: 6,
    },

    subtitle: {
      color: "#8A5A2E",
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
      marginBottom: 14,
    },

    document: {
      gap: 7,
      padding: 12,
      borderWidth: 1,
      borderColor: "#F0D9BE",
      borderRadius: 16,
      backgroundColor: "#FFF9F1",
      marginTop: 8,
    },

    documentTitle: {
      color: "#24150B",
      fontWeight: "800",
      textAlign: "right",
    },

    errorBox: {
      backgroundColor: "#FFF1F1",
      borderWidth: 1,
      borderColor: "#F3B4B4",
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    },

    errorText: {
      color: "#B42318",
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      lineHeight: 20,
    },

    messageBox: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
    },

    successBox: {
      backgroundColor: "#EFFAF2",
      borderColor: "#A8DDB4",
    },

    messageText: {
      textAlign: "right",
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 20,
    },

    successText: {
      color: "#087443",
    },
  });

