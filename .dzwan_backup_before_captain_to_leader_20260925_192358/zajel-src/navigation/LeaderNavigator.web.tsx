import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  createStackNavigator,
} from "@react-navigation/stack";
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

const Stack = createStackNavigator();
const Tabs = createBottomTabNavigator();

function LeaderTabs() {
  const appTheme = useAppTheme();

  const frame = {
    flex: 1,
    width: 390,
    minWidth: 0,
    maxWidth: "100%",
    height: 844,
    minHeight: 0,
    maxHeight: "100%",
    alignSelf: "center",
  } as any;

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
          component={LeaderOrdersScreen}
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
          name="الكباتن"
          component={LeaderCaptainsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="account-group-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="المحلات"
          component={LeaderEstablishmentsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="storefront-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="التنبيهات"
          component={NotificationsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="bell-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="حسابي"
          component={LeaderProfileScreen}
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
