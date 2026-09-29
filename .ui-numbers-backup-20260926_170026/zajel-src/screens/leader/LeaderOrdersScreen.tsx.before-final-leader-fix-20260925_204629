import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiGet } from "../../api/request";

type OrderRow = Record<string, any>;

type Group =
  | "all"
  | "active"
  | "completed"
  | "rejected"
  | "other";

function unwrap(payload: any): any {
  return payload?.data ?? payload?.result ?? payload;
}

function toOrders(payload: any): OrderRow[] {
  const root = unwrap(payload);

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.orders)) return root.orders;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.rows)) return root.rows;
  if (Array.isArray(root?.data)) return root.data;

  return [];
}

function orderId(order: OrderRow): string {
  return String(
    order?._id ??
      order?.id ??
      ""
  );
}

function orderNumber(
  order: OrderRow
): string {
  return String(
    order?.orderNumber ??
      order?.number ??
      order?.orderNo ??
      order?.code ??
      ""
  );
}

function statusOf(
  order: OrderRow
): string {
  return String(
    order?.status ??
      order?.stage ??
      order?.state ??
      ""
  ).toLowerCase();
}

function isCompleted(
  order: OrderRow
): boolean {
  const s = statusOf(order);

  return (
    s.includes("completed") ||
    s.includes("complete") ||
    s.includes("delivered") ||
    s.includes("finished") ||
    s.includes("مكتمل") ||
    s.includes("تم التسليم")
  );
}

function isRejected(
  order: OrderRow
): boolean {
  const s = statusOf(order);

  return (
    s.includes("rejected") ||
    s.includes("reject") ||
    s.includes("مرفوض")
  );
}

function isCancelled(
  order: OrderRow
): boolean {
  const s = statusOf(order);

  return (
    s.includes("cancel") ||
    s.includes("ملغي")
  );
}

function classify(
  order: OrderRow
): Group {
  if (isCompleted(order)) {
    return "completed";
  }

  if (isRejected(order)) {
    return "rejected";
  }

  if (isCancelled(order)) {
    return "other";
  }

  return "active";
}

function labelForStatus(
  order: OrderRow
): string {
  const group =
    classify(order);

  if (group === "completed") {
    return "مكتمل";
  }

  if (group === "rejected") {
    return "مرفوض";
  }

  if (group === "active") {
    return "نشط";
  }

  return (
    String(
      order?.status ??
        order?.stage ??
        order?.state ??
        ""
    ) ||
    "أخرى"
  );
}

function displayName(
  value: any
): string {
  if (!value) return "";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return String(
    value?.name ??
      value?.fullName ??
      value?.title ??
      ""
  );
}

function restaurantName(
  order: OrderRow
): string {
  return (
    displayName(
      order?.establishment
    ) ||
    displayName(
      order?.restaurant
    ) ||
    displayName(
      order?.shop
    ) ||
    String(
      order?.establishmentName ??
        order?.restaurantName ??
        order?.shopName ??
        "المطعم / المحل"
    )
  );
}

function areaName(
  order: OrderRow
): string {
  return (
    displayName(order?.area) ||
    displayName(
      order?.deliveryArea
    ) ||
    displayName(
      order?.serviceArea
    ) ||
    String(
      order?.areaName ??
        order?.deliveryAreaName ??
        ""
    ) ||
    displayName(
      order?.establishment?.area
    ) ||
    displayName(
      order?.restaurant?.area
    ) ||
    displayName(
      order?.shop?.area
    ) ||
    "منطقة غير محددة"
  );
}

function customerName(
  order: OrderRow
): string {
  return (
    displayName(
      order?.customer
    ) ||
    String(
      order?.customerName ??
        ""
    ) ||
    "العميل"
  );
}

