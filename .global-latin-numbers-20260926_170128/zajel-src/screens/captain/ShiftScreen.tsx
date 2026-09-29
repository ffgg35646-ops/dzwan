import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../../components/Screen";
import {
  checkShift,
  getAvailableShifts,
  selectWeeklyShift,
} from "../../api/captain";

function formatShiftTime(value: any) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "--:--";
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return raw;
  }

  let hour = Number(match[1]);
  const minute = match[2];

  if (!Number.isFinite(hour)) {
    return raw;
  }

  const suffix = hour >= 12 ? "م" : "ص";

  hour = hour % 12;
  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${suffix}`;
}

function getShiftId(item: any) {
  return String(
    item?._id ??
      item?.id ??
      "",
  );
}

function getShiftStart(item: any) {
  return (
    item?.startTime ??
    item?.start ??
    item?.from ??
    ""
  );
}

function getShiftEnd(item: any) {
  return (
    item?.endTime ??
    item?.end ??
    item?.to ??
    ""
  );
}

function getShifts(result: any) {
  const candidates = [
    result?.data,
    result?.shifts,
    result?.data?.shifts,
    result?.items,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export default function ShiftScreen() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const [actionMessage, setActionMessage] =
    useState("");
const selectedShiftId = String(
    assignment?.shiftId?._id ??
      assignment?.shiftId?.id ??
      assignment?.shiftId ??
      "",
  );

  async function load() {
    try {
      setLoading(true);

      let shiftsResult: any = null;
      let currentResult: any = null;

      try {
        shiftsResult = await getAvailableShifts();

        console.log(
          "🟣 AVAILABLE SHIFTS RESULT:",
          JSON.stringify(shiftsResult, null, 2),
        );
      } catch (error: any) {
        console.log(
          "🔴 AVAILABLE SHIFTS ERROR:",
          error?.response?.status,
          error?.response?.data ||
            error?.message ||
            error,
        );

        throw error;
      }

      try {
        currentResult = await checkShift();

        console.log(
          "🟣 CURRENT SHIFT RESULT:",
          JSON.stringify(currentResult, null, 2),
        );
      } catch (error: any) {
        console.log(
          "🔴 CURRENT SHIFT ERROR:",
          error?.response?.status,
          error?.response?.data ||
            error?.message ||
            error,
        );
      }

      setShifts(getShifts(shiftsResult));

      setAssignment(
        currentResult?.assignment ??
          null,
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر تحميل الشفتات",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "تعذر الاتصال بالخادم.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function chooseShift(id: string) {
    if (!id || savingRef.current || savingId) {
      return;
    }

    if (selectedShiftId) {
      setActionMessage(
        "تم تثبيت الشفت لمدة 7 أيام، ولا يمكن تغييره خلال هذه المدة.",
      );
      return;
    }

    console.log("SHIFT CLICKED:", id);

    savingRef.current = true;
    setActionMessage("جاري حفظ الشفت...");
    setSavingId(id);

    try {
      await selectWeeklyShift(id);

      setActionMessage(
        "✅ تم اختيار الشفت وتثبيته لمدة 7 أيام.",
      );

      await load();
    } catch (error: any) {
      console.log(
        "SHIFT SAVE ERROR:",
        error?.response?.data ||
          error?.message ||
          error,
      );

      setActionMessage(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "تعذر اختيار الشفت.",
      );
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  }

  const orderedShifts = selectedShiftId
    ? [
        ...shifts.filter(
          (item) =>
            getShiftId(item) ===
            selectedShiftId,
        ),
        ...shifts.filter(
          (item) =>
            getShiftId(item) !==
            selectedShiftId,
        ),
      ]
    : shifts;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              جدول العمل
            </Text>

            <Text style={styles.title}>
              الشفتات
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="time-outline"
              size={24}
              color="#F97316"
            />
          </View>
        </View>

        <Text style={styles.subtitle}>
          اختر شفتك من المواعيد التي حددتها الإدارة.
        </Text>

        {actionMessage ? (
          <View style={styles.actionMessage}>
            <Text style={styles.actionMessageText}>
              {actionMessage}
            </Text>
          </View>
        ) : null}


        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="small"
              color="#F97316"
            />

            <Text style={styles.loadingText}>
              جاري تحميل الشفتات...
            </Text>
          </View>
        ) : shifts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="calendar-outline"
              size={38}
              color="#B8AAA0"
            />

            <Text style={styles.emptyTitle}>
              لا توجد شفتات متاحة
            </Text>

            <Text style={styles.emptyText}>
              ستظهر هنا الشفتات التي تحددها الإدارة.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {selectedShiftId ? (
              <View
                style={{
                  marginBottom: 12,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: "#F3F4F6",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                }}
              >
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: 12,
                    lineHeight: 19,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  تم تثبيت الشفت الحالي.
                  {"\n"}
                  لا يمكن تغييره خلال مدة الـ7 أيام الحالية.
                  {"\n"}
                  سيظهر اختيار شفت جديد بعد انتهاء المدة.
                </Text>
              </View>
            ) : null}

            {orderedShifts.map((item) => {
              const id = getShiftId(item);

              if (!id) {
                return null;
              }

              const selected =
                selectedShiftId === id;

              const start = formatShiftTime(
                getShiftStart(item),
              );

              const end = formatShiftTime(
                getShiftEnd(item),
              );

              const busy =
                savingId === id;

              return (
                <TouchableOpacity
                  key={id}
                  disabled={
                    Boolean(savingId) ||
                    Boolean(selectedShiftId) ||
                    selected
                  }
                  activeOpacity={0.82}
                  onPress={() => {
                    void chooseShift(id);
                  }}
                  style={[
                    styles.shiftCard,
                    selected &&
                      styles.shiftCardSelected,
                    selected &&
                      styles.shiftCardSelectedLarge,
                    selectedShiftId &&
                      !selected &&
                      {
                        opacity: 0.45,
                      },
                  ]}
                >
                  <View style={styles.timeIcon}>
                    <Ionicons
                      name="time-outline"
                      size={23}
                      color={
                        selected
                          ? "#F97316"
                          : "#8D8175"
                      }
                    />
                  </View>

                  <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>
                      {selected
                        ? "الشفت الحالي المثبت"
                        : "موعد الشفت"}
                    </Text>

                    <Text style={styles.timeText}>
                      {start} – {end}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.choice,
                      selected &&
                        styles.choiceSelected,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator
                        size="small"
                        color="#F97316"
                      />
                    ) : selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={25}
                        color="#16A34A"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.choiceText,
                          selected &&
                            styles.choiceTextSelected,
                        ]}
                      >
                        {selected
                          ? "مثبت"
                          : "اختيار"}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9A8E84",
    textAlign: "right",
  },

  title: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "900",
    color: "#2F241C",
    textAlign: "right",
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFF2E8",
    alignItems: "center",
    justifyContent: "center",
  },

  subtitle: {
    marginTop: 12,
    marginBottom: 14,
    color: "#8D8175",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "right",
  },

  actionMessage: {
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  actionMessageText: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },

  loading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#8D8175",
    fontWeight: "700",
  },

  empty: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#FFF9F4",
    borderWidth: 1,
    borderColor: "#EEDFD2",
    padding: 28,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    color: "#2F241C",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#8D8175",
    textAlign: "center",
  },

  list: {
    paddingBottom: 24,
  },

  shiftCard: {
    minHeight: 78,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED7",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  shiftCardSelected: {
    backgroundColor: "#FFF8F0",
    borderColor: "#FDBA74",
  },

  shiftCardSelectedLarge: {
    minHeight: 100,
    paddingVertical: 15,
    borderWidth: 2,
    shadowColor: "#F97316",
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  shiftCardPressed: {
    opacity: 0.9,
  },

  timeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF2E8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  timeBox: {
    flex: 1,
  },

  timeLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9A8E84",
    textAlign: "right",
  },

  timeText: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "900",
    color: "#2F241C",
    textAlign: "right",
  },

  choice: {
    minWidth: 78,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FFF2E8",
    alignItems: "center",
    justifyContent: "center",
  },

  choiceSelected: {
    backgroundColor: "#DCFCE7",
  },

  choiceText: {
    color: "#F97316",
    fontSize: 12,
    fontWeight: "900",
  },

  choiceTextSelected: {
    color: "#16A34A",
  },
});
