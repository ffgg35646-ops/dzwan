import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../api/request";

type SupportData = {
  phoneNumbers: string[];
  whatsapp: string[];
};

function phoneValue(value: string) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function whatsappUrl(value: string) {
  const raw = String(value || "").trim();

  if (
    /^https?:\/\/.*whatsapp/i.test(raw)
  ) {
    return raw;
  }

  let digits = raw.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0")) {
    digits = `964${digits.slice(1)}`;
  } else if (
    digits.startsWith("7") &&
    digits.length === 10
  ) {
    digits = `964${digits}`;
  }

  return `https://wa.me/${digits}`;
}

export default function SupportQuickAccess() {
  const [visible, setVisible] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [loaded, setLoaded] =
    useState(false);

  const [data, setData] =
    useState<SupportData>({
      phoneNumbers: [],
      whatsapp: [],
    });

  async function openSupport() {
    setVisible(true);

    if (loaded) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await apiGet("/support");

      setData({
        phoneNumbers:
          Array.isArray(
            response?.phoneNumbers,
          )
            ? response.phoneNumbers
            : [],
        whatsapp:
          Array.isArray(
            response?.whatsapp,
          )
            ? response.whatsapp
            : [],
      });

      setLoaded(true);
    } catch (error) {
      console.error(
        "Support load error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function callNumber(number: string) {
    const value =
      phoneValue(number);

    if (!value) return;

    try {
      await Linking.openURL(
        `tel:${value}`,
      );
    } catch (error) {
      console.error(
        "Support phone error:",
        error,
      );
    }
  }

  async function openQuickWhatsApp() {
    try {
      let numbers = data.whatsapp;

      if (!loaded) {
        setLoading(true);

        const response =
          await apiGet("/support");

        numbers =
          Array.isArray(response?.whatsapp)
            ? response.whatsapp
            : [];

        setData({
          phoneNumbers:
            Array.isArray(
              response?.phoneNumbers,
            )
              ? response.phoneNumbers
              : [],
          whatsapp: numbers,
        });

        setLoaded(true);
      }

      const number = numbers[0];

      if (!number) {
        return;
      }

      await openWhatsApp(number);
    } catch (error) {
      console.error(
        "Quick WhatsApp error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function openWhatsApp(
    number: string,
  ) {
    const url =
      whatsappUrl(number);

    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error(
        "Support WhatsApp error:",
        error,
      );
    }
  }

  return (
    <>
      <View style={styles.quickActions}>
        <Pressable
          onPress={() =>
            void openSupport()
          }
          style={({ pressed }) => [
            styles.trigger,
            pressed &&
              styles.triggerPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="الدعم والهاتف"
        >
          <Ionicons
            name="call-outline"
            size={21}
            color="#0F172A"
          />
        </Pressable>

        <Pressable
          onPress={() =>
            void openQuickWhatsApp()
          }
          disabled={loading}
          style={({ pressed }) => [
            styles.trigger,
            styles.whatsappTrigger,
            pressed &&
              styles.triggerPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="واتساب الدعم"
        >
          <Ionicons
            name="logo-whatsapp"
            size={21}
            color="#16A34A"
          />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <Pressable
          style={styles.overlay}
          onPress={() =>
            setVisible(false)
          }
        >
          <Pressable
            style={styles.card}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View
              style={styles.header}
            >
              <View>
                <Text
                  style={styles.title}
                >
                  الدعم
                </Text>

                <Text
                  style={styles.subtitle}
                >
                  تواصل معنا مباشرة
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setVisible(false)
                }
                style={styles.close}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#334155"
                />
              </Pressable>
            </View>

            {loading ? (
              <View
                style={styles.loading}
              >
                <ActivityIndicator />
                <Text
                  style={
                    styles.loadingText
                  }
                >
                  جاري تحميل بيانات الدعم...
                </Text>
              </View>
            ) : (
              <View
                style={styles.content}
              >
                {data.phoneNumbers
                  .length > 0 && (
                  <View>
                    <Text
                      style={
                        styles.section
                      }
                    >
                      أرقام الهاتف
                    </Text>

                    {data.phoneNumbers.map(
                      (number, index) => (
                        <Pressable
                          key={`phone-${number}-${index}`}
                          onPress={() =>
                            void callNumber(
                              number,
                            )
                          }
                          style={
                            styles.row
                          }
                        >
                          <View
                            style={[
                              styles.iconBox,
                              styles.phoneBox,
                            ]}
                          >
                            <Ionicons
                              name="call"
                              size={18}
                              color="#E87516"
                            />
                          </View>

                          <Text
                            style={
                              styles.number
                            }
                          >
                            {number}
                          </Text>

                          <Text
                            style={
                              styles.callText
                            }
                          >
                            اتصل
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                )}

                {data.whatsapp
                  .length > 0 && (
                  <View
                    style={{
                      marginTop:
                        data.phoneNumbers
                          .length > 0
                          ? 16
                          : 0,
                    }}
                  >
                    <Text
                      style={
                        styles.section
                      }
                    >
                      WhatsApp
                    </Text>

                    {data.whatsapp.map(
                      (number, index) => (
                        <Pressable
                          key={`wa-${number}-${index}`}
                          onPress={() =>
                            void openWhatsApp(
                              number,
                            )
                          }
                          style={
                            styles.row
                          }
                        >
                          <View
                            style={[
                              styles.iconBox,
                              styles.waBox,
                            ]}
                          >
                            <Ionicons
                              name="logo-whatsapp"
                              size={18}
                              color="#16A34A"
                            />
                          </View>

                          <Text
                            style={
                              styles.number
                            }
                          >
                            {number}
                          </Text>

                          <Text
                            style={
                              styles.waText
                            }
                          >
                            واتساب
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                )}

                {!data.phoneNumbers
                  .length &&
                  !data.whatsapp
                    .length && (
                    <View
                      style={
                        styles.empty
                      }
                    >
                      <Ionicons
                        name="headset-outline"
                        size={28}
                        color="#94A3B8"
                      />

                      <Text
                        style={
                          styles.emptyText
                        }
                      >
                        لا توجد بيانات دعم مضافة حاليًا.
                      </Text>
                    </View>
                  )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },


  trigger: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  whatsappTrigger: {
    backgroundColor: "#F0FDF4",
  },

  triggerPressed: {
    opacity: 0.7,
  },
  overlay: {
    flex: 1,
    backgroundColor:
      "rgba(15,23,42,.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    marginTop: 18,
  },
  section: {
    fontSize: 13,
    fontWeight: "900",
    color: "#334155",
    marginBottom: 8,
  },
  row: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneBox: {
    backgroundColor: "#FFF4E3",
  },
  waBox: {
    backgroundColor: "#ECFDF5",
  },
  number: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  callText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#E87516",
  },
  waText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#16A34A",
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
    gap: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
  },
});
