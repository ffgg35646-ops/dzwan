import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getNotifications,
  markAllNotificationsRead,
} from "../../api/notifications";

type NotificationItem = {
  _id?: string;
  id?: string;
  title?: string;
  subject?: string;
  message?: string;
  body?: string;
  createdAt?: string;
  read?: boolean;
  isRead?: boolean;
};

const SEEN_NOTIFICATIONS_KEY =
  "@dzwan/admin-notifications-seen-v1";

function normalizeNotifications(data: any): NotificationItem[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function notificationKey(
  item: NotificationItem,
): string {
  if (item?._id) {
    return String(item._id);
  }

  if (item?.id) {
    return String(item.id);
  }

  return [
    item?.createdAt || "",
    item?.title || item?.subject || "",
    item?.message || item?.body || "",
  ].join("|");
}

async function readSeenKeys(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(
      SEEN_NOTIFICATIONS_KEY,
    );

    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed
        .filter(
          (value): value is string =>
            typeof value === "string",
        )
        .map(String),
    );
  } catch {
    return new Set();
  }
}

async function writeSeenKeys(
  keys: Set<string>,
) {
  const values = Array.from(keys);

  // نحتفظ بعدد كبير حتى لا ترجع الإشعارات القديمة
  // كإشعارات جديدة بعد فترة طويلة.
  const trimmed = values.slice(-2000);

  await AsyncStorage.setItem(
    SEEN_NOTIFICATIONS_KEY,
    JSON.stringify(trimmed),
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<
    NotificationItem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const loadNotifications = useCallback(
    async (initialize = false) => {
      try {
        const [data, seen] = await Promise.all([
          getNotifications(),
          readSeenKeys(),
        ]);

        const list =
          normalizeNotifications(data);

        setItems(list);

        // أول مرة بعد تركيب النظام:
        // نعتبر الإشعارات القديمة كلها مشاهدة.
        if (initialize) {
          const initialKeys =
            new Set(seen);

          for (const item of list) {
            initialKeys.add(
              notificationKey(item),
            );
          }

          await writeSeenKeys(initialKeys);
          setCount(0);
          return;
        }

        const unseenCount = list.filter(
          (item) =>
            !seen.has(notificationKey(item)),
        ).length;

        if (openRef.current) {
          setCount(0);
        } else {
          setCount(unseenCount);
        }

        setError("");
      } catch {
        if (!openRef.current) {
          setCount(0);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function firstLoad() {
      try {
        const initialized =
          await AsyncStorage.getItem(
            `${SEEN_NOTIFICATIONS_KEY}:initialized`,
          );

        if (!initialized) {
          await loadNotifications(true);

          await AsyncStorage.setItem(
            `${SEEN_NOTIFICATIONS_KEY}:initialized`,
            "1",
          );
        } else {
          await loadNotifications(false);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    }

    void firstLoad();

    const timer = setInterval(() => {
      void loadNotifications(false);
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [loadNotifications]);

  async function openMenu() {
    setOpen(true);
    openRef.current = true;
    setCount(0);
    setLoading(true);
    setError("");

    try {
      const data = await getNotifications();

      const list =
        normalizeNotifications(data);

      setItems(list);

      /*
       * أي إشعار موجود لحظة فتح الجرس
       * يعتبره المستخدم قد شاهده.
       *
       * لذلك بعد Refresh لن يعود الرقم القديم.
       * فقط ID جديد سيظهر كإشعار جديد.
       */
      const seen =
        await readSeenKeys();

      for (const item of list) {
        seen.add(notificationKey(item));
      }

      await writeSeenKeys(seen);

      setCount(0);

      // نحاول أيضًا تحديث حالة القراءة في الباك إند.
      // لكن العداد المحلي لا يعتمد عليها.
      try {
        await markAllNotificationsRead();
      } catch {}
    } catch {
      setError("تعذر تحميل الإشعارات.");
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  function closeMenu() {
    setOpen(false);
    openRef.current = false;
  }

  return (
    <>
      <Pressable
        onPress={() => {
          if (open) {
            closeMenu();
          } else {
            void openMenu();
          }
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="الإشعارات"
      >
        <Ionicons
          name="notifications-outline"
          size={22}
          color="#0F172A"
        />

        {count > 0 ? (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeMenu}
          />

          <View
            pointerEvents="box-none"
            style={styles.appFrame}
          >
            <View style={styles.menu}>
              <View style={styles.menuHead}>
                <View>
                  <Text style={styles.menuTitle}>
                    الإشعارات
                  </Text>

                  <Text style={styles.menuSub}>
                    إشعارات الإدارة
                  </Text>
                </View>

                <Pressable
                  onPress={closeMenu}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={17}
                    color="#64748B"
                  />
                </Pressable>
              </View>

              {loading ? (
                <View
                  style={{
                    paddingVertical: 30,
                    alignItems: "center",
                  }}
                >
                  <Text style={styles.cardSmall}>
                    جاري تحميل الإشعارات...
                  </Text>
                </View>
              ) : error ? (
                <View
                  style={{
                    paddingVertical: 30,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      styles.cardSmall,
                      {
                        color: "#DC2626",
                      },
                    ]}
                  >
                    {error}
                  </Text>
                </View>
              ) : items.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 30,
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="notifications-off-outline"
                    size={34}
                    color="#94A3B8"
                  />

                  <Text
                    style={[
                      styles.cardSmall,
                      {
                        marginTop: 8,
                      },
                    ]}
                  >
                    لا توجد إشعارات.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: 10,
                    paddingBottom: 4,
                  }}
                >
                  {items.map(
                    (item, index) => {
                      const title =
                        item?.title ||
                        item?.subject ||
                        "إشعار";

                      const message =
                        item?.message ||
                        item?.body ||
                        "";

                      return (
                        <View
                          key={String(
                            item?._id ||
                              item?.id ||
                              index,
                          )}
                          style={styles.card}
                        >
                          <View
                            style={styles.cardIcon}
                          >
                            <Ionicons
                              name="notifications-outline"
                              size={19}
                              color="#1257D6"
                            />
                          </View>

                          <View
                            style={styles.cardBody}
                          >
                            <Text
                              style={styles.cardTitle}
                              numberOfLines={2}
                            >
                              {title}
                            </Text>

                            {message ? (
                              <Text
                                style={[
                                  styles.cardSmall,
                                  {
                                    marginTop: 5,
                                  },
                                ]}
                                numberOfLines={5}
                              >
                                {message}
                              </Text>
                            ) : null}

                            {item?.createdAt ? (
                              <Text
                                style={[
                                  styles.cardSmall,
                                  {
                                    marginTop: 5,
                                    fontSize: 10,
                                  },
                                ]}
                              >
                                {new Date(
                                  item.createdAt,
                                ).toLocaleString(
                                  "ar-IQ-u-nu-latn",
                                )}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    },
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.98)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  pressed: {
    opacity: 0.75,
  },

  totalBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  totalBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  modalRoot: {
    flex: 1,
    position: "relative",
    alignItems: "center",
  },

  appFrame: {
    width: "100%",
    maxWidth: 390,
    height: "100%",
    position: "relative",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },

  menu: {
    position: "absolute",
    padding: 10,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.98)",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    elevation: 14,
  },

  menuHead: {
    minHeight: 38,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },

  menuSub: {
    marginTop: 2,
    fontSize: 10,
    color: "#94A3B8",
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(241,245,249,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    minHeight: 76,
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.90)",
    backgroundColor: "rgba(248,250,252,0.82)",
  },

  cardPressed: {
    opacity: 0.72,
  },

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,244,227,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  cardBody: {
    flex: 1,
    minWidth: 0,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
  },

  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },

  cardSmall: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 18,
    color: "#64748B",
  },

  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});
