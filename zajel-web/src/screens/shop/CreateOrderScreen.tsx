import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import LocationSelector from "../../components/LocationSelector";
import { createOrder } from "../../api/orders";
import { useAppTheme } from "../../theme/useAppTheme";

export default function CreateOrderScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [note, setNote] = useState("");
  const [customerGpsLink, setCustomerGpsLink] = useState("");
  const [customerLatitude, setCustomerLatitude] = useState("");
  const [customerLongitude, setCustomerLongitude] = useState("");

  const [governorateId, setGovernorateId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [page, setPage] = useState<1 | 2>(1);

  function goNext() {
    setErrorMessage("");
    setSuccessMessage("");

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanAddress = address.trim();
    const cleanValue = value.trim();

    if (!cleanName) {
      setErrorMessage("من فضلك اكتب اسم الزبون.");
      return;
    }

    if (!cleanPhone) {
      setErrorMessage("من فضلك اكتب رقم الهاتف.");
      return;
    }

    if (!cleanValue) {
      setErrorMessage("من فضلك اكتب قيمة الطلب.");
      return;
    }

    const numericValue = Number(cleanValue);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setErrorMessage(
        "من فضلك اكتب قيمة صحيحة للطلب أكبر من صفر."
      );
      return;
    }

    setPage(2);
  }

  function parseGpsLink(
    value: string,
  ): { latitude: string; longitude: string } | null {
    const text = value.trim();

    if (!text) {
      setCustomerLatitude("");
      setCustomerLongitude("");
      return null;
    }

    const patterns = [
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
      /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (!match) continue;

      const lat = Number(match[1]);
      const lng = Number(match[2]);

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        const latitude = String(lat);
        const longitude = String(lng);

        setCustomerLatitude(latitude);
        setCustomerLongitude(longitude);

        return {
          latitude,
          longitude,
        };
      }
    }

    return null;
  }

  async function submit() {
    setErrorMessage("");

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanAddress = address.trim();
    const cleanValue = value.trim();
    const cleanOfferCode = offerCode.trim().toUpperCase();
    const cleanNote = note.trim();

    if (!cleanName) {
      setErrorMessage("من فضلك اكتب اسم الزبون.");
      return;
    }

    if (!cleanPhone) {
      setErrorMessage("من فضلك اكتب رقم الهاتف.");
      return;
    }

    if (!cleanAddress) {
      setErrorMessage("من فضلك اكتب عنوان التوصيل.");
      return;
    }

    if (!governorateId) {
      setErrorMessage("من فضلك اختر المحافظة.");
      return;
    }

    if (!areaId) {
      setErrorMessage("من فضلك اختر المنطقة.");
      return;
    }

    const cleanGpsLink = customerGpsLink.trim();
    let resolvedLatitude = customerLatitude.trim();
    let resolvedLongitude = customerLongitude.trim();

    if (
      (resolvedLatitude && !resolvedLongitude) ||
      (!resolvedLatitude && resolvedLongitude)
    ) {
      setErrorMessage(
        "إذا أدخلت موقع العميل، يجب إدخال خط العرض وخط الطول معًا.",
      );
      return;
    }

    if (
      cleanGpsLink &&
      !resolvedLatitude &&
      !resolvedLongitude
    ) {
      const parsed = parseGpsLink(cleanGpsLink);

      if (!parsed) {
        setErrorMessage(
          "تعذر قراءة رابط الموقع. الصق رابط Google Maps يحتوي على الإحداثيات أو أدخلها يدويًا.",
        );
        return;
      }

      resolvedLatitude = parsed.latitude;
      resolvedLongitude = parsed.longitude;
    }

    if (
      !cleanAddress &&
      !(resolvedLatitude && resolvedLongitude)
    ) {
      setErrorMessage(
        "اكتب عنوان التوصيل أو حدّد موقع العميل GPS.",
      );
      return;
    }

    if (!cleanValue) {
      setErrorMessage("من فضلك اكتب قيمة الطلب.");
      return;
    }

    const numericValue = Number(cleanValue);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setErrorMessage("من فضلك اكتب قيمة صحيحة للطلب أكبر من صفر.");
      return;
    }

    setLoading(true);

    try {
      await createOrder({
        customerName: cleanName,
        customerPhone: cleanPhone,
        deliveryAddress: cleanAddress,
        deliveryGovernorateId: governorateId,
        deliveryAreaId: areaId,
        deliveryLatitude:
          resolvedLatitude !== ""
            ? Number(resolvedLatitude)
            : null,
        deliveryLongitude:
          resolvedLongitude !== ""
            ? Number(resolvedLongitude)
            : null,
        subtotal: numericValue,
        offerCode: cleanOfferCode || null,
        customerNote: cleanNote,
      });

      setCustomerName("");
      setCustomerPhone("");
      setAddress("");
      setValue("");
      setOfferCode("");
      setNote("");
      setCustomerGpsLink("");
      setCustomerLatitude("");
      setCustomerLongitude("");
      setGovernorateId("");
      setAreaId("");
      setErrorMessage("");
      setSuccessMessage("تم إنشاء الطلب بنجاح.");

      setTimeout(() => {
        setSuccessMessage("");
      }, 10000);
    } catch (e: any) {
      setErrorMessage(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "تعذر إرسال الطلب. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <Text style={styles.eyebrow}>الطلبات</Text>

            <Text style={styles.title}>
              إنشاء طلب جديد
            </Text>

            <Text style={styles.subtitle}>
              {page === 1
                ? "أدخل بيانات الزبون وقيمة الطلب."
                : "حدد وجهة التوصيل وأضف أي ملاحظات."}
            </Text>

            <View style={styles.pageIndicator}>
              <View
                style={[
                  styles.pageDot,
                  page === 1 && styles.pageDotActive,
                ]}
              />
              <View
                style={[
                  styles.pageDot,
                  page === 2 && styles.pageDotActive,
                ]}
              />
            </View>

            {page === 1 ? (
              <>
                <Text style={styles.sectionTitle}>
                  بيانات الزبون
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    اسم الزبون
                  </Text>

                  <AppInput
                    placeholder="أدخل اسم الزبون"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    رقم الهاتف
                  </Text>

                  <AppInput
                    placeholder="أدخل رقم هاتف الزبون"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    عنوان التوصيل
                  </Text>

                  <AppInput
                    placeholder="أدخل عنوان التوصيل"
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    قيمة الطلب
                  </Text>

                  <AppInput
                    placeholder="0"
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                  />
                </View>

                <AppButton
                  title="التالي"
                  onPress={goNext}
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  وجهة التوصيل
                </Text>

                <View style={styles.locationCard}>
                  <LocationSelector
                    type="order"
                    governorateId={governorateId}
                    areaId={areaId}
                    onGovernorateChange={(id) => {
                      setGovernorateId(id);
                      setAreaId("");
                    }}
                    onAreaChange={setAreaId}
                  />

                  <Text style={styles.destinationText}>
                    اختر المحافظة ثم المنطقة التي سيتم توصيل
                    الطلب إليها.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    رابط موقع العميل
                  </Text>

                  <AppInput
                    placeholder="الصق رابط Google Maps هنا"
                    value={customerGpsLink}
                    onChangeText={(text) => {
                      setCustomerGpsLink(text);
                      if (!text.trim()) {
                        setCustomerLatitude("");
                        setCustomerLongitude("");
                      }
                    }}
                    onBlur={() => {
                      if (
                        customerGpsLink.trim() &&
                        !customerLatitude &&
                        !customerLongitude
                      ) {
                        parseGpsLink(customerGpsLink);
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    كود العرض
                  </Text>

                  <AppInput
                    placeholder="مثال: WEEKEND10"
                    value={offerCode}
                    onChangeText={setOfferCode}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    ملاحظات الطلب
                  </Text>

                  <AppInput
                    placeholder="أي ملاحظات إضافية"
                    value={note}
                    onChangeText={setNote}
                    multiline
                  />
                </View>

                <View style={styles.buttonRow}>
                  <View style={styles.buttonHalf}>
                    <AppButton
                      title="السابق"
                      secondary
                      onPress={() => {
                        setErrorMessage("");
                        setPage(1);
                      }}
                    />
                  </View>

                  <View style={styles.buttonHalf}>
                    <AppButton
                      title="إنشاء وإرسال الطلب"
                      onPress={submit}
                      loading={loading}
                    />
                  </View>
                </View>
              </>
            )}

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (appTheme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    keyboard: {
      flex: 1,
    },

    container: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 34,
      alignItems: "center",
    },

    formCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#F0D9BE",
      padding: 18,
      shadowColor: "#8A5A2E",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.09,
      shadowRadius: 18,
      elevation: 4,
    },

    eyebrow: {
      color: "#E5501C",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "center",
    },

    title: {
      color: "#24150B",
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
      marginTop: 3,
    },

    subtitle: {
      color: "#8A5A2E",
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 19,
      textAlign: "center",
      marginTop: 5,
      marginBottom: 14,
    },

    pageIndicator: {
      flexDirection: "row-reverse",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      marginBottom: 16,
    },

    pageDot: {
      width: 7,
      height: 7,
      borderRadius: 7,
      backgroundColor: "#F0D9BE",
    },

    pageDotActive: {
      width: 22,
      backgroundColor: "#E5501C",
    },

    sectionTitle: {
      color: "#8A5A2E",
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      marginBottom: 10,
    },

    inputGroup: {
      width: "100%",
      marginBottom: 10,
      gap: 6,
    },

    label: {
      color: "#24150B",
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
    },

    locationCard: {
      borderWidth: 1,
      borderColor: "#E7EAF0",
      borderRadius: 16,
      backgroundColor: "#FAFBFC",
      padding: 12,
      marginBottom: 12,
    },

    destinationText: {
      color: "#8A5A2E",
      fontSize: 11,
      lineHeight: 18,
      fontWeight: "600",
      textAlign: "right",
      marginTop: 8,
    },

    buttonRow: {
      flexDirection: "row-reverse",
      gap: 10,
      width: "100%",
      marginTop: 4,
    },

    buttonHalf: {
      flex: 1,
    },

    customerGpsCard: {
      marginTop: 4,
      marginBottom: 18,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#EADFD5",
      backgroundColor: "#FCFAF8",
    },

    customerGpsTitle: {
      color: "#2A180E",
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
    },

    customerGpsHint: {
      marginTop: 5,
      marginBottom: 12,
      color: "#7B6658",
      fontSize: 11,
      lineHeight: 18,
      textAlign: "right",
    },

    gpsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
    },

    gpsHalf: {
      flex: 1,
    },

    gpsLabel: {
      marginBottom: 6,
      color: "#6B5647",
      fontSize: 10,
      fontWeight: "800",
      textAlign: "right",
    },

    gpsSuccess: {
      marginTop: 10,
      color: "#267349",
      fontSize: 11,
      fontWeight: "800",
      textAlign: "right",
    },

    gpsOptional: {
      marginTop: 10,
      color: "#8A7769",
      fontSize: 10,
      lineHeight: 16,
      textAlign: "right",
    },

    successBox: {
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: "#ECFDF3",
      borderWidth: 1,
      borderColor: "#A7E3BC",
    },

    successText: {
      color: "#15803D",
      fontSize: 13,
      fontWeight: "900",
      textAlign: "center",
    },

    errorBox: {
      width: "100%",
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: "#FFF1F1",
      borderWidth: 1,
      borderColor: "#F3B4B4",
    },

    errorText: {
      color: "#B42318",
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 20,
      textAlign: "right",
    },
  });

