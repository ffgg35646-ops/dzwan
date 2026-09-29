import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Screen from "../../components/Screen";
import { useAuthStore } from "../../store/authStore";

const ORANGE = "#E5501C";
const ORANGE_DARK = "#B4460A";
const GOLD = "#FFB25E";
const CREAM = "#FFFDF8";
const DARK = "#4A1B0C";

export default function SelectRoleScreen() {
  const navigation = useNavigation<any>();
  const setAccountType = useAuthStore((s) => s.setAccountType);

  // المطعم يدخل من اليمين إلى الداخل
  const shopIn = useRef(new Animated.Value(420)).current;

  // الكابتن يدخل من اليسار إلى الداخل
  const captainIn = useRef(new Animated.Value(-420)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(shopIn, {
        toValue: 0,
        delay: 120,
        damping: 16,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(captainIn, {
        toValue: 0,
        delay: 220,
        damping: 16,
        stiffness: 110,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      shopIn.stopAnimation();
      captainIn.stopAnimation();
      opacity.stopAnimation();
    };
  }, [shopIn, captainIn, opacity]);

  function choose(type: "shop" | "captain") {
    setAccountType(type);
    navigation.navigate("Login");
  }

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.phone}>
          <LinearGradient
            colors={["#FFC24D", "#FF8A3D", "#E85D2A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.blobOne} />
            <View style={styles.blobTwo} />

            <View style={styles.icon3d}>
              <MaterialCommunityIcons
                name="truck-fast-outline"
                size={62}
                color={ORANGE}
              />
            </View>

            <Text style={styles.welcome}>أهلا بيك</Text>

            <View style={styles.brandLine}>
              <Text style={styles.brand}>زاجل</Text>
              <Text style={styles.brandEnglish}> ZAJEL DELIVERY</Text>
            </View>

            <View style={styles.waveOne} />
            <View style={styles.waveTwo} />
            <View style={styles.waveAccent} />
            <View style={styles.waveGlow} />
          </LinearGradient>

          <Animated.View
            style={[
              styles.bodyContent,
              {
                opacity,
                transform: [{ translateY: opacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }) }],
              },
            ]}
          >
            <Text style={styles.sub}>
              اختار نوع الحساب عشان تكمل تسجيل الدخول
            </Text>

            <Animated.View
              style={{
                width: "100%",
                transform: [{ translateX: shopIn }],
              }}
            >
              <Pressable
                onPress={() => choose("shop")}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnRestaurant,
                  pressed && styles.btnPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="storefront-outline"
                  size={25}
                  color="#FFFFFF"
                />
                <Text style={styles.restaurantText}>
                  تسجيل دخول مطعم
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              style={{
                width: "100%",
                transform: [{ translateX: captainIn }],
              }}
            >
              <Pressable
                onPress={() => choose("captain")}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnCaptain,
                  pressed && styles.btnPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name="truck-fast-outline"
                  size={25}
                  color="#FFD9A0"
                />
                <Text style={styles.captainText}>
                  تسجيل دخول كابتن
                </Text>
              </Pressable>
            </Animated.View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>او</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={() => navigation.navigate("Register")}
              style={({ pressed }) => [
                pressed && { opacity: 0.65 },
              ]}
            >
              <Text style={styles.footerLink}>
                مفيش حساب؟ سجل واحد جديد
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFE7D1",
    alignItems: "center",
    justifyContent: "center",
  },

  phone: {
    width: "100%",
    maxWidth: 430,
    minHeight: "100%",
    backgroundColor: CREAM,
    overflow: "hidden",
  },

  hero: {
    height: 315,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    paddingTop: 24,
  },

  blobOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 100,
    top: -72,
    left: -52,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  blobTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 100,
    bottom: -50,
    right: -34,
    backgroundColor: "rgba(255,255,255,0.13)",
  },

  icon3d: {
    width: 112,
    height: 112,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A03C00",
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    marginBottom: 15,
    zIndex: 5,
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textShadowColor: "rgba(150,50,0,0.35)",
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
    zIndex: 5,
  },

  brandLine: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginTop: 7,
    zIndex: 5,
  },

  brand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  brandEnglish: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  waveOne: {
    position: "absolute",
    width: "150%",
    height: 105,
    bottom: -62,
    left: "-25%",
    borderRadius: 90,
    backgroundColor: CREAM,
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#C95A25",
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },

  waveTwo: {
    position: "absolute",
    width: "125%",
    height: 78,
    bottom: -40,
    left: "-18%",
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.58)",
    transform: [{ rotate: "5deg" }],
  },

  waveAccent: {
    position: "absolute",
    width: "105%",
    height: 72,
    bottom: -30,
    right: "-20%",
    borderRadius: 70,
    backgroundColor: "rgba(255,138,61,0.68)",
    transform: [{ rotate: "-7deg" }],
  },

  waveGlow: {
    position: "absolute",
    width: "82%",
    height: 38,
    bottom: 10,
    right: "-10%",
    borderRadius: 50,
    backgroundColor: "rgba(255,190,120,0.38)",
    transform: [{ rotate: "-5deg" }],
  },

  bodyContent: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 26,
    alignItems: "center",
  },

  sub: {
    color: "#8A5A2E",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 21,
  },

  btn: {
    width: "100%",
    minHeight: 60,
    borderRadius: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },

  btnRestaurant: {
    backgroundColor: GOLD,
    shadowColor: "#E6781E",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  btnCaptain: {
    backgroundColor: DARK,
    shadowColor: "#3C1400",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },

  btnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },

  restaurantText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  captainText: {
    color: "#FFD9A0",
    fontSize: 16,
    fontWeight: "800",
  },

  divider: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F0D9BE",
  },

  dividerText: {
    color: "#C9A177",
    fontSize: 12,
    fontWeight: "700",
  },

  footerLink: {
    color: ORANGE_DARK,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
