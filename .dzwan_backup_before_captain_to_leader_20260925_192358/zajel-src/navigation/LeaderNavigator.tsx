import React from "react";
import { Platform, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";

import { useAppTheme } from "../theme/useAppTheme";

import LeaderHomeScreen from "../screens/leader/LeaderHomeScreen";
import LeaderOrdersScreen from "../screens/leader/LeaderOrdersScreen";
import LeaderCaptainsScreen from "../screens/leader/LeaderCaptainsScreen";
import LeaderEstablishmentsScreen from "../screens/leader/LeaderEstablishmentsScreen";
import LeaderProfileScreen from "../screens/leader/LeaderProfileScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function LeaderTabs() {
  const appTheme = useAppTheme();

  const frame = {
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
        }
      : {}),
  } as any;

  const icon = (
    name: string,
    color: string,
    size: number,
  ) => (
    <MaterialCommunityIcons
      name={name as any}
      color={color}
      size={size}
    />
  );

  return (
    <View style={frame}>
      <Tabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor:
            appTheme.primaryDarkColor,
          tabBarInactiveTintColor:
            appTheme.secondaryTextColor,
          tabBarStyle: {
            height: 70,
            paddingTop: 7,
            paddingBottom: 8,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#F0D9BE",
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "800",
          },
        }}
      >
        <Tabs.Screen
          name="الرئيسية"
          component={LeaderHomeScreen}
          options={{
            tabBarIcon: ({ color, size }) =>
              icon(
                "home-outline",
                color,
                size,
              ),
          }}
        />

        <Tabs.Screen
          name="الطلبات"
          component={LeaderOrdersScreen}
          options={{
            tabBarIcon: ({ color, size }) =>
              icon(
                "clipboard-text-outline",
                color,
                size,
              ),
          }}
        />

        <Tabs.Screen
          name="الكباتن"
          component={LeaderCaptainsScreen}
          options={{
            tabBarIcon: ({ color, size }) =>
              icon(
                "account-group-outline",
                color,
                size,
              ),
          }}
        />

        <Tabs.Screen
          name="المحلات"
          component={LeaderEstablishmentsScreen}
          options={{
            tabBarIcon: ({ color, size }) =>
              icon(
                "storefront-outline",
                color,
                size,
              ),
          }}
        />

        <Tabs.Screen
          name="التنبيهات"
          component={NotificationsScreen}
          options={{
            tabBarIcon: ({ color, size }) =>
              icon(
                "bell-outline",
                color,
                size,
              ),
          }}
        />

        <Tabs.Screen
          name="حسابي"
          component={LeaderProfileScreen}
          options={{
            tabBarIcon: ({ color, size }) =>
              icon(
                "account-outline",
                color,
                size,
              ),
          }}
        />
      </Tabs.Navigator>
    </View>
  );
}

export default function LeaderNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="LeaderTabs"
        component={LeaderTabs}
      />
    </Stack.Navigator>
  );
}
