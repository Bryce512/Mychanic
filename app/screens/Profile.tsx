import React, { use } from "react";

import {
  View,
  Text,
  Button,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { styles } from "../theme/styles/Profile.styles";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { ToggleButton } from "react-native-paper";
import { deleteAccount } from "../services/firebaseService";

const Profile = () => {
  const { user, signOut, profile, viewMode, toggleViewMode } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const fadeAnim = React.useState(new Animated.Value(0))[0];
  const showToast = (message: string) => {
    setToastVisible(true);

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto hide after 2 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
        setShowUpdateSuccess(false);
      });
    }, 2000);
  };

  // Helper function to format phone number for display
  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return "";
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone; // Return as-is if not 10 digits
  };

  // Reload profile data when screen comes into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      const fetchUserProfile = async () => {
        if (user) {
          setLoading(true);
          try {
            // Check if we should show success message (profile was updated)
            if (showUpdateSuccess) {
              showToast("Profile updated successfully!");
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          } finally {
            setLoading(false);
          }
        }
      };

      fetchUserProfile();
    }, [user, showUpdateSuccess])
  );

  const hasCompleteProfile =
    profile && (profile.name || profile.phone || profile.address);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Alert.alert(
              "Confirm Deletion",
              "Type 'DELETE' below to confirm permanent account deletion.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Delete Account",
                  style: "destructive",
                  onPress: async () => {
                    if (!user?.uid) {
                      Alert.alert("Error", "User ID not found");
                      return;
                    }

                    setDeleting(true);
                    try {
                      const result = await deleteAccount(user.uid);

                      if (result.success) {
                        Alert.alert(
                          "Account Deleted",
                          "Your account has been permanently deleted."
                        );
                        // The auth state will change automatically and navigate to Login
                      } else {
                        Alert.alert(
                          "Error",
                          result.error?.message ||
                            "Failed to delete account. Please try again."
                        );
                      }
                    } catch (error: any) {
                      Alert.alert(
                        "Error",
                        error.message || "An unexpected error occurred"
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.white }}
      edges={["bottom", "left", "right"]}
    >
      {/* Toast Banner */}
      {toastVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            right: 20,
            backgroundColor: colors.primary[500],
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            opacity: fadeAnim,
            zIndex: 1000,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            Profile updated successfully!
          </Text>
        </Animated.View>
      )}

      {/* Header with edit button */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16,
          backgroundColor: colors.white,
        }}
      >
        <Text style={[styles.title, { fontSize: 24, fontWeight: "bold" }]}>
          {hasCompleteProfile && profile.name ? profile.name : "Profile"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {hasCompleteProfile && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary[500],
                padding: 8,
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                setShowUpdateSuccess(true);
                navigation.navigate("EditProfile" as never);
              }}
            >
              <Feather name="edit-2" size={18} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: colors.gray[200],
              padding: 8,
              borderRadius: 20,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setShowSettings(true)}
          >
            <Feather name="settings" size={18} color={colors.gray[700]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.container, { paddingTop: 0 }]}>
        {loading ? (
          <Text style={styles.info}>Loading profile...</Text>
        ) : hasCompleteProfile ? (
          <>
            {user?.email && (
              <Text style={styles.info}>Email: {user.email}</Text>
            )}
            {profile.phone && (
              <Text style={styles.info}>
                Phone: {formatPhoneDisplay(profile.phone)}
              </Text>
            )}
            {profile.address && (
              <Text style={styles.info}>Address: {profile.address}</Text>
            )}
            {profile.city && (
              <Text style={styles.info}>City: {profile.city}</Text>
            )}
            {profile.state && (
              <Text style={styles.info}>State: {profile.state}</Text>
            )}
            {profile.zipCode && (
              <Text style={styles.info}>Zip Code: {profile.zipCode}</Text>
            )}
            <TouchableOpacity>
              <Text
                style={{ color: colors.primary[500], textAlign: "center" }}
                onPress={() => navigation.navigate("Checkout" as never)}
              >
                Checkout Screen Test
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.info}>No profile information available</Text>
            {user?.email && (
              <Text style={styles.info}>Email: {user.email}</Text>
            )}

            <View style={{ marginTop: 20, marginBottom: 20 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary[500],
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
                onPress={() => navigation.navigate("AddProfile" as never)}
              >
                <Feather
                  name="plus"
                  size={18}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Complete Profile
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* View Mode Toggle for Mechanics */}
        {profile?.role === "mechanic" && (
          <View style={{ marginTop: 20, marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor:
                  viewMode === "mechanic"
                    ? colors.primary[500]
                    : colors.gray[400],
                padding: 12,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
              onPress={toggleViewMode}
            >
              <Feather
                name={viewMode === "mechanic" ? "user" : "truck"}
                size={18}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: "white", fontWeight: "bold" }}>
                {viewMode === "mechanic"
                  ? "Switch to Customer View"
                  : "Switch to Mechanic View"}
              </Text>
            </TouchableOpacity>

            {/* Driver Onboarding Button for Mechanics */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.accent[500],
                padding: 12,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
              onPress={() => navigation.navigate("DriverOnboarding" as never)}
            >
              <Feather
                name="user-check"
                size={18}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Complete Driver Onboarding
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ marginTop: "auto", paddingBottom: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary[500],
              padding: 12,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
            onPress={() => navigation.navigate("Feedback" as never)}
          >
            <Feather
              name="message-square"
              size={18}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "white", fontWeight: "bold" }}>
              Send Feedback
            </Text>
          </TouchableOpacity>

          <Button title="Log Out" onPress={signOut} color="#d9534f" />
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-start",
            paddingTop: 80,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              marginHorizontal: 20,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            {/* Settings Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.gray[200],
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: colors.gray[900],
                }}
              >
                Settings
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Feather name="x" size={24} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {/* Settings Menu Items */}
            <View>
              {/* Maintenance Configs - Placeholder for future */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[100],
                }}
                onPress={() => {
                  setShowSettings(false);
                  // TODO: Navigate to maintenance configs
                  Alert.alert(
                    "Coming Soon",
                    "Maintenance configurations will be available soon."
                  );
                }}
              >
                <Feather
                  name="tool"
                  size={18}
                  color={colors.primary[500]}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.gray[900],
                    flex: 1,
                  }}
                >
                  Maintenance Configs
                </Text>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>

              {/* Delete Account */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
                onPress={() => {
                  setShowSettings(false);
                  handleDeleteAccount();
                }}
              >
                <Feather
                  name="trash-2"
                  size={18}
                  color="#c9302c"
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color: "#c9302c",
                    flex: 1,
                  }}
                >
                  Delete Account
                </Text>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tap outside to close */}
          <TouchableOpacity
            style={{
              flex: 1,
            }}
            onPress={() => setShowSettings(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;
