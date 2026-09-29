import { useAppTheme } from "../../theme/useAppTheme";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Screen from "../../components/Screen";
import LoadingState from "../../components/LoadingState";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";

export default function NotificationsScreen() {
  const appTheme = useAppTheme();
  const styles = createStyles(appTheme);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();

      const list =
        Array.isArray(data)
          ? data
          : data?.notifications ||
              data?.items ||
              [];

      setItems(list);
    } catch (error: any) {
      Alert.alert(
        "تعذر تحميل الإشعارات",
        error?.response?.data?.message ||
          "تعذر تحميل الإشعارات."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function readAll() {
    try {
      await markAllNotificationsRead();
      await load();
    } catch (error: any) {
      Alert.alert(
        "تعذر التنفيذ",
        error?.response?.data?.message ||
          "تعذر تحديث الإشعارات."
      );
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState message="جاري تحميل الإشعارات..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            الإشعارات
          </Text>

          <TouchableOpacity
            onPress={readAll}
            style={styles.readAll}
          >
            <Text style={styles.readAllText}>
              تعليم الكل كمقروء
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            String(
              item?._id ||
                item?.id ||
                index
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
            />
          }
          contentContainerStyle={
            items.length
              ? styles.list
              : styles.emptyList
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                item?.read === false &&
                  styles.unread,
              ]}
              onPress={async () => {
                const id =
                  item?._id ||
                  item?.id;

                if (!id) return;

                try {
                  await markNotificationRead(
                    String(id)
                  );
                  await load();
                } catch {}
              }}
            >
              <Text style={styles.subject}>
                {item?.title ||
                  item?.subject ||
                  "إشعار"}
              </Text>

              <Text style={styles.message}>
                {item?.message ||
                  item?.body ||
                  ""}
              </Text>

              {item?.createdAt && (
                <Text style={styles.date}>
                  {new Date(
                    item.createdAt
                  ).toLocaleString("ar-IQ")}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.icon}>
                🔔
              </Text>
              <Text style={styles.emptyText}>
                لا توجد إشعارات.
              </Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}

const createStyles = (appTheme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    gap: 10,
    marginBottom: 14,
  },
  title: {
    color: appTheme.textColor,
    fontSize: 29,
    fontWeight: "900",
    textAlign: "right",
  },
  readAll: {
    alignSelf: "flex-end",
  },
  readAllText: {
    color: appTheme.primaryDarkColor,
    fontWeight: "800",
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    padding: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: appTheme.borderColor,
    backgroundColor: appTheme.cardColor,
  },
  unread: {
    borderColor: appTheme.primaryColor,
    backgroundColor: "#FFF8E7",
  },
  subject: {
    color: appTheme.textColor,
    fontWeight: "900",
    textAlign: "right",
    fontSize: 16,
  },
  message: {
    marginTop: 7,
    color: appTheme.secondaryTextColor,
    lineHeight: 23,
    textAlign: "right",
  },
  date: {
    marginTop: 7,
    color: appTheme.secondaryTextColor,
    fontSize: 11,
    textAlign: "right",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 48,
  },
  emptyText: {
    marginTop: 10,
    color: appTheme.secondaryTextColor,
  },
});
