
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { submitComplaint } from "../../api/complaints";

type Props = {
  mode: "captain" | "shop";
  orderId?: string | null;
  onEmergency?: () => void;
};

export default function SupportQuickAccess({
  mode,
  orderId,
  onEmergency,
}: Props) {
  const [open, setOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);

  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [orderNumber, setOrderNumber] = useState(
    String(orderId || ""),
  );
  const [sending, setSending] = useState(false);

  function openComplaint() {
    setOpen(false);
    setComplaintOpen(true);
  }

  function resetComplaint() {
    setComplaintOpen(false);
    setSubject("");
    setDetails("");
    setOrderNumber(String(orderId || ""));
  }

  async function sendComplaintRequest() {
    const cleanSubject = subject.trim();
    const cleanDetails = details.trim();
    const cleanOrder = orderNumber.trim();

    if (cleanSubject.length < 2) {
      Alert.alert(
        "موضوع الشكوى مطلوب",
        "اكتب موضوع الشكوى.",
      );
      return;
    }

    if (cleanDetails.length < 5) {
      Alert.alert(
        "تفاصيل الشكوى مطلوبة",
        "اكتب تفاصيل واضحة للمشكلة.",
      );
      return;
    }

    if (!cleanOrder) {
      Alert.alert(
        "رقم الطلب مطلوب",
        "اكتب رقم الطلب المرتبط بالشكوى.",
      );
      return;
    }

    try {
      setSending(true);

      await submitComplaint({
        type: "order",
        orderId: cleanOrder,
        title: cleanSubject,
        description: cleanDetails,
      });

      Alert.alert(
        "تم إرسال الشكوى",
        "تم إرسال طلب الدعم إلى الإدارة.",
      );

      resetComplaint();
    } catch (error: any) {
      Alert.alert(
        "تعذر إرسال الشكوى",
        error?.response?.data?.message ||
          error?.message ||
          "حدث خطأ أثناء إرسال الشكوى.",
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * المطعم:
   * زر دعم سريع يفتح نموذج الشكوى مباشرة.
   *
   * الكابتن:
   * زر دعم سريع يفتح اختيار شكوى / طوارئ.
   */
  function handleMainPress() {
    if (mode === "shop") {
      openComplaint();
      return;
    }

    setOpen((value) => !value);
  }

  return (
    <View style={{ marginTop: 12 }}>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={handleMainPress}
        style={{
          minHeight: 48,
          borderRadius: 14,
          backgroundColor: "#EEF4FF",
          borderWidth: 1,
          borderColor: "#D4E2FF",
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 14,
        }}
      >
        <Ionicons
          name="headset-outline"
          size={19}
          color="#1257D6"
        />

        <Text
          style={{
            color: "#1257D6",
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          دعم سريع
        </Text>

        {mode === "captain" ? (
          <Ionicons
            name={
              open
                ? "chevron-up-outline"
                : "chevron-down-outline"
            }
            size={17}
            color="#1257D6"
          />
        ) : null}
      </TouchableOpacity>

      {/* الكابتن فقط: شكوى / طوارئ */}
      {mode === "captain" && open ? (
        <View
          style={{
            marginTop: 8,
            borderRadius: 15,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            padding: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={openComplaint}
              style={{
                flex: 1,
                minHeight: 45,
                borderRadius: 12,
                backgroundColor: "#FFF7E6",
                borderWidth: 1,
                borderColor: "#F5D58A",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row-reverse",
                gap: 6,
              }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#B56B00"
              />

              <Text
                style={{
                  color: "#9A5B00",
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                شكوى
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => {
                setOpen(false);
                onEmergency?.();
              }}
              style={{
                flex: 1,
                minHeight: 45,
                borderRadius: 12,
                backgroundColor: "#FEE2E2",
                borderWidth: 1,
                borderColor: "#FCA5A5",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row-reverse",
                gap: 6,
              }}
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color="#DC2626"
              />

              <Text
                style={{
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                طوارئ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* نموذج الشكوى — نفس المكان */}
      {complaintOpen ? (
        <View
          style={{
            marginTop: 10,
            borderRadius: 17,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            padding: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: "#172033",
                fontSize: 16,
                fontWeight: "900",
                textAlign: "right",
              }}
            >
              تفاصيل الشكوى
            </Text>

            <TouchableOpacity
              onPress={resetComplaint}
              disabled={sending}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
                marginStart: 8,
              }}
            >
              <Ionicons
                name="close"
                size={19}
                color="#475569"
              />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              marginBottom: 6,
              color: "#334155",
              fontSize: 13,
              fontWeight: "800",
              textAlign: "right",
            }}
          >
            موضوع الشكوى
          </Text>

          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="اكتب موضوع الشكوى"
            placeholderTextColor="#94A3B8"
            style={{
              minHeight: 46,
              borderWidth: 1,
              borderColor: "#D7DCE3",
              borderRadius: 11,
              paddingHorizontal: 12,
              color: "#172033",
              textAlign: "right",
              marginBottom: 10,
              backgroundColor: "#FAFBFC",
            }}
          />

          <Text
            style={{
              marginBottom: 6,
              color: "#334155",
              fontSize: 13,
              fontWeight: "800",
              textAlign: "right",
            }}
          >
            تفاصيل الشكوى
          </Text>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="اكتب تفاصيل المشكلة"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 105,
              borderWidth: 1,
              borderColor: "#D7DCE3",
              borderRadius: 11,
              paddingHorizontal: 12,
              paddingVertical: 11,
              color: "#172033",
              textAlign: "right",
              marginBottom: 10,
              backgroundColor: "#FAFBFC",
            }}
          />

          <Text
            style={{
              marginBottom: 6,
              color: "#334155",
              fontSize: 13,
              fontWeight: "800",
              textAlign: "right",
            }}
          >
            رقم الطلب
          </Text>

          <TextInput
            value={orderNumber}
            onChangeText={setOrderNumber}
            editable={!orderId}
            placeholder="رقم الطلب"
            placeholderTextColor="#94A3B8"
            style={{
              minHeight: 46,
              borderWidth: 1,
              borderColor: "#D7DCE3",
              borderRadius: 11,
              paddingHorizontal: 12,
              color: orderId
                ? "#64748B"
                : "#172033",
              textAlign: "right",
              marginBottom: 12,
              backgroundColor: orderId
                ? "#F1F5F9"
                : "#FAFBFC",
            }}
          />

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={sendComplaintRequest}
            disabled={sending}
            style={{
              minHeight: 48,
              borderRadius: 12,
              backgroundColor: "#1257D6",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row-reverse",
              gap: 7,
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="send-outline"
                  size={17}
                  color="#FFFFFF"
                />

                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  إرسال الشكوى
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
