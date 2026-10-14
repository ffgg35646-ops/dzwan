import { useAppTheme } from "../theme/useAppTheme";
import RateCaptainScreen from "../screens/shop/RateCaptainScreen";
import ComplaintScreen from "../screens/shared/ComplaintScreen";
import React from "react";
import { Platform, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CaptainHomeScreen from "../screens/captain/CaptainHomeScreen";
import ShiftScreen from "../screens/captain/ShiftScreen";
import OrdersScreen from "../screens/captain/OrdersScreen";
import ProfileScreen from "../screens/captain/ProfileScreen";
import ReportsScreen from "../screens/captain/ReportsScreen";
import OrderDetailsScreen from "../screens/captain/OrderDetailsScreen";
import PickupScreen from "../screens/captain/PickupScreen";
import CashScreen from "../screens/captain/CashScreen";
import CashStatementScreen from "../screens/captain/CashStatementScreen";
import PerformanceScreen from "../screens/captain/PerformanceScreen";
import OnlineControlScreen from "../screens/captain/OnlineControlScreen";
import DeliveryProofScreen from "../screens/captain/DeliveryProofScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import SupportTicketsScreen from "../screens/shared/SupportTicketsScreen";
import SupportQuickSupportScreen from "../screens/shared/SupportQuickSupportScreen";

import { useAuthStore } from "../store/authStore";
import LeaderNavigator from "./LeaderNavigator";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function CaptainTabs() {
  const appTheme = useAppTheme();

  const navigatorFrame = {
    flex: 1,
    width: "100%",
    ...(Platform.OS === "web"
      ? {
          width: 390,
          minWidth: 0,
          maxWidth: "100%",
          height: 844,
          minHeight: 0,
          maxHeight: "100%",
          alignSelf: "center",
          overflow: "visible",
        }
      : {}),
  } as any;

  return (
    <View style={navigatorFrame}>
      <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: appTheme.primaryDarkColor,
        tabBarInactiveTintColor: appTheme.secondaryTextColor,
        tabBarStyle: {
          height: 68,
          minHeight: 68,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F0D9BE",
          elevation: 8,
          shadowColor: "#8A5A2E",
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
        },

        tabBarItemStyle: {
          paddingVertical: 1,
        },
      }}
    >
      <Tabs.Screen
        name="الرئيسية"
        component={CaptainHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="الطلبات"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="الشفت"
        component={ShiftScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clock-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="كشف الحساب"
        component={CashStatementScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="حسابي"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="الدعم"
        component={SupportQuickSupportScreen}
        options={{
          tabBarLabel: "الدعم",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="headset"
              color={color}
              size={size}
            />
          ),
        }}
      />
</Tabs.Navigator>

    </View>
  );
}

export default function CaptainNavigator() {

  const currentUserRole =
    useAuthStore((state) => state.user?.role);

  if (
    currentUserRole === "area_leader" ||
    currentUserRole === "governorate_leader"
  ) {
    return <LeaderNavigator />;
  }


  const appTheme = useAppTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CaptainTabs"
        component={CaptainTabs}
      />

      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
      />

      <Stack.Screen
        name="Pickup"
        component={PickupScreen}
      />

      <Stack.Screen
        name="Cash"
        component={CashScreen}
      />

      <Stack.Screen
        name="CashStatement"
        component={CashStatementScreen}
      />

      <Stack.Screen
        name="Performance"
        component={PerformanceScreen}
      />

      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
      />

      <Stack.Screen
        name="OnlineControl"
        component={OnlineControlScreen}
      />

      <Stack.Screen
        name="DeliveryProof"
        component={DeliveryProofScreen}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    
        <Stack.Screen
          name="RateCaptain"
          component={RateCaptainScreen}
          options={{ title: "تقييم الكابتن" }}
        />

        <Stack.Screen
          name="Complaint"
          component={ComplaintScreen}
          options={{ title: "نظام الدعم السريع" }}
        />

        <Stack.Screen
          name="SupportTickets"
          component={SupportTicketsScreen}
          options={{ title: "تذاكر الدعم" }}
        />

        <Stack.Screen
          name="SupportQuickSupport"
          component={SupportQuickSupportScreen}
          options={{ title: "نظام الدعم السريع" }}
        />
</Stack.Navigator>
  );
}
