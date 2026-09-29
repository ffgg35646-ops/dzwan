import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppInput from "./AppInput";
import AppButton from "./AppButton";
import { api } from "../api/client";
import { useAppTheme } from "../theme/useAppTheme";

type RegistrationType = "captain" | "establishment" | "order";

type Area = {
  _id: string;
  name: string;
  isActive: boolean;
  captainsEnabled?: boolean;
  establishmentsEnabled?: boolean;
};

type Governorate = {
  _id: string;
  name: string;
  isActive: boolean;
  captainsEnabled?: boolean;
  establishmentsEnabled?: boolean;
  areas: Area[];
};

type Props = {
  type: RegistrationType;
  governorateId: string;
  areaId: string;
  onGovernorateChange: (id: string) => void;
  onAreaChange: (id: string) => void;
};

export default function LocationSelector({
  type,
  governorateId,
  areaId,
  onGovernorateChange,
  onAreaChange,
}: Props) {
  const theme = useAppTheme();

  const [locations, setLocations] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [governorateSearch, setGovernorateSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");

  const [governorateModal, setGovernorateModal] = useState(false);
  const [areaModal, setAreaModal] = useState(false);

  const selectedGovernorate = locations.find(
    (item) => item._id === governorateId,
  );

  const areas = selectedGovernorate?.areas ?? [];

  const selectedArea = areas.find(
    (item) => item._id === areaId,
  );

  async function loadLocations() {
    setLoading(true);
    setLoadError("");

    try {
      const response = await api.get("/locations/available", {
        params: { type },
      });

      const rawLocations = response.data?.locations ?? [];

      const data = rawLocations
        .filter((governorate: Governorate) => {
          if (!governorate?.isActive) return false;

          if (type === "captain") {
            return governorate.captainsEnabled !== false;
          }

          if (type === "establishment" || type === "order") {
            return governorate.establishmentsEnabled !== false;
          }

          return true;
        })
        .map((governorate: Governorate) => ({
          ...governorate,
          areas: (governorate.areas ?? []).filter((area: Area) => {
            if (!area?.isActive) return false;

            if (type === "captain") {
              return area.captainsEnabled !== false;
            }

            if (type === "establishment" || type === "order") {
              return area.establishmentsEnabled !== false;
            }

            return true;
          }),
        }));

      setLocations(data);

      if (!data.length) {
        setLoadError("لا توجد محافظات متاحة حاليًا.");
      }
    } catch (error: any) {
      console.error("LocationSelector loadLocations error:", error);
      setLocations([]);
      setLoadError(
        error?.response?.data?.message ||
        error?.message ||
        "تعذر الاتصال بالخادم."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, [type]);

  function normalizeArabic(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/\s+/g, " ");
  }

  function rankSearch<T extends { name: string }>(
    items: T[],
    value: string,
  ) {
    const query = normalizeArabic(value);

    if (!query) return items;

    return items
      .map((item) => {
        const name = normalizeArabic(item.name);
        const index = name.indexOf(query);

        if (index === -1) return null;

        return {
          item,
          score: index === 0 ? 0 : index + 10,
        };
      })
      .filter(
        (result): result is { item: T; score: number } =>
          result !== null,
      )
      .sort((a, b) => a.score - b.score)
      .map((result) => result.item);
  }

  const filteredGovernorates = useMemo(() => {
    const results = rankSearch(locations, governorateSearch);

    return [...results].sort((a, b) => {
      const qa = normalizeArabic(governorateSearch);
      if (qa) return 0;

      return normalizeArabic(a.name).localeCompare(
        normalizeArabic(b.name),
        "ar",
      );
    });
  }, [locations, governorateSearch]);

  const filteredAreas = useMemo(() => {
    const results = rankSearch(areas, areaSearch);

    return [...results].sort((a, b) => {
      const qa = normalizeArabic(areaSearch);
      if (qa) return 0;

      return normalizeArabic(a.name).localeCompare(
        normalizeArabic(b.name),
        "ar",
      );
    });
  }, [areas, areaSearch]);

  function selectGovernorate(id: string) {
    onGovernorateChange(id);
    onAreaChange("");
    setAreaSearch("");
    setGovernorateModal(false);
  }

  function selectArea(id: string) {
    onAreaChange(id);
    setAreaModal(false);
  }

  const styles = StyleSheet.create({
    section: {
      gap: 10,
    },
    label: {
      color: theme.textColor,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
    },
    selector: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 15,
      backgroundColor: theme.surfaceColor,
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    selectorText: {
      color: theme.textColor,
      fontSize: 15,
      textAlign: "right",
    },
    placeholder: {
      color: theme.secondaryTextColor,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modal: {
      maxHeight: "85%",
      backgroundColor: theme.backgroundColor,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      gap: 12,
    },
    modalTitle: {
      color: theme.textColor,
      fontSize: 20,
      fontWeight: "900",
      textAlign: "right",
    },
    item: {
      paddingVertical: 16,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    itemText: {
      color: theme.textColor,
      fontSize: 15,
      textAlign: "right",
    },
    empty: {
      color: theme.secondaryTextColor,
      textAlign: "center",
      paddingVertical: 24,
    },
    loading: {
      paddingVertical: 20,
      alignItems: "center",
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.label}>المحافظة</Text>

      <Pressable
        style={styles.selector}
        onPress={() => {
          setGovernorateSearch("");
          setGovernorateModal(true);
          loadLocations();
        }}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedGovernorate && styles.placeholder,
          ]}
        >
          {selectedGovernorate?.name || "اختر المحافظة"}
        </Text>
      </Pressable>

      <Text style={styles.label}>المنطقة</Text>

      <Pressable
        style={[
          styles.selector,
          !governorateId && { opacity: 0.5 },
        ]}
        disabled={!governorateId}
        onPress={async () => {
          setAreaSearch("");
          await loadLocations();
          setAreaModal(true);
        }}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedArea && styles.placeholder,
          ]}
        >
          {selectedArea?.name || "اختر المنطقة"}
        </Text>
      </Pressable>

      <Modal
        visible={governorateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setGovernorateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>اختر المحافظة</Text>

            <AppInput
              placeholder="ابحث عن المحافظة..."
              value={governorateSearch}
              onChangeText={setGovernorateSearch}
              autoCapitalize="none"
            />

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.primaryColor} />
              </View>
            ) : loadError ? (
              <View style={styles.loading}>
                <Text style={styles.empty}>{loadError}</Text>
              </View>
            ) : (
              <FlatList
                data={filteredGovernorates}
                keyExtractor={(item) => item._id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.item}
                    onPress={() => selectGovernorate(item._id)}
                  >
                    <Text style={styles.itemText}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    لا توجد محافظات متاحة بهذا الاسم.
                  </Text>
                }
              />
            )}

            <AppButton
              title="إغلاق"
              secondary
              onPress={() => setGovernorateModal(false)}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={areaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>اختر المنطقة</Text>

            <AppInput
              placeholder="ابحث عن المنطقة..."
              value={areaSearch}
              onChangeText={setAreaSearch}
              autoCapitalize="none"
            />

            <FlatList
              data={filteredAreas}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.item}
                  onPress={() => selectArea(item._id)}
                >
                  <Text style={styles.itemText}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  لا توجد مناطق متاحة بهذا الاسم.
                </Text>
              }
            />

            <AppButton
              title="إغلاق"
              secondary
              onPress={() => setAreaModal(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
