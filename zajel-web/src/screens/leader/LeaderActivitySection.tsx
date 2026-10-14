import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiGet } from "../../api/request";

type Row = Record<string, any>;

type AreaStat = {
  key: string;
  id: string;
  name: string;
  orders: number;
  restaurants: number;
  restaurantIds: Set<string>;
};

type RestaurantStat = {
  key: string;
  name: string;
  orders: number;
  areaName: string;
};

function unwrap(payload: any): any {
  return payload?.data ?? payload?.result ?? payload;
}

function arrayOf(
  payload: any,
  keys: string[]
): Row[] {
  const root = unwrap(payload);

  if (Array.isArray(root)) return root;

  for (const key of keys) {
    if (Array.isArray(root?.[key])) {
      return root[key];
    }
  }

  if (Array.isArray(root?.items)) {
    return root.items;
  }

  if (Array.isArray(root?.rows)) {
    return root.rows;
  }

  if (Array.isArray(root?.data)) {
    return root.data;
  }

  return [];
}

function idOf(value: any): string {
  if (value == null) return "";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return String(
    value?._id ??
      value?.id ??
      value?.value ??
      ""
  );
}

function nameOf(
  value: any,
  fallback = ""
): string {
  if (value == null) return fallback;

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return String(
    value?.name ??
      value?.title ??
      value?.fullName ??
      value?.label ??
      fallback
  );
}

function establishmentId(
  row: Row
): string {
  return idOf(
    row?.establishmentId ??
      row?.restaurantId ??
      row?.shopId ??
      row?.establishment?._id ??
      row?.restaurant?._id ??
      row?.shop?._id
  );
}

function areaId(
  row: Row
): string {
  return idOf(
    row?.areaId ??
      row?.deliveryAreaId ??
      row?.serviceAreaId ??
      row?.area?._id ??
      row?.deliveryArea?._id ??
      row?.serviceArea?._id ??
      row?.establishment?.areaId ??
      row?.restaurant?.areaId ??
      row?.shop?.areaId
  );
}

function areaName(
  row: Row
): string {
  return (
    nameOf(row?.area) ||
    nameOf(row?.deliveryArea) ||
    nameOf(row?.serviceArea) ||
    String(row?.areaName ?? "") ||
    String(row?.deliveryAreaName ?? "") ||
    nameOf(row?.establishment?.area) ||
    nameOf(row?.restaurant?.area) ||
    nameOf(row?.shop?.area) ||
    ""
  );
}

function establishmentName(
  row: Row,
  map: Map<string, Row>
): string {
  return (
    nameOf(row?.establishment) ||
    nameOf(row?.restaurant) ||
    nameOf(row?.shop) ||
    String(
      row?.establishmentName ??
        row?.restaurantName ??
        row?.shopName ??
        ""
    ) ||
    nameOf(
      map.get(
        establishmentId(row)
      ),
      "مطعم / محل"
    )
  );
}

function scopeAreaMap(
  payload: any
): Map<string, string> {
  const map = new Map<string, string>();

  function visit(value: any) {
    if (!value) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (
      typeof value !== "object"
    ) {
      return;
    }

    const id = idOf(value);
    const name = nameOf(value);

    if (id && name) {
      map.set(id, name);
    }

    if (value.areas) {
      visit(value.areas);
    }

    if (value.scope) {
      visit(value.scope);
    }

    if (value.data) {
      visit(value.data);
    }
  }

  visit(unwrap(payload));

  return map;
}

