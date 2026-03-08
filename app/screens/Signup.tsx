"use client";

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import LinearGradient from "react-native-linear-gradient";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme/colors";
import { signupStyles } from "../theme/styles/Signup.styles";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function SignupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const {
    signIn,
    signUp,
    signInWithPhone,
    confirmPhoneCode,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();

  const role = (route.params as { role?: "user" | "mechanic" })?.role || "user";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // First try to sign in
      const { error: signInError } = await signIn(email, password);

      console.log("Sign-in attempt error:", signInError);

      if (!signInError) {
        // Successfully signed in existing user
        // Don't navigate - let the auth state change handle it
        return;
      }

      // If sign in failed, check if it's because user doesn't exist
      // Check for both "auth/user-not-found" and "auth/invalid-credential" as they can both mean user doesn't exist
      if (
        signInError?.code === "auth/user-not-found" ||
        signInError?.code === "auth/invalid-credential"
      ) {
        // User doesn't exist, offer to create account
        Alert.alert(
          "Account Not Found",
          "There is no account associated with this email. Would you like to create a new account?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Create Account",
              onPress: async () => {
                try {
                  const { error: signUpError, user } = await signUp(
                    email,
                    password,
                    role,
                  );

                  if (signUpError) {
                    Alert.alert("Error", signUpError.message);
                  } else if (user) {
                    // Don't navigate - let the auth state change handle it
                    // The AppNavigator will automatically show the Main tabs when user is set
                  }
                } catch (error) {
                  Alert.alert("Error", "An unexpected error occurred");
                  console.error(error);
                }
              },
            },
          ],
        );
      } else {
        // Some other sign in error
        Alert.alert("Error", signInError?.message || "Failed to sign in");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (!countryCode || !phoneNumber || phoneNumber.trim() === "") {
      Alert.alert("Error", "Please enter a country code and phone number");
      return;
    }

    // Combine country code and phone number
    let cleanNumber = countryCode + phoneNumber.replace(/[\s\-\(\)\.]/g, "");

    // Basic validation for E.164 format
    if (!cleanNumber.match(/^\+[1-9]\d{1,14}$/)) {
      Alert.alert(
        "Error",
        "Please enter a valid phone number with country code (e.g., +1234567890)",
      );
      return;
    }

    setLoading(true);
    try {
      const { confirmation, error } = await signInWithPhone(cleanNumber);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setConfirmation(confirmation);
        setShowPhoneVerification(true);
        Alert.alert("Success", `Verification code sent to ${cleanNumber}`);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to send verification code");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await confirmPhoneCode(
        confirmation,
        verificationCode,
        role,
      );
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Phone number verified successfully!");
        navigation.navigate("Home" as never);
      }
    } catch (error: any) {
      Alert.alert("Error", "Invalid verification code");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle(role);
      if (error) {
        Alert.alert("Error", error.message);
      }
    } catch (error: any) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithApple(role);
      if (error) {
        Alert.alert("Error", error.message);
      }
    } catch (error: any) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={signupStyles.container} edges={["bottom"]}>
      <ScrollView
        style={signupStyles.fullScrollView}
        contentContainerStyle={signupStyles.scrollContainer}
      >
        <View style={signupStyles.imageContainer}>
          <Image
            source={
              role === "user"
                ? require("../../assets/images/UserLogin2.jpg")
                : require("../../assets/images/Mechanic2.jpg")
            }
            style={signupStyles.loginImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              "rgba(0, 0, 0, .5)",
              "rgba(0, 0, 0, .5)",
              "rgba(255, 255, 255, .8)",
              colors.gray[100],
            ]}
            locations={[0, 0.8, 0.95, 1]}
            style={signupStyles.imageGradient}
          />
          <View style={signupStyles.imageLogoContainer}>
            <Feather name="tool" size={40} color={colors.white} />
            <View style={signupStyles.logoTextContainer}>
              <Text style={signupStyles.imageLogoText}>Mychanic</Text>
              <Text style={signupStyles.imageLogoSubtitle}>
                {role === "user" ? "for car owners" : "for mechanics"}
              </Text>
            </View>
          </View>
        </View>

        <View style={signupStyles.form}>
          <View style={signupStyles.inputContainer}>
            <Text
              style={[
                signupStyles.inputLabel,
                isDark && signupStyles.textLight,
              ]}
            >
              Email
            </Text>
            <View style={signupStyles.inputWrapper}>
              <Feather
                name="mail"
                size={18}
                color={isDark ? colors.gray[400] : colors.gray[500]}
                style={signupStyles.inputIcon}
              />
              <TextInput
                style={[
                  signupStyles.input,
                  isDark && signupStyles.inputDark,
                  { paddingLeft: 40 },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={
                  isDark ? colors.gray[400] : colors.gray[500]
                }
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={signupStyles.inputContainer}>
            <Text
              style={[
                signupStyles.inputLabel,
                isDark && signupStyles.textLight,
              ]}
            >
              Password
            </Text>
            <View style={signupStyles.inputWrapper}>
              <Feather
                name="lock"
                size={18}
                color={isDark ? colors.gray[400] : colors.gray[500]}
                style={signupStyles.inputIcon}
              />
              <TextInput
                style={[
                  signupStyles.input,
                  isDark && signupStyles.inputDark,
                  { paddingLeft: 40, paddingRight: 40 },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={
                  isDark ? colors.gray[400] : colors.gray[500]
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={signupStyles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {!showPhoneVerification && (
            <>
              <Button
                title="Continue"
                onPress={handleSignup}
                loading={loading}
                fullWidth
                style={signupStyles.signupButton}
              />

              <View style={signupStyles.divider}>
                <View
                  style={[
                    signupStyles.dividerLine,
                    isDark && signupStyles.dividerLineDark,
                  ]}
                />
                <Text
                  style={[
                    signupStyles.dividerText,
                    isDark && signupStyles.textMutedLight,
                  ]}
                >
                  OR
                </Text>
                <View
                  style={[
                    signupStyles.dividerLine,
                    isDark && signupStyles.dividerLineDark,
                  ]}
                />
              </View>
              <Text
                style={[
                  signupStyles.continueWithText,
                  isDark && signupStyles.textLight,
                ]}
              >
                Continue with
              </Text>
            </>
          )}
          {showPhoneVerification && (
            <>
              <View style={signupStyles.inputContainer}>
                <Text
                  style={[
                    signupStyles.inputLabel,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Phone Number
                </Text>
                <View style={signupStyles.inputWrapper}>
                  <TextInput
                    style={[
                      signupStyles.countryCodeInput,
                      isDark && signupStyles.inputDark,
                    ]}
                    placeholder="+1"
                    placeholderTextColor={
                      isDark ? colors.gray[400] : colors.gray[500]
                    }
                    value={countryCode}
                    onChangeText={(text) => {
                      // Allow + followed by up to 2 digits
                      if (text === "+" || /^\+\d{0,2}$/.test(text)) {
                        setCountryCode(text);
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="phone-pad"
                    maxLength={3}
                  />
                  <TextInput
                    style={[
                      signupStyles.phoneNumberInput,
                      isDark && signupStyles.inputDark,
                    ]}
                    placeholder="Phone number"
                    placeholderTextColor={
                      isDark ? colors.gray[400] : colors.gray[500]
                    }
                    value={phoneNumber}
                    onChangeText={(text) => {
                      // Only allow numbers
                      const numericText = text.replace(/[^0-9]/g, "");
                      setPhoneNumber(numericText);
                    }}
                    autoCapitalize="none"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Button
                title="Send Verification Code"
                onPress={handlePhoneAuth}
                loading={loading}
                fullWidth
                style={signupStyles.signupButton}
              />

              <TouchableOpacity
                onPress={() => setShowPhoneVerification(false)}
                style={signupStyles.backButton}
              >
                <Text
                  style={[
                    signupStyles.backButtonText,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Back to Email Signup
                </Text>
              </TouchableOpacity>
            </>
          )}

          {confirmation && (
            <>
              <View style={signupStyles.inputContainer}>
                <Text
                  style={[
                    signupStyles.inputLabel,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Verification Code
                </Text>
                <View style={signupStyles.inputWrapper}>
                  <Feather
                    name="lock"
                    size={18}
                    color={isDark ? colors.gray[400] : colors.gray[500]}
                    style={signupStyles.inputIcon}
                  />
                  <TextInput
                    style={[
                      signupStyles.input,
                      isDark && signupStyles.inputDark,
                      { paddingLeft: 40 },
                    ]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={
                      isDark ? colors.gray[400] : colors.gray[500]
                    }
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    autoCapitalize="none"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <Button
                title="Verify Code"
                onPress={handleVerifyCode}
                loading={loading}
                fullWidth
                style={signupStyles.signupButton}
              />

              <TouchableOpacity
                onPress={() => {
                  setConfirmation(null);
                  setVerificationCode("");
                }}
                style={signupStyles.backButton}
              >
                <Text
                  style={[
                    signupStyles.backButtonText,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Back to Phone Number
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!showPhoneVerification && !confirmation && (
            <View style={signupStyles.socialAuthContainer}>
              <View style={signupStyles.socialButtonContainer}>
                <TouchableOpacity
                  style={[
                    signupStyles.circularButton,
                    {
                      borderWidth: 1,
                      borderColor: isDark ? colors.gray[600] : colors.gray[300],
                      backgroundColor: "transparent",
                    },
                  ]}
                  onPress={() => setShowPhoneVerification(true)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="phone"
                    size={24}
                    color={isDark ? colors.gray[400] : colors.gray[600]}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    signupStyles.socialButtonText,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Phone
                </Text>
              </View>

              <View style={signupStyles.socialButtonContainer}>
                <TouchableOpacity
                  style={[
                    signupStyles.circularButton,
                    {
                      borderWidth: 1,
                      borderColor: isDark ? colors.gray[600] : colors.gray[300],
                      backgroundColor: "transparent",
                    },
                  ]}
                  onPress={handleGoogleAuth}
                  activeOpacity={0.7}
                >
                  <FontAwesome
                    name="google"
                    size={24}
                    color={isDark ? colors.gray[400] : colors.gray[600]}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    signupStyles.socialButtonText,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Google
                </Text>
              </View>

              <View style={signupStyles.socialButtonContainer}>
                <TouchableOpacity
                  style={[
                    signupStyles.circularButton,
                    {
                      borderWidth: 1,
                      borderColor: isDark ? colors.gray[600] : colors.gray[300],
                      backgroundColor: "transparent",
                    },
                  ]}
                  onPress={handleAppleAuth}
                  activeOpacity={0.7}
                >
                  <FontAwesome
                    name="apple"
                    size={24}
                    color={isDark ? colors.gray[400] : colors.gray[600]}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    signupStyles.socialButtonText,
                    isDark && signupStyles.textLight,
                  ]}
                >
                  Apple
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
