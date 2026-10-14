import RuntimeGate from "../components/RuntimeGate";
import ThemeProvider from "../components/ThemeProvider";
import React from "react";
import {
  NavigationContainer,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
<ThemeProvider>
<RuntimeGate>

      <Stack.Navigator
        initialRouteName="SelectRole"
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
