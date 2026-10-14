import SupportQuickAccess from "../../components/shared/SupportQuickAccess";
import { useShiftSelectionStore } from "../../store/shiftSelectionStore";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Linking,
  Modal,

} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";
import * as Location from "expo-location";

import Screen from "../../components/Screen";
import { useAuthStore } from "../../store/authStore";
import {
  checkShift,
  getCaptainCapacity,
  getMyWorkAreas,

  getAvailableShifts,
  selectWeeklyShift,
  changeWeeklyShift,
} from "../../api/captain";
import {
  getShiftInfo,
} from "../../api/shiftAttendanceRuntime";
import CaptainOrderBoard from "../../components/captain/CaptainOrderBoard";
import { getCaptainOrderBoard } from "../../api/captainOrderBoard";
import { apiGet } from "../../api/request";
import NotificationBell from "../../components/shared/NotificationBell";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Order = {
  id?: string;
  _id?: string;
  orderNumber?: string | number;
  customerName?: string;
  customerPhone?: string;
  status?: string;
  deliveryAddress?: string;

  customerLatitude?: number | string;
  customerLongitude?: number | string;

  customerLocation?: {
    latitude?: number | string;
    longitude?: number | string;
  };

  deliveryLocation?: {
    latitude?: number | string;
    longitude?: number | string;
  };

  customerLocationUrl?: string;
  locationUrl?: string;
  locationLink?: string;
  customerMapUrl?: string;
  googleMapsLink?: string;

  restaurantName?: string;
  shopName?: string;
  establishmentName?: string;
  totalAmount?: number | string;
  total?: number | string;
  amount?: number | string;
  price?: number | string;
  deliveryFee?: number | string;
  deliveredAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
};

const ORANGE = "#F97316";
const ORANGE_DARK = "#E85D04";
const YELLOW = "#FFB52E";
const CREAM = "#FFF9F0";
const WHITE = "#FFFFFF";
const TEXT = "#21170F";
const MUTED = "#8D8175";
const GREEN = "#16A34A";
const RED = "#EF4444";

function numberValue(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getOrders(source: any): Order[] {
  const candidates = [
    source?.orders,
    source?.activeOrders,
    source?.activeOrdersList,
    source?.completedOrders,
    source?.rejectedOrders,
    source?.cancelledOrders,
    source?.history,
    source?.orderHistory,
    source?.data?.orders,
    source?.data?.activeOrders,
    source?.data?.completedOrders,
    source?.data?.rejectedOrders,
    source?.data?.cancelledOrders,
    source?.data?.history,
    source?.items,
  ];

  const all: Order[] = [];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      all.push(...candidate);
    }
  }

  const seen = new Set<string>();

  return all
    .filter((order) => {
      const key = String(
        order?.id ||
          order?._id ||
          order?.orderNumber ||
          `${order?.customerName || ""}-${order?.createdAt || ""}`,
      );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();

      return bTime - aTime;
    });
}

function parseCoordinateText(value?: string | null): Coordinate | null {
  if (!value) return null;

  const text = String(value).trim();

  const patterns = [
    /@(-?\\d+(?:\\.\\d+)?),\\s*(-?\\d+(?:\\.\\d+)?)/,
    /(?:q|query|ll)=(-?\\d+(?:\\.\\d+)?),\\s*(-?\\d+(?:\\.\\d+)?)/i,
    /geo:(-?\\d+(?:\\.\\d+)?),\\s*(-?\\d+(?:\\.\\d+)?)/i,
    /(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) continue;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return {
        latitude,
        longitude,
      };
    }
  }

  return null;
}

function getCustomerCoordinate(order?: Order | null): Coordinate | null {
  if (!order) return null;

  const latitude = numberValue(
    order.customerLatitude ??
      order.customerLocation?.latitude ??
      order.deliveryLocation?.latitude,
    NaN,
  );

  const longitude = numberValue(
    order.customerLongitude ??
      order.customerLocation?.longitude ??
      order.deliveryLocation?.longitude,
    NaN,
  );

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return { latitude, longitude };
  }

  const possibleLinks = [
    order.customerLocationUrl,
    order.locationUrl,
    order.locationLink,
    order.customerMapUrl,
    order.googleMapsLink,
  ];

  for (const link of possibleLinks) {
    const parsed = parseCoordinateText(link);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getStatusTone(status?: string) {
  switch (status) {
    case "delivered":
      return {
        backgroundColor: "#EAF8EF",
        color: GREEN,
      };

    case "rejected":
    case "declined":
      return {
        backgroundColor: "#FFF0ED",
        color: RED,
      };

    case "cancelled":
      return {
        backgroundColor: "#F4F1ED",
        color: "#766B60",
      };

    default:
      return {
        backgroundColor: "#FFF1E4",
        color: ORANGE_DARK,
      };
  }
}

function distanceKm(a: Coordinate | null, b: Coordinate | null) {
  if (!a || !b) return null;

  const toRad = (value: number) =>
    (value * Math.PI) / 180;

  const earthRadius = 6371;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(
    Math.sqrt(h),
    Math.sqrt(1 - h),
  );
}

function formatTime(value: any) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("ar-IQ-u-nu-latn", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value: any) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ar-IQ-u-nu-latn", {
    day: "numeric",
    month: "long",
  });
}

function statusLabel(status?: string) {
  switch (status) {
    case "assigned":
      return "تم التعيين";

    case "heading_to_shop":
      return "في الطريق للمطعم";

    case "arrived_at_shop":
      return "وصل للمطعم";

    case "picked_up":
      return "تم الاستلام";

    case "on_the_way":
      return "جاري التوصيل";

    case "delivered":
      return "مكتمل";

    case "rejected":
    case "declined":
      return "مرفوض";

    case "cancelled":
      return "ملغي";

    default:
      return status || "قيد التنفيذ";
  }
}


