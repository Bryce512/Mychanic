import React, { useState } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteAccount } from "../services/firebaseService";
import { launchImageLibrary } from "react-native-image-picker";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { getAuth, updateProfile } from "@react-native-firebase/auth";

const Profile = () => {
  const { user, signOut, profile, viewMode, toggleViewMode } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUpdateTimestamp, setPhotoUpdateTimestamp] = useState(0);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
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
    }, [user, showUpdateSuccess]),
  );

  // Sync context user's photoURL to local state when it changes
  React.useEffect(() => {
    if (user?.photoURL && !localPhotoURL) {
      setLocalPhotoURL(user.photoURL);
    }
  }, [user?.photoURL]);

  const hasCompleteProfile =
    profile && (profile.name || profile.phone || profile.address);

  const handlePickProfilePhoto = async () => {
    try {
      launchImageLibrary(
        {
          mediaType: "photo",
          includeBase64: false,
          quality: 0.6,
          maxWidth: 400,
          maxHeight: 400,
        },
        async (response) => {
          if (
            !response.didCancel &&
            !response.errorCode &&
            response.assets?.[0]
          ) {
            try {
              setUploadingPhoto(true);
              const asset = response.assets[0];

              if (!user?.uid) {
                Alert.alert("Error", "User not found");
                setUploadingPhoto(false);
                return;
              }

              // Upload to Firebase Storage using the new modular API
              const storage = getStorage();
              const storageRef = ref(storage, `profilePhotos/${user.uid}`);
              await putFile(storageRef, asset.uri!);

              // Get download URL
              const photoURL = await getDownloadURL(storageRef);

              // Update Firebase Auth profile
              const auth = getAuth();
              if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                  photoURL,
                });
              }

              showToast("Profile photo updated!");
              setLocalPhotoURL(photoURL);
              setPhotoUpdateTimestamp(Date.now());
              setUploadingPhoto(false);
            } catch (error: any) {
              console.error("Error uploading photo:", error);
              Alert.alert("Error", error.message || "Failed to upload photo");
              setUploadingPhoto(false);
            }
          } else if (response.errorCode) {
            Alert.alert(
              "Error",
              response.errorMessage || "Failed to select image",
            );
          }
        },
      );
    } catch (error: any) {
      console.error("Error launching image picker:", error);
      Alert.alert("Error", error.message || "Failed to launch image picker");
    }
  };

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
                          "Your account has been permanently deleted.",
                        );
                        // The auth state will change automatically and navigate to Login
                      } else {
                        Alert.alert(
                          "Error",
                          result.error?.message ||
                            "Failed to delete account. Please try again.",
                        );
                      }
                    } catch (error: any) {
                      Alert.alert(
                        "Error",
                        error.message || "An unexpected error occurred",
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.gray[50] }}
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
            shadowOffset: { width: 0, height: 2 },
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View
          style={{ backgroundColor: colors.primary[500], paddingBottom: 44 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingHorizontal: 16,
              paddingTop: 16,
              gap: 8,
            }}
          >
            {/* Mechanic Onboarding Status */}
            {profile?.role === "mechanic" &&
              profile?.onboardingStatus !== "approved" && (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center" }}
                  onPress={() => {
                    if (
                      profile?.onboardingStatus === "incomplete" ||
                      !profile?.onboardingStatus
                    ) {
                      navigation.navigate("DriverOnboarding" as never);
                    }
                  }}
                  disabled={
                    profile?.onboardingStatus === "pending" ||
                    profile?.onboardingStatus === "rejected"
                  }
                >
                  <View
                    style={{
                      backgroundColor:
                        profile?.onboardingStatus === "pending"
                          ? "#2196F3"
                          : profile?.onboardingStatus === "rejected"
                            ? "#F44336"
                            : "#FFC107",
                      borderRadius: 20,
                      width: 40,
                      height: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                    }}
                  >
                    <Feather
                      name={
                        profile?.onboardingStatus === "pending"
                          ? "clock"
                          : profile?.onboardingStatus === "rejected"
                            ? "x-circle"
                            : "alert-triangle"
                      }
                      size={18}
                      color="white"
                    />
                  </View>
                  <View
                    style={{
                      backgroundColor:
                        profile?.onboardingStatus === "pending"
                          ? "#E3F2FD"
                          : profile?.onboardingStatus === "rejected"
                            ? "#FFEBEE"
                            : "#FFF9E6",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      marginLeft: -12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color:
                          profile?.onboardingStatus === "pending"
                            ? "#1565C0"
                            : profile?.onboardingStatus === "rejected"
                              ? "#C62828"
                              : "#856404",
                        fontWeight: "600",
                      }}
                    >
                      {profile?.onboardingStatus === "pending"
                        ? "Pending Review"
                        : profile?.onboardingStatus === "rejected"
                          ? "Application Rejected"
                          : "Complete Onboarding"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            <View style={{ flex: 1 }} />
            {hasCompleteProfile && (
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
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
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 20,
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setShowSettings(true)}
            >
              <Feather name="settings" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: "center", marginTop: 8 }}>
            <TouchableOpacity
              onPress={handlePickProfilePhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  borderWidth: 3,
                  borderColor: "rgba(255,255,255,0.7)",
                  overflow: "hidden",
                  backgroundColor: colors.primary[300],
                }}
              >
                {localPhotoURL || user?.photoURL ? (
                  <Image
                    source={{
                      uri: `${localPhotoURL || user?.photoURL}?t=${photoUpdateTimestamp}`,
                    }}
                    style={{ width: 90, height: 90 }}
                    key={photoUpdateTimestamp}
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 34,
                        fontWeight: "bold",
                      }}
                    >
                      {profile?.name?.[0]?.toUpperCase() ??
                        user?.email?.[0]?.toUpperCase() ??
                        "?"}
                    </Text>
                  </View>
                )}
              </View>
              {uploadingPhoto && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: colors.primary[500],
                    borderRadius: 12,
                    padding: 4,
                  }}
                >
                  <Feather name="loader" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "bold",
                marginTop: 12,
              }}
            >
              {profile?.name ?? "Your Profile"}
            </Text>
            {profile?.role && (
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 14,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {profile.role}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Cards — overlap the header */}
        <View
          style={{ marginTop: -20, paddingHorizontal: 16, paddingBottom: 32 }}
        >
          {/* Quick stats row — 2 boxes */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Feather name="briefcase" size={22} color={colors.primary[500]} />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.gray[600],
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                My Job Requests
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: 14,
                padding: 14,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Feather name="clock" size={22} color={colors.primary[500]} />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.gray[600],
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Service History
              </Text>
            </View>
          </View>

          {/* Preferred Mechanic card */}
          <TouchableOpacity
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Preferred mechanic selection will be available soon.",
              )
            }
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.gray[100],
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Feather name="tool" size={22} color={colors.gray[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 15,
                  color: colors.gray[900],
                }}
              >
                Preferred Mechanic
              </Text>
              <Text
                style={{ fontSize: 12, color: colors.gray[400], marginTop: 2 }}
              >
                Coming soon
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.gray[300]} />
          </TouchableOpacity>

          {/* Details card */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 6,
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 14,
                  color: colors.gray[900],
                }}
              >
                Details
              </Text>
            </View>
            {user?.email && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Feather
                  name="mail"
                  size={18}
                  color={colors.primary[500]}
                  style={{ marginRight: 14 }}
                />
                <Text
                  style={{ color: colors.gray[700], fontSize: 14, flex: 1 }}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              </View>
            )}
            {profile?.phone && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Feather
                  name="phone"
                  size={18}
                  color={colors.primary[500]}
                  style={{ marginRight: 14 }}
                />
                <Text style={{ color: colors.gray[700], fontSize: 14 }}>
                  {formatPhoneDisplay(profile.phone)}
                </Text>
              </View>
            )}
            {profile?.address && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Feather
                  name="home"
                  size={18}
                  color={colors.primary[500]}
                  style={{ marginRight: 14 }}
                />
                <Text
                  style={{ color: colors.gray[700], fontSize: 14, flex: 1 }}
                  numberOfLines={1}
                >
                  {profile.address}
                </Text>
              </View>
            )}
            {profile?.zipCode && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Feather
                  name="navigation"
                  size={18}
                  color={colors.primary[500]}
                  style={{ marginRight: 14 }}
                />
                <Text style={{ color: colors.gray[700], fontSize: 14 }}>
                  {profile.zipCode}
                </Text>
              </View>
            )}
          </View>

          {/* Complete profile prompt */}
          {!hasCompleteProfile && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary[500],
                padding: 14,
                borderRadius: 14,
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
          )}
        </View>
      </ScrollView>

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
                  Alert.alert(
                    "Coming Soon",
                    "Maintenance configurations will be available soon.",
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

              {/* Admin: Review Mechanics */}
              {profile?.role === "admin" && (
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
                    navigation.navigate("AdminReviewMechanics" as never);
                  }}
                >
                  <Feather
                    name="user-check"
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
                    Review Mechanics
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.gray[400]}
                  />
                </TouchableOpacity>
              )}

              {/* Send Feedback */}
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
                  navigation.navigate("Feedback" as never);
                }}
              >
                <Feather
                  name="message-square"
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
                  Send Feedback
                </Text>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>

              {/* Log Out */}
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
                  signOut();
                }}
              >
                <Feather
                  name="log-out"
                  size={18}
                  color="#d9534f"
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color: "#d9534f",
                    flex: 1,
                  }}
                >
                  Log Out
                </Text>
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
