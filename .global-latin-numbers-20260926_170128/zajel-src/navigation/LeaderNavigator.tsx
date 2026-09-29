import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";


import LeaderHomeScreen from "../screens/leader/LeaderHomeScreen";
import ProfileScreen from "../screens/captain/ProfileScreen";
import LeaderOrdersScreen from "../screens/leader/LeaderOrdersScreen";


function NavGlyph({
  symbol,
  color = "#111827",
  size = 20,
}: {
  symbol: string;
  color?: string;
  size?: number;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: size,
        lineHeight: size + 3,
        fontWeight: "900",
      }}
    >
      {symbol}
    </Text>
  );
}

const LayoutDashboard = (props: {
  color?: string;
  size?: number;
}) => (
  <NavGlyph {...props} symbol="▦" />
);

const UserRound = (props: {
  color?: string;
  size?: number;
}) => (
  <NavGlyph {...props} symbol="●" />
);

const Tab =
  createBottomTabNavigator();

export default function LeaderNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="الرئيسية"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#EA580C",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
        },
        tabBarStyle: {
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          backgroundColor: "#FFFFFF",
        },
      }}
    >
        <Tab.Screen
          name="الطلبات"
          component={LeaderOrdersScreen}
          options={{
            tabBarLabel: "الطلبات",
            tabBarIcon: ({ color }: { color: string }) => (
              <Text style={{ color, fontSize: 18 }}>▤</Text>
            ),
          }}
        />

      <Tab.Screen
        name="الرئيسية"
        component={LeaderHomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="حسابي"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <UserRound
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