function DeliveryRiderVector() {
  return (
    <Svg
      width="190"
      height="165"
      viewBox="0 0 220 185"
    >
      <Defs>
        <SvgGradient
          id="jacketGradient"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop offset="0" stopColor="#FFF7ED" />
          <Stop offset="0.55" stopColor="#FFE1BF" />
          <Stop offset="1" stopColor="#F97316" />
        </SvgGradient>

        <SvgGradient
          id="bikeGradient"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop offset="0" stopColor="#FFB52E" />
          <Stop offset="0.5" stopColor="#F97316" />
          <Stop offset="1" stopColor="#D94801" />
        </SvgGradient>

        <SvgGradient
          id="helmetGradient"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#FFE0B2" />
        </SvgGradient>
      </Defs>

      <G>

        {/* shadow */}
        <Path
          d="M28 160 C70 145 160 144 196 158 C168 174 62 176 28 160 Z"
          fill="#7C2D12"
          opacity={0.2}
        />

        {/* back wheel */}
        <Circle
          cx="55"
          cy="133"
          r="25"
          fill="#21170F"
        />
        <Circle
          cx="55"
          cy="133"
          r="15"
          fill="#FFF7ED"
        />
        <Circle
          cx="55"
          cy="133"
          r="6"
          fill="#C7B9AA"
        />

        {/* front wheel */}
        <Circle
          cx="169"
          cy="133"
          r="25"
          fill="#21170F"
        />
        <Circle
          cx="169"
          cy="133"
          r="15"
          fill="#FFF7ED"
        />
        <Circle
          cx="169"
          cy="133"
          r="6"
          fill="#C7B9AA"
        />

        {/* frame */}
        <Path
          d="M55 119 L87 113 L112 126 L158 126 L170 108"
          fill="none"
          stroke="#563824"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* delivery box */}
        <Rect
          x="33"
          y="78"
          width="47"
          height="39"
          rx="9"
          fill="#E85D04"
        />

        <Rect
          x="39"
          y="84"
          width="35"
          height="26"
          rx="5"
          fill="#FFF7ED"
          opacity={0.72}
        />

        <Path
          d="M48 91 H66"
          stroke="#F97316"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* bike body */}
        <Path
          d="M68 114 C83 89 108 83 133 94 C147 100 153 111 157 123 L105 123 C96 112 86 108 68 114 Z"
          fill="url(#bikeGradient)"
        />

        <Path
          d="M92 103 C104 98 116 99 127 104"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4"
          opacity={0.72}
          strokeLinecap="round"
        />

        {/* handle */}
        <Path
          d="M151 96 L169 83 L182 84"
          fill="none"
          stroke="#493022"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* rider leg */}
        <Path
          d="M108 103 L126 124 L142 128"
          fill="none"
          stroke="#2D241E"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* body */}
        <Path
          d="M87 55 C100 45 120 47 129 62 L139 91 L118 105 L93 91 L77 73 Z"
          fill="url(#jacketGradient)"
        />

        {/* orange jacket side */}
        <Path
          d="M118 59 L138 91 L126 100 L111 69 Z"
          fill="#F97316"
          opacity={0.84}
        />

        {/* left arm */}
        <Path
          d="M91 61 L73 80 L84 87 L103 72"
          fill="none"
          stroke="#FFD0A1"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* right arm */}
        <Path
          d="M123 64 L145 82 L166 84"
          fill="none"
          stroke="#FFD0A1"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* neck */}
        <Rect
          x="100"
          y="40"
          width="18"
          height="17"
          rx="7"
          fill="#FFD0A1"
        />

        {/* head */}
        <Circle
          cx="109"
          cy="35"
          r="24"
          fill="#FFD0A1"
        />

        {/* cap */}
        <Path
          d="M84 32 C84 16 96 7 109 7 C123 7 134 15 137 29 C127 24 115 21 102 23 C95 24 89 28 84 32 Z"
          fill="url(#helmetGradient)"
        />

        <Path
          d="M88 28 C103 22 121 22 138 28 C141 30 140 34 136 35 C119 31 103 30 88 34 C84 34 84 30 88 28 Z"
          fill="#F97316"
        />

        <Path
          d="M103 12 C96 15 92 20 90 27"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          opacity={0.8}
          strokeLinecap="round"
        />

        {/* helmet visor */}
        <Path
          d="M93 29 C104 23 121 23 134 29 L132 38 C117 34 105 34 94 38 Z"
          fill="#5A3824"
          opacity={0.84}
        />

        {/* face */}
        <Circle
          cx="116"
          cy="37"
          r="2.2"
          fill="#3A251A"
        />

        <Path
          d="M120 45 C114 49 109 48 105 45"
          fill="none"
          stroke="#A85E35"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* jacket stripe */}
        <Path
          d="M91 72 L119 92"
          stroke="#FFFFFF"
          strokeWidth="5"
          opacity={0.82}
        />

        {/* delivery strap */}
        <Path
          d="M88 56 L119 91"
          fill="none"
          stroke="#E85D04"
          strokeWidth="5"
          opacity={0.8}
        />

        {/* light highlights */}
        <Circle
          cx="77"
          cy="107"
          r="4"
          fill="#FFFFFF"
          opacity={0.9}
        />

        <Circle
          cx="154"
          cy="110"
          r="4"
          fill="#FFFFFF"
          opacity={0.9}
        />
      </G>
    </Svg>
  );
}


function formatShiftClock(value: any) {
  if (!value) return "";

  const parts = String(value).split(":");
  const hour24 = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (!Number.isFinite(hour24)) return "";

  const suffix = hour24 >= 12 ? "م" : "ص";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}



