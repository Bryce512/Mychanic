import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";

const { height, width } = Dimensions.get("window");

export default function LoginScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [rotation, setRotation] = useState({ beta: 0 }); // beta is the front-to-back tilt
  const [pressedSection, setPressedSection] = useState<
    "user" | "mechanic" | null
  >(null);

  // Calculate flex ratios based on device tilt
  // When beta is positive (tilted forward), user section gets bigger
  // When beta is negative (tilted backward), mechanic section gets bigger
  const tiltFactor = Math.max(-0.5, Math.min(0.5, rotation.beta)); // Clamp between -0.5 and 0.5
  const userFlex = 2 / 3 + tiltFactor; // Base 2/3, adjust by tilt
  const mechanicFlex = 1 / 3 - tiltFactor; // Base 1/3, adjust by tilt

  const handleUserLogin = () => {
    setPressedSection("user");
    // Clear the pressed state after a brief delay to show temporary feedback
    setTimeout(() => setPressedSection(null), 150);
    navigation.navigate("Signup" as never, { role: "user" });
  };

  const handleMechanicLogin = () => {
    setPressedSection("mechanic");
    // Clear the pressed state after a brief delay to show temporary feedback
    setTimeout(() => setPressedSection(null), 150);
    navigation.navigate("Signup", { role: "mechanic" });
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* User Login Section - 3/4 of screen */}
      <ImageBackground
        source={require("../../assets/images/UserLogin1.jpg")}
        style={[styles.userSection, { flex: userFlex }]}
        resizeMode="cover"
      >
        <TouchableOpacity
          style={[
            styles.userOverlayTouchable,
            pressedSection === "user" && styles.pressedOverlay,
          ]}
          onPress={handleUserLogin}
          activeOpacity={0.8}
        >
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle}>I'm a Vehicle Owner</Text>
            <Text style={styles.overlaySubtitle}>
              Create an account to manage your vehicles and find mechanics
            </Text>
          </View>
        </TouchableOpacity>
      </ImageBackground>

      {/* Mechanic Login Section - 1/4 of screen */}
      <ImageBackground
        source={require("../../assets/images/MechanicLogin.jpg")}
        style={[styles.mechanicSection, { flex: mechanicFlex }]}
        resizeMode="cover"
      >
        <TouchableOpacity
          style={[
            styles.overlayTouchable,
            pressedSection === "mechanic" && styles.pressedOverlay,
          ]}
          onPress={handleMechanicLogin}
          activeOpacity={0.8}
        >
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle}>I'm a Mobile Mechanic</Text>
            <Text style={styles.overlaySubtitle}>
              Join our network of trusted mobile mechanics
            </Text>
          </View>
        </TouchableOpacity>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userSection: {
    flex: 2 / 3, // 3/4 of the screen
    width: width,
    borderBottomColor: colors.white,
    borderBottomWidth: 1,
  },
  mechanicSection: {
    flex: 1 / 3, // 1/4 of the screen
    width: width,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)", // 60% opacity black background
  },
  userOverlayTouchable: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)", // 60% opacity black background
    paddingTop: "75%", // Position text at 3/4 from the top
  },
  pressedOverlay: {
    backgroundColor: "rgba(255, 255, 255, 0.3)", // Light overlay when pressed
    borderWidth: 3,
    borderColor: colors.white,
  },
  overlayContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overlaySubtitle: {
    fontSize: 16,
    color: colors.white,
    textAlign: "center",
    opacity: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