export default function LeaderActivitySection() {
  const [orders, setOrders] =
    useState<Row[]>([]);
  const [establishments, setEstablishments] =
    useState<Row[]>([]);
  const [scopeAreas, setScopeAreas] =
    useState<Map<string, string>>(
      new Map()
    );
  const [selectedArea, setSelectedArea] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState("");

  const load = useCallback(
    async () => {
      try {
        setError("");

        const [
          ordersResponse,
          establishmentsResponse,
          scopeResponse,
        ] = await Promise.all([
          apiGet(
            "/leaders/me/orders?limit=10000"
          ),
          apiGet(
            "/leaders/me/establishments?limit=10000"
          ),
          apiGet(
            "/leaders/me/scope"
          ),
        ]);

        setOrders(
          arrayOf(
            ordersResponse,
            ["orders"]
          )
        );

        setEstablishments(
          arrayOf(
            establishmentsResponse,
            [
              "establishments",
              "restaurants",
              "shops",
            ]
          )
        );

        setScopeAreas(
          scopeAreaMap(scopeResponse)
        );
      } catch (err) {
        console.warn(
          "Leader activity error:",
          err
        );
        setError(
          "تعذر تحديث نشاط المناطق."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
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

  const establishmentMap =
    useMemo(() => {
      const map =
        new Map<string, Row>();

      for (const row of establishments) {
        const id = idOf(row);

        if (id) {
          map.set(id, row);
        }
      }

      return map;
    }, [establishments]);

  const areas =
    useMemo<AreaStat[]>(() => {
      const map =
        new Map<string, AreaStat>();

      function getArea(
        row: Row
      ): AreaStat {
        const id =
          areaId(row);

        const name =
          areaName(row) ||
          scopeAreas.get(id) ||
          "منطقة غير محددة";

        const key =
          id ||
          `name:${name}`;

        const existing =
          map.get(key);

        if (existing) {
          return existing;
        }

        const created: AreaStat = {
          key,
          id,
          name,
          orders: 0,
          restaurants: 0,
          restaurantIds:
            new Set<string>(),
        };

        map.set(
          key,
          created
        );

        return created;
      }

      // الطلبات كلها تدخل في نشاط المنطقة.
      for (const order of orders) {
        const area =
          getArea(order);

        area.orders += 1;

        const estId =
          establishmentId(order);

        if (estId) {
          area.restaurantIds.add(
            estId
          );
        }
      }

      // نضيف المطاعم حتى لو عدد طلباتها صفر.
      for (
        const restaurant of establishments
      ) {
        const area =
          getArea(
            restaurant
          );

        const estId =
          idOf(restaurant);

        if (estId) {
          area.restaurantIds.add(
            estId
          );
        }
      }

      return [...map.values()]
        .map((area) => ({
          ...area,
          restaurants:
            area.restaurantIds.size,
        }))
        .sort(
          (a, b) =>
            b.orders - a.orders ||
            b.restaurants -
              a.restaurants
        )
        .slice(0, 15);
    }, [
      orders,
      establishments,
      scopeAreas,
    ]);

  const topRestaurants =
    useMemo<RestaurantStat[]>(
      () => {
        const map =
          new Map<
            string,
            RestaurantStat
          >();

        for (const order of orders) {
          const estId =
            establishmentId(order);

          const restaurant =
            establishmentMap.get(
              estId
            );

          const aId =
            areaId(order) ||
            areaId(restaurant || {});

          const aName =
            areaName(order) ||
            areaName(
              restaurant || {}
            ) ||
            scopeAreas.get(aId) ||
            "منطقة غير محددة";

          const name =
            establishmentName(
              order,
              establishmentMap
            );

          const key =
            estId ||
            `${name}:${aId}`;

          const current =
            map.get(key);

          if (current) {
            current.orders += 1;
          } else {
            map.set(key, {
              key,
              name,
              orders: 1,
              areaName: aName,
            });
          }
        }

        return [...map.values()]
          .sort(
            (a, b) =>
              b.orders - a.orders
          )
          .slice(0, 10);
      },
      [
        orders,
        establishmentMap,
        scopeAreas,
      ]
    );

  const selectedRestaurants =
    useMemo<RestaurantStat[]>(
      () => {
        if (!selectedArea) {
          return [];
        }

        const selected =
          areas.find(
            (area) =>
              area.key ===
              selectedArea
          );

        if (!selected) {
          return [];
        }

        const map =
          new Map<
            string,
            RestaurantStat
          >();

        for (const order of orders) {
          const estId =
            establishmentId(order);

          const restaurant =
            establishmentMap.get(
              estId
            );

          const aId =
            areaId(order) ||
            areaId(restaurant || {});

          const aName =
            areaName(order) ||
            areaName(
              restaurant || {}
            ) ||
            scopeAreas.get(aId) ||
            "منطقة غير محددة";

          const belongs =
            selected.id
              ? aId === selected.id
              : aName ===
                selected.name;

          if (!belongs) {
            continue;
          }

          const name =
            establishmentName(
              order,
              establishmentMap
            );

          const key =
            estId ||
            `${name}:${selected.key}`;

          const current =
            map.get(key);

          if (current) {
            current.orders += 1;
          } else {
            map.set(key, {
              key,
              name,
              orders: 1,
              areaName:
                selected.name,
            });
          }
        }

        // أضف المطاعم التابعة للمنطقة حتى لو صفر طلب.
        for (
          const restaurant of establishments
        ) {
          const rId =
            idOf(restaurant);

          const rAreaId =
            areaId(restaurant);

          const rAreaName =
            areaName(
              restaurant
            ) ||
            scopeAreas.get(
              rAreaId
            ) ||
            "منطقة غير محددة";

          const belongs =
            selected.id
              ? rAreaId === selected.id
              : rAreaName ===
                selected.name;

          if (!belongs) {
            continue;
          }

          const name =
            nameOf(
              restaurant,
              "مطعم / محل"
            );

          const key =
            rId ||
            `${name}:${selected.key}`;

          if (!map.has(key)) {
            map.set(key, {
              key,
              name,
              orders: 0,
              areaName:
                selected.name,
            });
          }
        }

        return [...map.values()]
          .sort(
            (a, b) =>
              b.orders - a.orders
          )
          .slice(0, 30);
      },
      [
        selectedArea,
        areas,
        orders,
        establishments,
        establishmentMap,
        scopeAreas,
      ]
    );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>
          جاري تحميل نشاط المناطق...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            المناطق الأكثر نشاطًا
          </Text>

          <Text style={styles.subtitle}>
            مرتبة حسب مجموع الطلبات
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setRefreshing(true);
            load();
          }}
          style={styles.refresh}
        >
          <Text style={styles.refreshText}>
            تحديث
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.areaList
        }
      >
        {areas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              لا توجد بيانات نشاط
            </Text>
          </View>
        ) : (
          areas.map(
            (area, index) => {
              const selected =
                selectedArea ===
                area.key;

              return (
                <Pressable
                  key={area.key}
                  onPress={() =>
                    setSelectedArea(
                      selected
                        ? null
                        : area.key
                    )
                  }
                  style={[
                    styles.areaCard,
                    selected &&
                      styles.areaSelected,
                  ]}
                >
                  <View
                    style={styles.rank}
                  >
                    <Text
                      style={
                        styles.rankText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.areaName
                    }
                  >
                    {area.name}
                  </Text>

                  <View
                    style={
                      styles.metric
                    }
                  >
                    <Text
                      style={
                        styles.metricNumber
                      }
                    >
                      {area.orders}
                    </Text>

                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      طلب
                    </Text>
                  </View>

                  <View
                    style={
                      styles.metric
                    }
                  >
                    <Text
                      style={
                        styles.metricSmall
                      }
                    >
                      {area.restaurants}
                    </Text>

                    <Text
                      style={
                        styles.metricLabel
                      }
                    >
                      مطعم
                    </Text>
                  </View>

                  <Text
                    style={styles.tap}
                  >
                    {selected
                      ? "إخفاء المطاعم"
                      : "عرض المطاعم"}
                  </Text>
                </Pressable>
              );
            }
          )
        )}
      </ScrollView>

      {selectedArea ? (
        <View style={styles.detail}>
          <View
            style={
              styles.detailHeader
            }
          >
            <View style={{ flex: 1 }}>
              <Text
                style={
                  styles.detailTitle
                }
              >
                مطاعم{" "}
                {
                  areas.find(
                    (a) =>
                      a.key ===
                      selectedArea
                  )?.name
                }
              </Text>

              <Text
                style={
                  styles.detailSubtitle
                }
              >
                أسماء المطاعم وعدد الطلبات
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setSelectedArea(
                  null
                )
              }
            >
              <Text
                style={styles.close}
              >
                إغلاق
              </Text>
            </Pressable>
          </View>

          {selectedRestaurants.length ===
          0 ? (
            <Text style={styles.noRestaurants}>
              لا توجد مطاعم مرتبطة بهذه المنطقة.
            </Text>
          ) : (
            selectedRestaurants.map(
              (
                restaurant,
                index
              ) => (
                <View
                  key={
                    restaurant.key
                  }
                  style={
                    styles.restaurantRow
                  }
                >
                  <View
                    style={
                      styles.restaurantRank
                    }
                  >
                    <Text
                      style={
                        styles.restaurantRankText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.restaurantName
                      }
                    >
                      {restaurant.name}
                    </Text>

                    <Text
                      style={
                        styles.restaurantArea
                      }
                    >
                      {restaurant.areaName}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.orderPill
                    }
                  >
                    <Text
                      style={
                        styles.orderNumber
                      }
                    >
                      {restaurant.orders}
                    </Text>

                    <Text
                      style={
                        styles.orderLabel
                      }
                    >
                      طلب
                    </Text>
                  </View>
                </View>
              )
            )
          )}
        </View>
      ) : null}

      <View style={styles.detail}>
        <View
          style={
            styles.detailHeader
          }
        >
          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.detailTitle
              }
            >
              المطاعم الأكثر طلبًا
            </Text>

            <Text
              style={
                styles.detailSubtitle
              }
            >
              تظهر تلقائيًا
            </Text>
          </View>
        </View>

        {topRestaurants.map(
          (
            restaurant,
            index
          ) => (
            <View
              key={
                restaurant.key
              }
              style={
                styles.restaurantRow
              }
            >
              <View
                style={
                  styles.restaurantRank
                }
              >
                <Text
                  style={
                    styles.restaurantRankText
                  }
                >
                  {index + 1}
                </Text>
              </View>

              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.restaurantName
                  }
                >
                  {restaurant.name}
                </Text>

                <Text
                  style={
                    styles.restaurantArea
                  }
                >
                  {restaurant.areaName}
                </Text>
              </View>

              <View
                style={
                  styles.orderPill
                }
              >
                <Text
                  style={
                    styles.orderNumber
                  }
                >
                  {restaurant.orders}
                </Text>

                <Text
                  style={
                    styles.orderLabel
                  }
                >
                  طلب
                </Text>
              </View>
            </View>
          )
        )}
      </View>

      <Text style={styles.auto}>
        تحديث تلقائي كل 30 ثانية
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginBottom: 20,
  },

  loading: {
    padding: 20,
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    color: "#667085",
    fontSize: 12,
  },

  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  title: {
    color: "#101828",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "right",
  },

  subtitle: {
    marginTop: 3,
    color: "#667085",
    fontSize: 11,
    textAlign: "right",
  },

  refresh: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },

  refreshText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
  },

  error: {
    marginBottom: 8,
    color: "#B42318",
    fontSize: 11,
    textAlign: "right",
  },

  areaList: {
    gap: 11,
  },

  areaCard: {
    width: 175,
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  areaSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FBFF",
  },

  rank: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  rankText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
  },

  areaName: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 10,
  },

  metric: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "baseline",
    gap: 5,
    marginTop: 2,
  },

  metricNumber: {
    color: "#101828",
    fontSize: 22,
    fontWeight: "900",
  },

  metricSmall: {
    color: "#344054",
    fontSize: 17,
    fontWeight: "900",
  },

  metricLabel: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "700",
  },

  tap: {
    marginTop: 11,
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "right",
  },

  detail: {
    marginTop: 13,
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 7,
  },

  detailTitle: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },

  detailSubtitle: {
    marginTop: 2,
    color: "#667085",
    fontSize: 10,
    textAlign: "right",
  },

  close: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "900",
  },

  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
  },

  restaurantRank: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
  },

  restaurantRankText: {
    color: "#475467",
    fontSize: 10,
    fontWeight: "900",
  },

  restaurantName: {
    color: "#101828",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },

  restaurantArea: {
    marginTop: 2,
    color: "#98A2B3",
    fontSize: 9,
    textAlign: "right",
  },

  orderPill: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  orderNumber: {
    color: "#101828",
    fontSize: 14,
    fontWeight: "900",
  },

  orderLabel: {
    color: "#667085",
    fontSize: 8,
    fontWeight: "700",
  },

  empty: {
    width: 290,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },

  emptyTitle: {
    color: "#101828",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },

  noRestaurants: {
    paddingVertical: 15,
    color: "#667085",
    fontSize: 11,
    textAlign: "right",
  },

  auto: {
    marginTop: 8,
    color: "#98A2B3",
    fontSize: 9,
    textAlign: "center",
  },
});