export default function CaptainHomeScreen() {
  const selectedShiftFromStore =
    useShiftSelectionStore(
      (state) => state.selectedShift,
    );


  const [supportNotificationCount, setSupportNotificationCount] =
    useState(0);

  const [supportNotificationVisible, setSupportNotificationVisible] =
    useState(false);

  const [supportNotificationMessage, setSupportNotificationMessage] =
    useState("");

  async function loadSupportNotification() {
    try {
      const response = await apiGet(
        "/support-tickets/my/unread-count",
      );

      const count = Number(response?.count ?? 0);

      setSupportNotificationCount(
        Number.isFinite(count) && count > 0 ? count : 0,
      );

      if (count > 0) {
        setSupportNotificationMessage(
          response?.message ||
            `لديك ${count} رسائل جديدة في الدعم السريع`,
        );
      }
    } catch {
      setSupportNotificationCount(0);
    }
  }

  useEffect(() => {
    void loadSupportNotification();

    const timer = setInterval(
      () => void loadSupportNotification(),
      10000,
    );

    return () => clearInterval(timer);
  }, []);

  function openSupportNotification() {
    setSupportNotificationVisible(false);

    const navigation =
      (globalThis as any)?.navigationRef?.current;

    if (navigation) {
      navigation.navigate("الدعم");
    }
  }

  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [capacity, setCapacity] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [shiftCardOpen, setShiftCardOpen] =
    useState(false);
  /* HOME_SHIFT_PICKER_V1 */
  const [shiftPickerOpen, setShiftPickerOpen] =
    useState(false);

  const [availableShifts, setAvailableShifts] =
    useState<any[]>([]);

  const [shiftPickerLoading, setShiftPickerLoading] =
    useState(false);

  const [shiftSaving, setShiftSaving] =
    useState(false);

  const [workArea, setWorkArea] = useState<any>(null);
  const [workAreas, setWorkAreas] = useState<any[]>([]);

  const [location, setLocation] = useState<Coordinate | null>(null);
  const [customerLocation, setCustomerLocation] =
    useState<Coordinate | null>(null);

  const [route, setRoute] = useState<Coordinate[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);

  const [currentPlaceName, setCurrentPlaceName] =
    useState<string>("");

  const [mapSearch, setMapSearch] =
    useState<string>("");

  const [customerLocationLink, setCustomerLocationLink] =
    useState<string>("");

  const [searchResults, setSearchResults] =
    useState<any[]>([]);

  const [mapSearchLoading, setMapSearchLoading] =
    useState(false);
  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);

  const [availableOrdersCount, setAvailableOrdersCount] =
    useState(0);

  const [shiftClockNow, setShiftClockNow] =
    useState(() => Date.now());



  const orders = useMemo(
    () => getOrders(capacity),
    [capacity],
  );

  const [activeOrdersCount, setActiveOrdersCount] =
    useState(0);

  const displayActiveOrders =
    activeOrdersCount;

  const maxOrders = numberValue(
    capacity?.maxActiveOrders ??
      capacity?.maxOrders ??
      capacity?.maxActiveOrdersPerCaptain,
  );

  const remainingOrders = Math.max(
    maxOrders - activeOrdersCount,
    0,
  );

  const capacityPercentage =
    maxOrders > 0
      ? Math.min(activeOrdersCount / maxOrders, 1)
      : 0;

  const weeklyAssignment =
    shift?.assignment || null;

  const selectedWeeklyShiftId = String(
    selectedShiftFromStore?._id ??
      selectedShiftFromStore?.id ??
      weeklyAssignment?.shiftId?._id ??
      weeklyAssignment?.shiftId?.id ??
      weeklyAssignment?.shiftId ??
      "",
  );
  const shiftSelectedAt = (() => {
    const explicit = new Date(weeklyAssignment?.changedAt ?? NaN).getTime();
    if (Number.isFinite(explicit)) return explicit;
    const legacy = [
      weeklyAssignment?.weekStart,
      weeklyAssignment?.createdAt,
      weeklyAssignment?.updatedAt,
    ].map((value) => new Date(value ?? NaN).getTime())
      .filter((value) => Number.isFinite(value));
    return legacy.length ? Math.max(...legacy) : NaN;
  })();
  const shiftChangeLocked =
    Boolean(selectedWeeklyShiftId) &&
    Number.isFinite(shiftSelectedAt) &&
    shiftClockNow < shiftSelectedAt + 168 * 60 * 60 * 1000;

  const currentShift =
    shift?.shift || shift;

  const shiftSelected =
    Boolean(
      shiftCardOpen ||
      selectedWeeklyShiftId,
    );

  useEffect(() => {
    setShiftClockNow(Date.now());

    const timer = setInterval(() => {
      setShiftClockNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);



  const selectedWeeklyShift =
    selectedShiftFromStore ||
    (weeklyAssignment?.shiftId &&
    typeof weeklyAssignment.shiftId === "object"
      ? weeklyAssignment.shiftId
      : shift?.shift &&
          typeof shift.shift === "object"
        ? shift.shift
        : currentShift &&
            typeof currentShift === "object"
          ? currentShift
          : null);

  const selectedShiftTimeLabel =
    selectedWeeklyShift?.startTime &&
    selectedWeeklyShift?.endTime
      ? `${formatShiftClock(
          selectedWeeklyShift.startTime,
        )} – ${formatShiftClock(
          selectedWeeklyShift.endTime,
        )}`
      : "";

  function goToCaptainScreen(
    screen: "الشفت" | "الطلبات",
  ) {
    navigation.navigate(screen);
  }



  const captainName =
    user?.name?.trim() || "الكابتن";

  const areaName =
    workArea?.areaName ||
    workArea?.area?.name ||
    workArea?.name ||
    user?.areaName ||
    (user as any)?.area?.name ||
    "منطقتك الأساسية";

  const governorateName =
    workArea?.governorateName ||
    workArea?.governorate?.name ||
    user?.governorateName ||
    (user as any)?.governorate?.name ||
    "";

  const displayWorkAreas =
    workAreas.length > 0
      ? workAreas
      : [
          {
            _id: "captain-primary-area",
            areaName,
            governorateName,
          },
        ];


  async function loadGps() {
    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        return;
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      const nextLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setLocation(nextLocation);

      try {
        const reverseResponse = await fetch(
          "https://nominatim.openstreetmap.org/reverse" +
            `?lat=${nextLocation.latitude}` +
            `&lon=${nextLocation.longitude}` +
            "&format=jsonv2" +
            "&accept-language=ar",
        );

        if (reverseResponse.ok) {
          const reverseData =
            await reverseResponse.json();

          const address =
            reverseData?.address || {};

          const place =
            address?.suburb ||
            address?.neighbourhood ||
            address?.city_district ||
            address?.city ||
            address?.town ||
            address?.village;

          if (place) {
            setCurrentPlaceName(place);
          }
        }
      } catch {
        // نخلي اسم منطقة العمل كبديل
      }

      return nextLocation;
    } catch {
      return null;
    }
  }

  async function loadData() {
    try {
      // البيانات الأساسية فقط: لا نحجز ظهور الشاشة بسبب بيانات ثانوية.
      const [
        capacityResult,
        shiftResult,
        workAreasResult,
      ] = await Promise.all([
        user?.id
          ? getCaptainCapacity(user.id)
          : Promise.resolve(null),

        checkShift(),

        user?.id
          ? getMyWorkAreas(user.id)
          : Promise.resolve(null),
      ]);

      console.log(
        "🟠 CHECK SHIFT RESULT:",
        JSON.stringify(shiftResult, null, 2),
      );

      setCapacity(capacityResult);

      setShift(
        shiftResult || null,
      );

      setShiftCardOpen(
        Boolean(
          shiftResult?.assignment?.shiftId
        )
      );

      const areas =
        workAreasResult?.workAreas ||
        workAreasResult?.areas ||
        workAreasResult?.data ||
        workAreasResult?.items ||
        [];

      const activeWorkAreas = Array.isArray(areas)
        ? areas.filter(
            (item: any) =>
              item?.isActive !== false,
          )
        : [];

      setWorkAreas(activeWorkAreas);

      const selectedWorkArea =
        activeWorkAreas[0] || null;

      setWorkArea(selectedWorkArea);

      // الشاشة الأساسية تظهر الآن ولا تنتظر:
      // الحضور + تفاصيل الشفت الإضافية + عداد الطلبات + GPS + route.
      setLoading(false);
      setRefreshing(false);

      // معلومات الشفت الإضافية في الخلفية.
      void getShiftInfo()
        .then((shiftInfoResult) => {
          if (!shiftInfoResult) {
            return;
          }

          setShift((previous: any) => ({
            ...(previous || {}),
            ...(shiftInfoResult || {}),
            assignment:
              previous?.assignment ??
              shiftInfoResult?.assignment ??
              null,
            shift:
              previous?.shift ??
              shiftInfoResult?.shift ??
              null,
          }));
        })
        .catch(() => {});


      // عداد الطلبات المتاحة في الخلفية.
      const selectedAreaId = String(
        selectedWorkArea?._id ??
          selectedWorkArea?.id ??
          "",
      );

      if (selectedAreaId) {
        void getCaptainOrderBoard(
          selectedAreaId,
        )
          .then((board) => {
            const activeCandidates = [
              board?.activeOrders,
              board?.data?.activeOrders,
            ];

            const activeList =
              activeCandidates.find(
                (value) => Array.isArray(value),
              ) || [];

            const availableCandidates = [
              board?.availableOrders,
              board?.data?.availableOrders,
            ];

            const availableList =
              availableCandidates.find(
                (value) => Array.isArray(value),
              ) || [];

            setActiveOrdersCount(
              activeList.length,
            );

            setAvailableOrdersCount(
              availableList.length,
            );
          })
          .catch((boardError: any) => {
            console.log(
              "CAPTAIN HOME BOARD COUNT ERROR:",
              boardError?.message ||
                boardError,
            );

            setAvailableOrdersCount(0);
          });
      } else {
        setAvailableOrdersCount(0);
      }

      // الموقع والخريطة في الخلفية.
      const availableOrders =
        getOrders(capacityResult);

      const firstOrder =
        availableOrders.find((order) =>
          [
            "assigned",
            "heading_to_shop",
            "arrived_at_shop",
            "picked_up",
            "on_the_way",
          ].includes(
            order?.status || "",
          ),
        ) || availableOrders[0];

      setCustomerLocation(
        getCustomerCoordinate(firstOrder),
      );

      void (async () => {
        try {
          const gps = await loadGps();

          const target =
            getCustomerCoordinate(firstOrder);

          if (gps && target) {
            await buildRoute(
              gps,
              target,
            );
          }
        } catch {}
      })();
    } catch (error: any) {
      console.log(
        "CAPTAIN HOME LOAD ERROR:",
        error?.message || error,
      );

      setLoading(false);
      setRefreshing(false);
    }
  }

  async function buildRoute(
    from: Coordinate,
    to: Coordinate,
  ) {
    try {
      const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        `${from.longitude},${from.latitude};` +
        `${to.longitude},${to.latitude}` +
        "?overview=full&geometries=geojson";

      const response = await fetch(url);

      if (!response.ok) {
        setRoute([]);
        setEtaMinutes(null);
        setRouteDistanceKm(null);
        return;
      }

      const data = await response.json();
      const routeData = data?.routes?.[0];

      if (!routeData) {
        setRoute([]);
        setEtaMinutes(null);
        setRouteDistanceKm(null);
        return;
      }

      const coordinates =
        routeData?.geometry?.coordinates || [];

      setRoute(
        coordinates.map(
          ([longitude, latitude]: [
            number,
            number,
          ]) => ({
            latitude,
            longitude,
          }),
        ),
      );

      if (Number.isFinite(routeData.duration)) {
        setEtaMinutes(
          Math.max(
            1,
            Math.round(routeData.duration / 60),
          ),
        );
      }

      if (Number.isFinite(routeData.distance)) {
        setRouteDistanceKm(
          Math.max(0, routeData.distance / 1000),
        );
      }
    } catch {
      setRoute([]);
      setEtaMinutes(null);
      setRouteDistanceKm(
        distanceKm(from, to),
      );
    }
  }

  async function searchMapLocation() {
    const query = mapSearch.trim();

    if (!query || mapSearchLoading) {
      return;
    }

    try {
      setMapSearchLoading(true);

      const response = await fetch(
        "https://nominatim.openstreetmap.org/search" +
          `?q=${encodeURIComponent(
            query + ", Iraq",
          )}` +
          "&format=jsonv2" +
          "&limit=5" +
          "&accept-language=ar",
      );

      if (!response.ok) {
        setSearchResults([]);
        return;
      }

      const data = await response.json();

      setSearchResults(
        Array.isArray(data)
          ? data
          : [],
      );
    } catch {
      setSearchResults([]);
    } finally {
      setMapSearchLoading(false);
    }
  }

  async function selectSearchResult(result: any) {
    const next = {
      latitude: Number(result?.lat),
      longitude: Number(result?.lon),
    };

    if (
      !Number.isFinite(next.latitude) ||
      !Number.isFinite(next.longitude)
    ) {
      return;
    }

    setCustomerLocation(next);
    setSearchResults([]);

    if (location) {
      await buildRoute(
        location,
        next,
      );
    } else {
      setRouteDistanceKm(null);
    }
  }

  async function applyCustomerLocationLink() {
    const next =
      parseCoordinateText(
        customerLocationLink,
      );

    if (!next) {
      Alert.alert(
        "الرابط غير مدعوم",
        "ضع رابط Google Maps يحتوي على الإحداثيات أو اكتب الإحداثيات بهذا الشكل: 30.123, 47.456",
      );
      return;
    }

    setCustomerLocation(next);

    if (location) {
      await buildRoute(
        location,
        next,
      );
    } else {
      setRouteDistanceKm(null);
    }
  }

  function openNavigation() {
    if (!customerLocation) {
      return;
    }

    const destination =
      `${customerLocation.latitude},${customerLocation.longitude}`;

    const url = location
      ? "https://www.google.com/maps/dir/?api=1" +
        `&origin=${location.latitude},${location.longitude}` +
        `&destination=${destination}` +
        "&travelmode=driving"
      : "https://www.google.com/maps/search/?api=1" +
        `&query=${destination}`;

    void Linking.openURL(url);
  }

  useEffect(() => {
    void loadData();

    const unsubscribe = navigation.addListener(
      "focus",
      () => {
        void loadData();
      },
    );

    return unsubscribe;
  }, [navigation, user?.id]);

  useEffect(() => {
    if (!location || !customerLocation) {
      return;
    }

    void buildRoute(
      location,
      customerLocation,
    );
  }, [
    location?.latitude,
    location?.longitude,
    customerLocation?.latitude,
    customerLocation?.longitude,
  ]);


  const todayLabel =
    new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());


  /*
   * assignment.changeCount:
   * 0 = تم الاختيار ولم يحصل تغيير
   * 1 = حسب بعض النسخ القديمة قد يكون هناك عداد أولي
   * 2 = تم استخدام التغيير الأسبوعي
   *
   * الـBackend هو صاحب القرار النهائي دائمًا.
   */
  const shiftChangeUsed =
    Number(
      weeklyAssignment?.changeCount || 0,
    ) >= 1;

  const cardShiftSelected =
    shiftCardOpen || Boolean(selectedWeeklyShiftId);

  const homeShiftActionTitle =
    cardShiftSelected
      ? "تم اختيار الشفت"
      : "اختيار الشفت";

  const homeShiftActionIcon =
    cardShiftSelected
      ? "checkmark-circle"
      : "play-circle";

  const HOME_SHIFT_DAYS = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  async function openHomeShiftPicker() {
    if (shiftSaving) {
      return;
    }

    setShiftPickerOpen(true);
    setShiftPickerLoading(true);

    try {
      const shiftsResponse =
        await getAvailableShifts();

      setAvailableShifts(
        Array.isArray(shiftsResponse?.data)
          ? shiftsResponse.data
          : [],
      );
    } catch (error: any) {
      Alert.alert(
        "تعذر تحميل الشفتات",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "تعذر تحميل الشفتات المتاحة حاليًا.",
      );
    } finally {
      setShiftPickerLoading(false);
    }
  }

  async function saveHomeShift(
    newShiftId: string,
  ) {
    if (
      !newShiftId ||
      shiftSaving ||
      shiftChangeLocked
    ) {
      return;
    }

    setShiftSaving(true);

    try {
      if (selectedWeeklyShiftId) {
        await changeWeeklyShift(newShiftId);
      } else {
        await selectWeeklyShift(newShiftId);
      }

      // فتح الكارت فورًا بمجرد نجاح اختيار الشفت.
      setShiftCardOpen(true);

      const selectedShift =
        availableShifts.find(
          (item: any) =>
            String(item?._id ?? item?.id ?? "") === newShiftId
        ) || null;

      if (selectedShift) {
        setShift((previous: any) => ({
          ...(previous || {}),
          assignment: {
            ...(previous?.assignment || {}),
            shiftId: selectedShift,
            changedAt: new Date().toISOString(),
          },
          shift: selectedShift,
        }));
      } else {
        setShift((previous: any) => ({
          ...(previous || {}),
          assignment: {
            ...(previous?.assignment || {}),
            shiftId: newShiftId,
            changedAt: new Date().toISOString(),
          },
        }));
      }

      setShiftPickerOpen(false);
    } catch (error: any) {
      Alert.alert(
        "تعذر اختيار الشفت",
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "تعذر اختيار الشفت.",
      );
    } finally {
      setShiftSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  const mapCenter = customerLocation;

  const recentOrders = orders.slice(0, 8);

  return (
    <Screen fitContent>
      <LinearGradient
        colors={[
          "#FFF8F0",
          "#FFF3DE",
          "#FFF8E8",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.homeBackground}
      >
        <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            tintColor={ORANGE}
            colors={[ORANGE]}
          />
        }
        style={styles.homeScroll}
        contentContainerStyle={styles.container}
      >
        {/* HEADER */}
        <View
        style={[
          styles.header,
          {
            position: "relative",
            zIndex: 999999,
            elevation: 999999,
            overflow: "visible",
          },
        ]}
      >
          {/* LEFT: notifications + settings */}
          <View
            style={[
              styles.headerSideLeft,
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              },
            ]}
          >
            <NotificationBell />

            <Pressable
              style={styles.roundButton}
              accessibilityRole="button"
              accessibilityLabel="الإعدادات"
            >
              <Ionicons
                name="settings-outline"
                size={21}
                color={TEXT}
              />
            </Pressable>
          </View>

          {/* CENTER: logo + captain name */}
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons
                name="motorbike"
                size={31}
                color={ORANGE}
              />
            </View>

            <Text style={styles.logoText}>
              زاجل
            </Text>

          </View>

          {/* RIGHT: phone + WhatsApp */}
          <View style={styles.headerSideRight}>
            <SupportQuickAccess />
          </View>
        </View>

        {/* HERO */}
        <LinearGradient
          colors={[
            "#FF7A00",
            "#FF9F1A",
            "#FFC247",
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={styles.hero}
        >
          <View
            pointerEvents="none"
            style={styles.heroWaveLarge}
          />

          <View
            pointerEvents="none"
            style={styles.heroWaveMedium}
          />

          <View
            pointerEvents="none"
            style={styles.heroWaveSmall}
          />

          <View
            pointerEvents="none"
            style={styles.heroGlow}
          />

          <View
            pointerEvents="none"
            style={styles.heroVectorWrap}
          >
            <MaterialCommunityIcons
              name="truck-fast-outline"
              size={132}
              color="#FFD9A0"
            />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroShiftInfo}>

              <View style={styles.heroCaptainSection}>
                <View style={styles.heroSectionIcon}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.heroSectionText}>
                  <Text style={styles.heroSectionLabel}>
                    الكابتن
                  </Text>

                  <Text
                    style={styles.heroSectionValue}
                    numberOfLines={1}
                  >
                    {captainName}
                  </Text>
                </View>
              </View>

              {(shiftCardOpen || selectedWeeklyShiftId) ? (
                <View style={styles.heroTimeSection}>
                  <View style={styles.heroSectionIcon}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.heroSectionText}>
                    <Text style={styles.heroSectionLabel}>
                      وقت الشفت
                    </Text>

                    <Text style={styles.heroSectionValue}>
                      {selectedShiftTimeLabel}
                    </Text>
                  </View>
                </View>
              ) : null}

              {(shiftCardOpen || selectedWeeklyShiftId) ? (
                <View style={styles.heroAreaSection}>
                  <View style={styles.heroSectionIcon}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.heroSectionText}>
                    <Text style={styles.heroSectionLabel}>
                      المناطق الجغرافية
                    </Text>

                    <View style={styles.heroAreaList}>
                      {displayWorkAreas.map((item: any, index: number) => {
                        const governorateName =
                          item?.governorateId?.name ||
                          item?.governorate?.name ||
                          "";

                        const areaNameValue =
                          item?.areaId?.name ||
                          item?.area?.name ||
                          item?.areaName ||
                          "منطقة غير محددة";

                        return (
                          <View
                            key={String(item?._id || index)}
                            style={styles.heroAreaItem}
                          >
                            <Text
                              style={styles.heroAreaName}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              • {governorateName
                                ? `${governorateName} - `
                                : ""}
                              {areaNameValue}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ) : null}

            </View>

            <Pressable
              onPress={() => {
                goToCaptainScreen("الشفت");
              }}
              {...(Platform.OS === "web"
                ? ({
                    onClick: () => {
                      goToCaptainScreen("الشفت");
                    },
                  } as any)
                : {})}
              disabled={false}
              style={({ pressed }) => [
                styles.heroButton,
                (shiftCardOpen || selectedWeeklyShiftId) &&
                  styles.heroButtonActive,
                pressed && {
                  opacity: 0.92,
                  transform: [{ scale: 0.985 }],
                },
              ]}
            >
              <View
                style={[
                  styles.heroButtonIcon,
                  (shiftCardOpen || selectedWeeklyShiftId) &&
                    styles.heroButtonIconDisabled,
                ]}
              >
                <Ionicons
                  name={homeShiftActionIcon as any}
                  size={23}
                  color={ORANGE_DARK}
                />
              </View>

              <Text
                style={[
                  styles.heroButtonText,
                  (shiftCardOpen || selectedWeeklyShiftId) &&
                    styles.heroButtonTextDisabled,
                ]}
              >
                {homeShiftActionTitle}
              </Text>
            </Pressable>

          </View>
        </LinearGradient>

        {/* ORDER SUMMARY */}
        <View
          style={{
            marginTop: 12,
            marginBottom: 6,
            gap: 10,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => {
              goToCaptainScreen(
                "الطلبات",
              );
            }}
            style={{
              minHeight: 62,
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E8DED7",
              paddingHorizontal: 15,
              flexDirection:
                "row-reverse",
              alignItems: "center",
              justifyContent:
                "space-between",
              shadowColor: "#6B4226",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection:
                  "row-reverse",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 13,
                  backgroundColor:
                    "#FFF2E8",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <Ionicons
                  name="layers-outline"
                  size={19}
                  color={ORANGE}
                />
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: TEXT,
                }}
              >
                الطلبات المتاحة
              </Text>
            </View>

            <View
              style={{
                flexDirection:
                  "row-reverse",
                alignItems: "center",
                gap: 9,
              }}
            >
              <View
                style={{
                  minWidth: 32,
                  height: 32,
                  paddingHorizontal: 8,
                  borderRadius: 16,
                  backgroundColor:
                    "#FFF2E8",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "900",
                    color: ORANGE,
                  }}
                >
                  {availableOrdersCount}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={19}
                color="#9A8E84"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => {
              goToCaptainScreen(
                "الطلبات",
              );
            }}
            style={{
              minHeight: 62,
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E8DED7",
              paddingHorizontal: 15,
              flexDirection:
                "row-reverse",
              alignItems: "center",
              justifyContent:
                "space-between",
              shadowColor: "#6B4226",
              shadowOpacity: 0.07,
              shadowRadius: 10,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection:
                  "row-reverse",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 13,
                  backgroundColor:
                    "#ECFDF3",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <Ionicons
                  name="bicycle-outline"
                  size={19}
                  color="#16A34A"
                />
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: TEXT,
                }}
              >
                الطلبات النشطة
              </Text>
            </View>

            <View
              style={{
                flexDirection:
                  "row-reverse",
                alignItems: "center",
                gap: 9,
              }}
            >
              <View
                style={{
                  minWidth: 32,
                  height: 32,
                  paddingHorizontal: 8,
                  borderRadius: 16,
                  backgroundColor:
                    "#ECFDF3",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "900",
                    color: "#16A34A",
                  }}
                >
                  {displayActiveOrders}
                </Text>
              </View>

              <Ionicons
                name="chevron-back"
                size={19}
                color="#9A8E84"
              />
            </View>
          </TouchableOpacity>
        </View>


      </ScrollView>
      </LinearGradient>

      {/* HOME SHIFT PICKER MODAL */}
      <Modal
        visible={shiftPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!shiftSaving) {
            setShiftPickerOpen(false);
          }
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              "rgba(15,23,42,0.48)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => {
              if (!shiftSaving) {
                setShiftPickerOpen(false);
              }
            }}
            style={{
              flex: 1,
            }}
          />

          <View
            style={{
              backgroundColor: WHITE,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 28,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                width: 46,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#CBD5E1",
                alignSelf: "center",
                marginBottom: 18,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: "#FFF2E8",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 10,
                  }}
                >
                  <Ionicons
                    name={
                      shiftSelected
                        ? "lock-open-outline"
                        : "lock-closed-outline"
                    }
                    size={23}
                    color={ORANGE_DARK}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: TEXT,
                      fontSize: 20,
                      fontWeight: "900",
                    }}
                  >
                    {homeShiftActionTitle}
                  </Text>

                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    شفتات الإدارة المتاحة لهذا الأسبوع
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (!shiftSaving) {
                    setShiftPickerOpen(false);
                  }
                }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: "#F5F5F5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={TEXT}
                />
              </Pressable>
            </View>

            {shiftPickerLoading ? (
              <View
                style={{
                  minHeight: 230,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator
                  size="large"
                  color={ORANGE}
                />

                <Text
                  style={{
                    marginTop: 12,
                    color: MUTED,
                    fontWeight: "800",
                  }}
                >
                  جاري تحميل الشفتات...
                </Text>
              </View>
            ) : availableShifts.length === 0 ? (
              <View
                style={{
                  minHeight: 230,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 20,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={44}
                  color="#B8AAA0"
                />

                <Text
                  style={{
                    marginTop: 12,
                    color: TEXT,
                    fontSize: 15,
                    fontWeight: "900",
                    textAlign: "center",
                  }}
                >
                  لا توجد شفتات متاحة حاليًا
                </Text>

                <Text
                  style={{
                    marginTop: 6,
                    color: MUTED,
                    fontSize: 12,
                    textAlign: "center",
                    lineHeight: 18,
                  }}
                >
                  الشفتات الظاهرة هنا يتم إنشاؤها
                  وتفعيلها من الإدارة.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 12,
                }}
              >
                {shiftChangeLocked ? (
                  <View
                    style={{
                      marginBottom: 12,
                      padding: 13,
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
                {availableShifts.map((item) => {
                  const id = String(
                    item?._id ||
                      item?.id ||
                      "",
                  );

                  if (!id) {
                    return null;
                  }

                  const isSelected =
                    String(
                      selectedWeeklyShiftId,
                    ) === id;

                  const dayIndex =
                    Number(item?.dayOfWeek);

                  const dayName =
                    Number.isInteger(dayIndex) &&
                    dayIndex >= 0 &&
                    dayIndex <= 6
                      ? HOME_SHIFT_DAYS[
                          dayIndex
                        ]
                      : "";

                  const disabled =
                    shiftSaving ||
                    shiftChangeLocked ||
                    isSelected;

                  return (
                    <View
                      key={id}
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor:
                          shiftChangeLocked
                            ? "#D1D5DB"
                            : isSelected
                              ? "#FDBA74"
                              : "#E8DED7",
                        backgroundColor:
                          shiftChangeLocked && !isSelected
                            ? "#F3F4F6"
                            : isSelected
                              ? "#FFF7ED"
                              : WHITE,
                        padding: 15,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            paddingLeft: 10,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                shiftChangeLocked
                                  ? "#9CA3AF"
                                  : TEXT,
                              fontSize: 16,
                              fontWeight: "900",
                            }}
                          >
                            {item?.name ||
                              "شفت الكابتن"}
                          </Text>

                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 7,
                            }}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={ORANGE}
                              style={{
                                marginLeft: 5,
                              }}
                            />

                            <Text
                              style={{
                                color:
                                shiftChangeLocked
                                  ? "#9CA3AF"
                                  : "#5F5147",
                              fontSize: 13,
                                fontWeight: "800",
                              }}
                            >
                              {item?.startTime ||
                                "--:--"}{" "}
                              -{" "}
                              {item?.endTime ||
                                "--:--"}
                            </Text>
                          </View>

                          {!!dayName && (
                            <Text
                              style={{
                                color: MUTED,
                                fontSize: 11,
                                marginTop: 5,
                              }}
                            >
                              {dayName}
                            </Text>
                          )}
                        </View>

                        <Pressable
                          disabled={disabled}
                          onPress={() => {
                            void saveHomeShift(id);
                          }}
                          style={{
                            minWidth: 78,
                            paddingHorizontal: 13,
                            paddingVertical: 10,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              shiftSaving || (shiftChangeLocked && !isSelected)
                                ? "#D1D5DB"
                                : isSelected
                                  ? "#F3E8DD"
                                  : ORANGE,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                shiftSaving || (shiftChangeLocked && !isSelected)
                                  ? "#6B7280"
                                  : isSelected
                                    ? "#8D8175"
                                    : WHITE,
                              fontSize: 12,
                              fontWeight: "900",
                            }}
                          >
                            {shiftChangeLocked
                              ? isSelected
                                ? "الحالي"
                                : "مغلق"
                              : isSelected
                                ? "الحالي"
                                : "اختيار"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

</Screen>
  );
}

const styles = StyleSheet.create({
  homeBackground: {
    width: "100%",
    backgroundColor: "#FFF8F0",
  },

  homeScroll: {
    flex: 1,
    backgroundColor: "transparent",
  },


  container: {
    paddingHorizontal: 14,
    paddingBottom: 0,
    backgroundColor: "transparent",
  },

  header: {
    width: "100%",
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 12,
    direction: "ltr",
  },

  headerSide: {
    width: 48,
    alignItems: "center",
  },

  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9DFD3",
    shadowColor: "#3B2416",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RED,
    borderWidth: 1.5,
    borderColor: WHITE,
  },

  headerSideLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 92,
    justifyContent: "flex-start",
  },

  headerSideRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 92,
  },

  logoArea: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  logoIcon: {
    height: 31,
    justifyContent: "center",
  },

  logoText: {
    color: ORANGE,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: -2,
  },

  captainName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },

  hero: {
    minHeight: 286,
    borderRadius: 30,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#5A2D0E",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 9,
    },
    elevation: 6,
  },

  heroContent: {
    minHeight: 300,
    padding: 20,
    justifyContent: "flex-end",
    zIndex: 3,
    position: "relative",
  },

  heroStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  heroStatusText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },

  heroShiftInfo: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: 8,
    marginBottom: 14,
    gap: 9,
    zIndex: 8,
  },

  heroCaptainSection: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  heroSectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
  },

  heroSectionText: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  heroSectionLabel: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },

  heroSectionValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
    marginTop: 2,
  },

  heroAreaSection: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    flexDirection: "row-reverse",
    alignItems: "flex-start",
  },

  heroTimeSection: {
    width: "100%",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(120,175,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  heroAreaList: {
    width: "100%",
    marginTop: 4,
    gap: 6,
  },

  heroAreaItem: {
    width: "100%",
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
  },

  heroCaptainBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    right: undefined,
    maxWidth: "62%",
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    zIndex: 20,
  },

  heroCaptainBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  heroTextArea: {
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    marginBottom: 14,
    zIndex: 4,
  },

  heroTitle: {
    color: WHITE,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "left",
    lineHeight: 31,
  },

  heroTimeRow: {
    alignSelf: "flex-start",
    width: 92,
    minHeight: 78,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    marginBottom: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  heroTimeIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTimeTextWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 43,
  },

  heroTimeTop: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },

  heroTimeSeparator: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 10,
    marginVertical: 1,
  },

  heroTimeBottom: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },

  heroDate: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  heroAreaRow: {
    alignSelf: "flex-start",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  heroAreaTextWrap: {
    alignItems: "flex-start",
  },

  heroAreaLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "700",
  },

  heroAreaName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "right",
    width: "100%",
    flexShrink: 1,
  },

  heroButton: {
    width: "100%",
    minHeight: 62,
    zIndex: 6,
    borderRadius: 20,
    backgroundColor: WHITE,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    shadowColor: "#4A2611",
    shadowOpacity: 0.20,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
  },

  heroButtonActive: {
    backgroundColor: "#FFF7F7",
    borderColor: "#FECACA",
  },

  heroButtonText: {
    color: ORANGE_DARK,
    fontSize: 16,
    fontWeight: "900",
  },

  heroButtonIconDisabled: {
    opacity: 0.45,
  },

  heroButtonTextDisabled: {
    opacity: 0.5,
  },

  heroButtonTextActive: {
    color: ORANGE_DARK,
  },

  heroButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF1E2",
    alignItems: "center",
    justifyContent: "center",
  },

  heroButtonIconActive: {
    backgroundColor: "#FEE2E2",
  },

  heroWaveLarge: {
    position: "absolute",
    width: 430,
    height: 210,
    borderRadius: 230,
    right: -190,
    bottom: -105,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    transform: [{ rotate: "-9deg" }],
  },

  heroWaveMedium: {
    position: "absolute",
    width: 390,
    height: 175,
    borderRadius: 210,
    right: -135,
    bottom: -75,
    backgroundColor:
      "rgba(255,217,112,0.34)",
    transform: [{ rotate: "7deg" }],
  },

  heroWaveSmall: {
    position: "absolute",
    width: 280,
    height: 130,
    borderRadius: 160,
    left: -125,
    top: -65,
    backgroundColor:
      "rgba(255,255,255,0.11)",
    transform: [{ rotate: "-14deg" }],
  },

  heroVectorWrap: {
    width: 190,
    height: 145,
    position: "absolute",
    right: -4,
    top: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    opacity: 0.98,
  },


  heroPhotoBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    borderTopLeftRadius: 74,
    borderTopRightRadius: 28,
  },

  heroGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 100,
    right: -70,
    top: -70,
    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
    marginTop: 3,
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "right",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
  },

  sectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FFF0E1",
    alignItems: "center",
    justifyContent: "center",
  },


  mapCard: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 18,
    overflow: "hidden",
  },

  mapTitleRow: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  mapTitleSpacer: {
    flex: 1,
  },

  mapTitleArea: {
    flex: 1,
    alignItems: "flex-end",
  },

  mapTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },

  mapSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },

  mapLocationButton: {
    width: 42,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFF1E4",
    borderWidth: 1,
    borderColor: "#F4C49A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E87516",
    shadowOpacity: 0.10,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  mapTitleIcon: {
    width: 48,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFF1E4",
    borderWidth: 1,
    borderColor: "#F6C79F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E87516",
    shadowOpacity: 0.10,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  mapTools: {
    paddingHorizontal: 13,
    paddingBottom: 11,
    gap: 9,
    backgroundColor: WHITE,
  },

  mapSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  mapSearchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E6DACE",
    backgroundColor: "#FBF8F4",
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },

  mapSearchButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ORANGE_DARK,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  mapLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  customerLinkInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6DACE",
    backgroundColor: "#FBF8F4",
    paddingHorizontal: 13,
    color: TEXT,
    fontSize: 11,
  },

  mapLinkButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: ORANGE_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  mapLinkButtonText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },

  searchResults: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE1D3",
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  searchResult: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECE5",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchResultText: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },

  nativeMap: {
    width: "100%",
    height: 150,
  },

  nativeMapFallback: {
    backgroundColor: "#F8F1E8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  nativeMapFallbackText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 7,
  },

  webMap: {
    width: "100%",
    height: 150,
    backgroundColor: "#E9E5DE",
    overflow: "hidden",
  },

  captainMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: WHITE,
    shadowColor: ORANGE_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  mapFooter: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  mapLocationInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  mapLocationText: {
    color: "#675C52",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },

  mapMetricGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  distanceBadge: {
    backgroundColor: "#FFF8EE",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F4DFC2",
  },

  distanceText: {
    color: ORANGE_DARK,
    fontSize: 10,
    fontWeight: "900",
  },

  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF2E5",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F5D8B8",
  },

  etaText: {
    color: ORANGE_DARK,
    fontSize: 11,
    fontWeight: "900",
  },

  navigationButton: {
    marginHorizontal: 13,
    marginBottom: 13,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: ORANGE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: ORANGE_DARK,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  navigationButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "900",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
  },

  statCard: {
    flex: 1,
    minHeight: 108,
    padding: 14,
    borderRadius: 22,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E9DED1",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#3D291D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  statIconOrange: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFF0DF",
    alignItems: "center",
    justifyContent: "center",
  },

  statIconNeutral: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F3EFE9",
    alignItems: "center",
    justifyContent: "center",
  },

  statText: {
    flex: 1,
    alignItems: "flex-end",
  },

  statLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },

  statValue: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
    marginTop: 2,
  },

  statHint: {
    color: "#9B9188",
    fontSize: 10,
    fontWeight: "600",
  },

  capacityCard: {
    padding: 17,
    borderRadius: 23,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E9DED1",
    shadowColor: "#3D291D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  capacityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  capacityTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },

  capacitySubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
    textAlign: "right",
  },

  capacityNumber: {
    color: ORANGE,
    fontSize: 22,
    fontWeight: "900",
  },

  progressTrack: {
    height: 10,
    marginTop: 15,
    borderRadius: 999,
    backgroundColor: "#EEEAE4",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: ORANGE,
  },

  capacityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
  },

  capacityFooterText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  ordersCard: {
    borderRadius: 25,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E9DED1",
    overflow: "hidden",
    shadowColor: "#3D291D",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },

  ordersHeader: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ordersTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
  },

  ordersSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
    textAlign: "right",
  },

  ordersHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFF1E4",
    alignItems: "center",
    justifyContent: "center",
  },

  orderLocationButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFF1E4",
    alignItems: "center",
    justifyContent: "center",
  },

  ordersEmpty: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1ECE5",
  },

  ordersEmptyTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 9,
  },

  ordersEmptyText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 5,
    textAlign: "center",
  },

  orderDateSmall: {
    color: "#9B9188",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

  orderDetailsCard: {
    backgroundColor: "#FCF8F3",
    borderTopWidth: 1,
    borderTopColor: "#EDE1D3",
    padding: 14,
  },

  orderDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  orderDetailsTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },

  orderDetailsStatus: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },

  orderDetailsStatusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  orderDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  orderDetailItem: {
    width: "48%",
    minHeight: 58,
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EDE1D5",
  },

  orderDetailFull: {
    width: "100%",
  },

  orderDetailLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },

  orderDetailValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5,
    textAlign: "right",
  },

  orderPrice: {
    color: ORANGE_DARK,
    fontSize: 13,
  },

  orderMapButton: {
    marginTop: 11,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#FFF0DF",
    borderWidth: 1,
    borderColor: "#FFD9AD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  orderMapButtonText: {
    color: ORANGE_DARK,
    fontSize: 11,
    fontWeight: "900",
  },

  orderRow: {
    minHeight: 82,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1ECE5",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  orderRowLast: {
    borderBottomWidth: 0,
  },

  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF1E5",
    alignItems: "center",
    justifyContent: "center",
  },

  orderInfo: {
    flex: 1,
    alignItems: "flex-end",
  },

  orderCustomer: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },

  orderAddress: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  orderMeta: {
    alignItems: "flex-end",
    gap: 5,
  },

  orderNumber: {
    color: "#756A60",
    fontSize: 10,
    fontWeight: "800",
  },

  orderStatus: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EAF8EF",
  },

  orderStatusText: {
    color: GREEN,
    fontSize: 9,
    fontWeight: "900",
  },

  infoCard: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 21,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: "#E9DED1",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowColor: "#3D291D",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFF1E4",
    alignItems: "center",
    justifyContent: "center",
  },

  infoText: {
    flex: 1,
    alignItems: "flex-end",
  },

  infoTitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  infoValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },

  infoLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F0FAF3",
    borderWidth: 1,
    borderColor: "#D7F0DE",
  },

  infoLiveText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },

  loading: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
});
