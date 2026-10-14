import RuntimeGate from "../components/RuntimeGate";
import ThemeProvider from "../components/ThemeProvider";
import React, { useEffect } from "react";
import {
  createNavigationContainerRef,
  NavigationContainer,
} from "@react-navigation/native";
import { api, clearToken, getToken } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { createStackNavigator } from "@react-navigation/stack";

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
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import MaintenanceScreen from "../screens/shared/MaintenanceScreen";

import OrderDetailsScreen from "../screens/captain/OrderDetailsScreen";

const Stack = createStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

function routeForRole(role: string | undefined) {
  if (role === "captain") return "CaptainApp";
  if (role === "shop") return "ShopApp";
  if (role === "governorate_leader" || role === "area_leader") return "LeaderApp";
  return "SelectRole";
}

export default function AppNavigator() {
  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore((state) => state.authenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (authenticated || !navigationRef.isReady()) return;

    if (navigationRef.getCurrentRoute()?.name !== "SelectRole") {
      navigationRef.resetRoot({
        index: 0,
        routes: [{ name: "SelectRole" }],
      });
    }
  }, [authenticated]);


  useEffect(() => {
    let active = true;
    async function validateSession() {
      try {
        const token = await getToken();
        if (!token) {
          if (useAuthStore.getState().authenticated) {
            logout();
            if (navigationRef.isReady()) navigationRef.resetRoot({ index: 0, routes: [{ name: "SelectRole" }] });
          }
          return;
        }
        const response = await api.get("/auth/me");
        const raw = response?.data?.user;
        if (!active || !raw) return;
        const nextUser = {
          id: String(raw.id || raw._id),
          role: raw.role,
          name: raw.name || raw.fullName,
          phone: raw.phone,
          email: raw.email ?? null,
          status: raw.status,
          governorateId: raw.governorateId ?? null,
          governorateName: raw.governorateName ?? null,
          areaId: raw.areaId ?? null,
          areaName: raw.areaName ?? null,
          areaIds: Array.isArray(raw.areaIds) ? raw.areaIds.map(String) : [],
          avatarUrl: raw.avatarUrl ?? null,
        } as any;
        setUser(nextUser);
        const target = routeForRole(nextUser.role);
        if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === "SelectRole") {
          navigationRef.resetRoot({ index: 0, routes: [{ name: target as never }] });
        }
      } catch (error: any) {
        if (!active) return;
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          await clearToken();
          logout();
          if (navigationRef.isReady()) navigationRef.resetRoot({ index: 0, routes: [{ name: "SelectRole" }] });
        }
      }
    }
    void validateSession();
    return () => { active = false; };
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const state = useAuthStore.getState();
        const target = routeForRole(state.user?.role);
        if (state.authenticated && navigationRef.getCurrentRoute()?.name === "SelectRole" && target !== "SelectRole") {
          navigationRef.resetRoot({ index: 0, routes: [{ name: target as never }] });
        }
      }}
    >
<ThemeProvider>
<RuntimeGate>

      <Stack.Navigator
        initialRouteName={authenticated ? routeForRole(user?.role) : "SelectRole"}
        screenOptions={{
          headerShown: false,
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
