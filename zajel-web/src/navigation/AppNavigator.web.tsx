import RuntimeGate from "../components/RuntimeGate";
import ThemeProvider from "../components/ThemeProvider";
import React, { useEffect, useRef, useState } from "react";
import {
  NavigationContainer,
} from "@react-navigation/native";
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
import { useAuthStore } from "../store/authStore";

const Stack = createStackNavigator();

function routeForRole(role: string | undefined | null) {
  if (role === "captain") return "CaptainApp";
  if (role === "shop") return "ShopApp";
  if (role === "governorate_leader" || role === "area_leader") return "LeaderApp";
  return null;
}

export default function AppNavigator() {
  const storedUser = useAuthStore((state) => state.user);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const navigationVersion = useAuthStore((state) => state.navigationVersion);
  const navigationRef = useRef<any>(null);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!navigationReady || !navigationRef.current?.isReady()) return;

    const state = useAuthStore.getState();
    const route = state.authenticated && state.user
      ? routeForRole(state.user.role)
      : null;
    const target = route || "SelectRole";

    navigationRef.current.resetRoot({
      index: 0,
      routes: [{ name: target }],
    });
  }, [navigationReady, navigationVersion]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
    >
<ThemeProvider>
<RuntimeGate>

      <Stack.Navigator
        initialRouteName={routeForRole(storedUser?.role) || "SelectRole"}
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