export default function LeaderOrdersScreen() {
  const [orders, setOrders] =
    useState<OrderRow[]>([]);
  const [searchResults, setSearchResults] =
    useState<OrderRow[]>([]);
  const [query, setQuery] =
    useState("");
  const [filter, setFilter] =
    useState<Group>("all");
  const [selectedOrder, setSelectedOrder] =
    useState<OrderRow | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [searching, setSearching] =
    useState(false);
  const [error, setError] =
    useState("");

  const load = useCallback(
    async () => {
      try {
        setError("");

        const response =
          await apiGet(
            "/leaders/me/orders?limit=10000"
          );

        setOrders(
          toOrders(response)
        );
      } catch (err) {
        console.warn(
          "Leader orders error:",
          err
        );

        setError(
          "تعذر تحميل الطلبات."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();

    const timer =
      setInterval(
        load,
        30000
      );

    return () =>
      clearInterval(timer);
  }, [load]);

  // بحث فوري حقيقي من السيرفر.
  // مثال: 3 يرجع 3 و33 و333 وغيرها.
  useEffect(() => {
    const value =
      query.trim();

    if (!value) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer =
      setTimeout(
        async () => {
          try {
            setSearching(true);

            let response;

            try {
              response =
                await apiGet(
                  `/orders?search=${encodeURIComponent(
                    value
                  )}&limit=100`
                );
            } catch {
              response =
                await apiGet(
                  `/leaders/me/orders?search=${encodeURIComponent(
                    value
                  )}&limit=100`
                );
            }

            if (!cancelled) {
              setSearchResults(
                toOrders(
                  response
                )
              );
            }
          } catch (err) {
            console.warn(
              "Leader live search error:",
              err
            );

            if (!cancelled) {
              setSearchResults(
                []
              );
            }
          } finally {
            if (!cancelled) {
              setSearching(false);
            }
          }
        },
        180
      );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const hasSearch =
    query.trim().length > 0;

  // أثناء البحث لا نطبق فلتر الحالة.
  const visibleOrders =
    useMemo(() => {
      const source =
        hasSearch
          ? searchResults
          : orders;

      if (
        hasSearch ||
        filter === "all"
      ) {
        return source;
      }

      return source.filter(
        (order) =>
          classify(order) ===
          filter
      );
    }, [
      hasSearch,
      query,
      orders,
      searchResults,
      filter,
    ]);

  function openOrder(
    order: OrderRow
  ) {
    const group =
      classify(order);

    setFilter(group);
    setQuery("");
    setSelectedOrder(order);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />
        <Text
          style={
            styles.centerText
          }
        >
          جاري تحميل الطلبات...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            الطلبات
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            ابحث في كل الطلبات داخل نطاقك
          </Text>
        </View>

        <Pressable
          onPress={load}
          style={
            styles.refreshButton
          }
        >
          <Text
            style={
              styles.refreshText
            }
          >
            تحديث
          </Text>
        </Pressable>
      </View>

      <View
        style={styles.searchBox}
      >
        <Text
          style={styles.searchIcon}
        >
          🔎
        </Text>

        <TextInput
          value={query}
          onChangeText={
            setQuery
          }
          placeholder="اكتب رقم الطلب مثل 3..."
          placeholderTextColor="#98A2B3"
          style={
            styles.searchInput
          }
          textAlign="right"
          autoCorrect={false}
          autoCapitalize="none"
        />

        {query ? (
          <Pressable
            onPress={() =>
              setQuery("")
            }
            style={
              styles.clearButton
            }
          >
            <Text
              style={
                styles.clearText
              }
            >
              ×
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      {hasSearch ? (
        <View
          style={
            styles.searchResultCard
          }
        >
          <View
            style={
              styles.searchHeader
            }
          >
            <Text
              style={
                styles.searchTitle
              }
            >
              نتائج البحث
            </Text>

            <Text
              style={
                styles.count
              }
            >
              {searchResults.length}
            </Text>
          </View>

          {searching ? (
            <View
              style={
                styles.searching
              }
            >
              <ActivityIndicator />
              <Text
                style={
                  styles.searchingText
                }
              >
                جاري البحث...
              </Text>
            </View>
          ) : searchResults.length ===
            0 ? (
            <Text
              style={
                styles.emptyText
              }
            >
              لا يوجد طلب مطابق لـ "{query}"
            </Text>
          ) : (
            searchResults
              .slice(0, 50)
              .map(
                (order) => (
                  <Pressable
                    key={
                      orderId(
                        order
                      ) ||
                      orderNumber(
                        order
                      )
                    }
                    onPress={() =>
                      openOrder(
                        order
                      )
                    }
                    style={
                      styles.resultRow
                    }
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.orderNumber
                        }
                      >
                        #
                        {
                          orderNumber(
                            order
                          )
                        }
                      </Text>

                      <Text
                        style={
                          styles.secondary
                        }
                      >
                        {
                          restaurantName(
                            order
                          )
                        }
                      </Text>

                      <Text
                        style={
                          styles.secondary
                        }
                      >
                        {areaName(
                          order
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.statusPill
                      }
                    >
                      <Text
                        style={
                          styles.statusText
                        }
                      >
                        {
                          labelForStatus(
                            order
                          )
                        }
                      </Text>
                    </View>
                  </Pressable>
                )
              )
          )}
        </View>
      ) : null}

      <View
        style={styles.filters}
      >
        {[
          ["all", "الكل"],
          ["active", "نشط"],
          ["completed", "مكتمل"],
          ["rejected", "مرفوض"],
          ["other", "أخرى"],
        ].map(
          ([key, label]) => {
            const selected =
              filter === key;

            return (
              <Pressable
                key={key}
                onPress={() =>
                  setFilter(
                    key as Group
                  )
                }
                style={[
                  styles.filterButton,
                  selected &&
                    styles.filterActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected &&
                      styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>

      {!hasSearch ? (
        <ScrollView
          style={{
            flex: 1,
          }}
          contentContainerStyle={
            styles.scroll
          }
        >
          {visibleOrders.map(
            (order) => (
              <Pressable
                key={
                  orderId(
                    order
                  ) ||
                  orderNumber(
                    order
                  )
                }
                onPress={() =>
                  openOrder(
                    order
                  )
                }
                style={
                  styles.orderCard
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.orderNumber
                    }
                  >
                    #
                    {
                      orderNumber(
                        order
                      )
                    }
                  </Text>

                  <Text
                    style={
                      styles.secondary
                    }
                  >
                    {
                      restaurantName(
                        order
                      )
                    }
                  </Text>

                  <Text
                    style={
                      styles.secondary
                    }
                  >
                    {areaName(
                      order
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.statusPill
                  }
                >
                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {
                      labelForStatus(
                        order
                      )
                    }
                  </Text>
                </View>
              </Pressable>
            )
          )}

          {visibleOrders.length ===
          0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <Text
                style={
                  styles.emptyText
                }
              >
                لا توجد طلبات في هذا القسم.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <Modal
        visible={
          !!selectedOrder
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectedOrder(
            null
          )
        }
      >
        <View
          style={
            styles.modalBackdrop
          }
        >
          <View
            style={styles.modal}
          >
            {selectedOrder ? (
              <>
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      الطلب #
                      {
                        orderNumber(
                          selectedOrder
                        )
                      }
                    </Text>

                    <Text
                      style={
                        styles.modalStatus
                      }
                    >
                      {
                        labelForStatus(
                          selectedOrder
                        )
                      }
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      setSelectedOrder(
                        null
                      )
                    }
                  >
                    <Text
                      style={
                        styles.close
                      }
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>

                <Info
                  label="المطعم / المحل"
                  value={restaurantName(
                    selectedOrder
                  )}
                />

                <Info
                  label="المنطقة"
                  value={areaName(
                    selectedOrder
                  )}
                />

                <Info
                  label="العميل"
                  value={customerName(
                    selectedOrder
                  )}
                />

                <Info
                  label="الحالة"
                  value={labelForStatus(
                    selectedOrder
                  )}
                />

                <Info
                  label="معرف الطلب"
                  value={orderId(
                    selectedOrder
                  )}
                />

                <Text
                  style={
                    styles.modalHint
                  }
                >
                  تم فتح الطلب داخل قسم حالته
                  الصحيح.
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={styles.infoRow}
    >
      <Text
        style={styles.infoValue}
      >
        {value || "-"}
      </Text>

      <Text
        style={styles.infoLabel}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  centerText: {
    marginTop: 10,
    color: "#667085",
    fontSize: 13,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  title: {
    color: "#101828",
    fontSize: 23,
    fontWeight: "900",
    textAlign: "right",
  },

  subtitle: {
    marginTop: 3,
    color: "#667085",
    fontSize: 11,
    textAlign: "right",
  },

  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },

  refreshText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
  },

  searchBox: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 16,
    paddingHorizontal: 11,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    minHeight: 50,
    color: "#101828",
    fontSize: 14,
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
  },

  clearText: {
    color: "#475467",
    fontSize: 19,
  },

  error: {
    marginTop: 9,
    color: "#B42318",
    fontSize: 11,
    textAlign: "right",
  },

  searchResultCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 18,
    padding: 12,
  },

  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  searchTitle: {
    color: "#101828",
    fontSize: 15,
    fontWeight: "900",
  },

  count: {
    minWidth: 29,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
  },

  searching: {
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },

  searchingText: {
    color: "#667085",
    fontSize: 11,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
  },

  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginTop: 9,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  orderNumber: {
    color: "#101828",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },

  secondary: {
    marginTop: 2,
    color: "#667085",
    fontSize: 11,
    textAlign: "right",
  },

  statusPill: {
    minWidth: 68,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
  },

  statusText: {
    color: "#344054",
    fontSize: 10,
    fontWeight: "800",
  },

  filters: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 5,
  },

  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    alignItems: "center",
  },

  filterActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  filterText: {
    color: "#475467",
    fontSize: 10,
    fontWeight: "800",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  scroll: {
    paddingBottom: 30,
  },

  emptyCard: {
    marginTop: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  emptyText: {
    color: "#667085",
    fontSize: 11,
    textAlign: "right",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      "rgba(15,23,42,0.42)",
    justifyContent: "center",
    padding: 18,
  },

  modal: {
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },

  modalTitle: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
  },

  modalStatus: {
    marginTop: 3,
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  close: {
    color: "#667085",
    fontSize: 26,
  },

  infoRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  infoLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "700",
  },

  infoValue: {
    flex: 1,
    color: "#101828",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "left",
  },

  modalHint: {
    marginTop: 13,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "right",
  },
});
