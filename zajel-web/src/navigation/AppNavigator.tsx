import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  NavigationContainer,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import RuntimeGate from "../components/RuntimeGate";
import ThemeProvider from "../components/ThemeProvider";

import SelectRoleScreen from "../screens/auth/SelectRoleScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import CaptainRegisterScreen from "../screens/auth/CaptainRegisterScreen";
import CaptainRegisterVerifyScreen from "../screens/auth/CaptainRegisterVerifyScreen";
import ShopRegisterScreen from "../screens/auth/ShopRegisterScreen";
import WaitingApprovalScreen from "../screens/auth/WaitingApprovalScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

import CaptainNavigator from "./CaptainNavigator";
import ShopNavigator from "./ShopNavigator";
import LeaderNavigator from "./LeaderNavigator";
import OrderDetailsScreen from "../screens/captain/OrderDetailsScreen";

import { useAuthStore } from "../store/authStore";
import { api, clearToken, getToken } from "../api/client";

const Stack = createNativeStackNavigator();

function routeForRole(role: string | undefined) {
  if (role === "captain") return "CaptainApp";
  if (role === "shop") return "ShopApp";

  if (
    role === "governorate_leader" ||
    role === "area_leader"
  ) {
    return "LeaderApp";
  }

  return "SelectRole";
}

export default function AppNavigator() {
  const [hydrated, setHydrated] = useState(false);

  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore(
    (state) => state.authenticated,
  );
  const restoreStoredUser = useAuthStore(
    (state) => state.restoreStoredUser,
  );
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const token = await getToken();

        if (!token) {
          return;
        }

        const cachedUser = await restoreStoredUser();

        if (cachedUser) {
          // افتح التطبيق فورًا من البيانات المحلية.
          // التحقق من الجلسة يتم في الخلفية.
          void api
            .get("/auth/me")
            .then((response) => {
              const raw = response?.data?.user;

              if (!raw || !active) return;

              const nextUser = {
                id: String(raw.id || raw._id),
                role: raw.role,
                name: raw.name || raw.fullName,
                phone: raw.phone,
                email: raw.email ?? null,
                status: raw.status,
                governorateId:
                  raw.governorateId ?? null,
                governorateName:
                  raw.governorateName ?? null,
                areaId: raw.areaId ?? null,
                areaName: raw.areaName ?? null,
                areaIds: Array.isArray(raw.areaIds)
                  ? raw.areaIds.map(String)
                  : [],
                avatarUrl: raw.avatarUrl ?? null,
              } as any;

              setUser(nextUser);
            })
            .catch((error: any) => {
              const status =
                error?.response?.status;

              if (
                status === 401 ||
                status === 403
              ) {
                clearToken().finally(() => {
                  if (active) logout();
                });
              }
            });

          return;
        }

        // ترقية من النسخ السابقة:
        // يوجد توكن محفوظ لكن لم تكن بيانات المستخدم محفوظة.
        try {
          const response = await api.get("/auth/me");
          const raw = response?.data?.user;

          if (!raw) {
            await clearToken();
            logout();
            return;
          }

          const nextUser = {
            id: String(raw.id || raw._id),
            role: raw.role,
            name: raw.name || raw.fullName,
            phone: raw.phone,
            email: raw.email ?? null,
            status: raw.status,
            governorateId:
              raw.governorateId ?? null,
            governorateName:
              raw.governorateName ?? null,
            areaId: raw.areaId ?? null,
            areaName: raw.areaName ?? null,
            areaIds: Array.isArray(raw.areaIds)
              ? raw.areaIds.map(String)
              : [],
            avatarUrl: raw.avatarUrl ?? null,
          } as any;

          setUser(nextUser);
        } catch (error: any) {
          const status = error?.response?.status;

          if (status === 401 || status === 403) {
            await clearToken();
            logout();
          }
        }
      } finally {
        if (active) setHydrated(true);
      }
    }

    restore();

    return () => {
      active = false;
    };
  }, []);

  if (!hydrated) {
    // لا شاشة تحميل ولا نص؛ نترك الـ native splash يختفي
    // ثم نعرض أول واجهة صحيحة حسب الجلسة.
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFDF8",
        }}
      />
    );
  }

  return (
    <NavigationContainer>
      <ThemeProvider>
        <RuntimeGate>
          <Stack.Navigator
            initialRouteName={
              authenticated
                ? routeForRole(user?.role)
                : "SelectRole"
            }
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen
              name="SelectRole"
              component={SelectRoleScreen}
            />

            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerTintColor: "#FF6A00",
                headerStyle: {
                  backgroundColor: "#FF6A00",
                },
              }}
            />

            <Stack.Screen
              name="CaptainRegister"
              component={CaptainRegisterScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerTintColor: "#FF6A00",
                headerStyle: {
                  backgroundColor: "#FF6A00",
                },
              }}
            />

            <Stack.Screen
              name="CaptainRegisterVerify"
              component={CaptainRegisterVerifyScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerTintColor: "#FF6A00",
                headerStyle: {
                  backgroundColor: "#FF6A00",
                },
              }}
            />

            <Stack.Screen
              name="ShopRegister"
              component={ShopRegisterScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerTintColor: "#FF6A00",
                headerStyle: {
                  backgroundColor: "#FF6A00",
                },
              }}
            />

            <Stack.Screen
              name="WaitingApproval"
              component={WaitingApprovalScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerTintColor: "#FF6A00",
                headerStyle: {
                  backgroundColor: "#FF6A00",
                },
              }}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "",
                headerTintColor: "#FF6A00",
                headerStyle: {
                  backgroundColor: "#FF6A00",
                },
              }}
            />

            <Stack.Screen
              name="CaptainApp"
              component={CaptainNavigator}
            />

            <Stack.Screen
              name="ShopApp"
              component={ShopNavigator}
            />

            <Stack.Screen
              name="LeaderApp"
              component={LeaderNavigator}
            />

            <Stack.Screen
              name="OrderDetails"
              component={OrderDetailsScreen}
            />
          </Stack.Navigator>
        </RuntimeGate>
      </ThemeProvider>
    </NavigationContainer>
  );
}
