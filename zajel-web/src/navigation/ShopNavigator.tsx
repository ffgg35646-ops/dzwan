import { useAppTheme } from "../theme/useAppTheme";
import RateCaptainScreen from "../screens/shop/RateCaptainScreen";
import ComplaintScreen from "../screens/shared/ComplaintScreen";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import ShopHomeScreen from "../screens/shop/ShopHomeScreen";
import CreateOrderScreen from "../screens/shop/CreateOrderScreen";
import OrdersScreen from "../screens/shop/OrdersScreen";
import ProfileScreen from "../screens/shop/ProfileScreen";
import ReportsScreen from "../screens/shop/ReportsScreen";
import ShopOrderDetailsScreen from "../screens/shop/ShopOrderDetailsScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import QuickSupportScreen from "../screens/shop/QuickSupportScreen";
import SupportTicketsScreen from "../screens/shared/SupportTicketsScreen";
import SupportQuickSupportScreen from "../screens/shared/SupportQuickSupportScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function ShopTabs() {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();

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
            height: 68 + insets.bottom,
            minHeight: 68 + insets.bottom,
            paddingTop: 7,
            paddingBottom: Math.max(8, insets.bottom),
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F0D9BE",
            elevation: 8,
            shadowColor: "#8A5A2E",
            shadowOffset: { width: 0, height: -3 },
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
        <Tabs.Screen name="الرئيسية" component={ShopHomeScreen} options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="إنشاء طلب" component={CreateOrderScreen} options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="plus-circle-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="الطلبات" component={OrdersScreen} options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="الحساب" component={ProfileScreen} options={{ tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="الدعم" component={SupportQuickSupportScreen} options={{ tabBarLabel: "الدعم", tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="headset" color={color} size={size} /> }} />
      </Tabs.Navigator>
    </View>
  );
}

export default function ShopNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShopTabs" component={ShopTabs} />
      <Stack.Screen name="OrderTracking" component={ShopOrderDetailsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="RateCaptain" component={RateCaptainScreen} options={{ title: "تقييم الكابتن" }} />
      <Stack.Screen name="QuickSupport" component={QuickSupportScreen} options={{ title: "نظام الدعم السريع" }} />
      <Stack.Screen name="Complaint" component={ComplaintScreen} options={{ title: "نظام الدعم السريع" }} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} options={{ title: "تذاكر الدعم" }} />
      <Stack.Screen name="SupportQuickSupport" component={SupportQuickSupportScreen} options={{ title: "نظام الدعم السريع" }} />
    </Stack.Navigator>
  );
}
