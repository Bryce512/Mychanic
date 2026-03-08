import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../components/theme-provider";
import Button from "../components/Button";
import { colors } from "../theme/colors";
import firebaseService, { getVehicles } from "../services/firebaseService";
import { pricingModalStyles } from "../components/PricingModal";
import PricingModal from "../components/PricingModal";
import {
  PlacesService,
  type AddressSuggestion,
} from "../services/placesService";
import type { vehicle } from "../../types";

type SymptomOption = {
  id: string;
  label: string;
  selected: boolean;
};

type PreferredTime = {
  period: "morning" | "afternoon" | "evening";
  dayType: "weekday" | "weekend";
};

export default function RequestJobScreen() {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const { colors: themeColors, isDark } = useTheme();

  // Form state
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [jobType, setJobType] = useState<string>("");
  const [symptoms, setSymptoms] = useState<SymptomOption[]>([
    { id: "engine", label: "Engine Issues", selected: false },
    { id: "transmission", label: "Transmission Problems", selected: false },
    { id: "brakes", label: "Brake Problems", selected: false },
    { id: "electrical", label: "Electrical Issues", selected: false },
    { id: "suspension", label: "Suspension/Steering", selected: false },
    { id: "exhaust", label: "Exhaust System", selected: false },
    { id: "cooling", label: "Cooling System", selected: false },
    { id: "tires", label: "Tire/Wheel Issues", selected: false },
    { id: "battery", label: "Battery Problems", selected: false },
    { id: "oil", label: "Oil/Leak Issues", selected: false },
    { id: "noise", label: "Strange Noises", selected: false },
    { id: "performance", label: "Performance Issues", selected: false },
  ]);
  const [description, setDescription] = useState<string>("");
  const [preferredTimes, setPreferredTimes] = useState<PreferredTime[]>([]);
  const [preferredLocation, setPreferredLocation] = useState<"work" | "home">(
    "home"
  );
  const [address, setAddress] = useState<string>("");

  // UI state
  const [vehicles, setVehicles] = useState<vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Address validation state
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [geocodedLocation, setGeocodedLocation] = useState<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modal states
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showJobTypePicker, setShowJobTypePicker] = useState(false);
  const [showSymptomsPicker, setShowSymptomsPicker] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<{
    homeAddress?: string;
    workAddress?: string;
  }>({});

  // Refs
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load user's vehicles
  useEffect(() => {
    const loadVehicles = async () => {
      if (!user?.uid) return;

      try {
        const userVehicles = await getVehicles(user.uid);
        setVehicles(userVehicles);
      } catch (error) {
        console.error("Error loading vehicles:", error);
        Alert.alert("Error", "Failed to load your vehicles");
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();
  }, [user?.uid]);

  // Load user's saved addresses
  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!user?.uid) return;

      try {
        const userProfile = await firebaseService.getUserProfile(user.uid);
        if (userProfile) {
          const addresses = {
            homeAddress: userProfile.homeAddress,
            workAddress: userProfile.workAddress,
          };
          setSavedAddresses(addresses);

          // Autopopulate the default location (home) if it exists
          if (preferredLocation === "home" && addresses.homeAddress) {
            setAddress(addresses.homeAddress);
            setTimeout(() => validateAddress(addresses.homeAddress!), 100);
          }
        }
      } catch (error) {
        console.error("Error loading saved addresses:", error);
      }
    };

    loadSavedAddresses();
  }, [user?.uid]);

  // Autopopulate address when preferred location changes
  useEffect(() => {
    if (preferredLocation === "home" && savedAddresses.homeAddress) {
      setAddress(savedAddresses.homeAddress);
      setAddressValid(null);
      setGeocodedLocation(null);
      setTimeout(() => validateAddress(savedAddresses.homeAddress!), 100);
    } else if (preferredLocation === "work" && savedAddresses.workAddress) {
      setAddress(savedAddresses.workAddress);
      setAddressValid(null);
      setGeocodedLocation(null);
      setTimeout(() => validateAddress(savedAddresses.workAddress!), 100);
    }
  }, [preferredLocation, savedAddresses]);

  // Validate address when it changes (only when suggestions are not shown)
  useEffect(() => {
    if (!showSuggestions && address.trim().length > 5) {
      const debounceTimer = setTimeout(() => {
        validateAddress(address);
      }, 1000);

      return () => clearTimeout(debounceTimer);
    }
  }, [address, showSuggestions]);

  const toggleSymptom = (symptomId: string) => {
    setSymptoms((prev) =>
      prev.map((symptom) =>
        symptom.id === symptomId
          ? { ...symptom, selected: !symptom.selected }
          : symptom
      )
    );
  };

  const togglePreferredTime = (
    period: "morning" | "afternoon" | "evening",
    dayType: "weekday" | "weekend"
  ) => {
    setPreferredTimes((prev) => {
      const existingIndex = prev.findIndex(
        (time) => time.period === period && time.dayType === dayType
      );
      if (existingIndex >= 0) {
        // Remove if already selected
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add if not selected
        return [...prev, { period, dayType }];
      }
    });
  };

  // Validate address by geocoding it
  const validateAddress = async (addressToValidate: string) => {
    if (!addressToValidate.trim()) {
      setAddressValid(null);
      setGeocodedLocation(null);
      return;
    }

    setIsValidatingAddress(true);
    try {
      const geocodeResult = await PlacesService.validateAndGeocodeAddress(
        addressToValidate
      );
      if (geocodeResult) {
        setAddressValid(true);
        setGeocodedLocation({
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          formattedAddress: geocodeResult.formattedAddress,
        });
      } else {
        setAddressValid(false);
        setGeocodedLocation(null);
      }
    } catch (error) {
      console.error("Address validation error:", error);
      setAddressValid(false);
      setGeocodedLocation(null);
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Fetch address suggestions
  const fetchAddressSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestions = await PlacesService.getAddressSuggestions(query);
      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle address input change
  const handleAddressChange = (text: string) => {
    setAddress(text);
    setAddressValid(null);
    setGeocodedLocation(null);

    // Clear previous timeout
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }

    // Clear suggestions if text is too short
    if (text.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounced suggestions fetch
    addressTimeoutRef.current = setTimeout(() => {
      fetchAddressSuggestions(text);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.displayName);
    setGeocodedLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      formattedAddress: suggestion.displayName,
    });
    setAddressValid(true);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const getSelectedVehicleText = () => {
    if (!selectedVehicle) return "Choose a vehicle...";
    const vehicle = vehicles.find((v) => v.id === selectedVehicle);
    return vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "Choose a vehicle...";
  };

  const getSelectedSymptomsText = () => {
    const selectedCount = symptoms.filter((s) => s.selected).length;
    if (selectedCount === 0) return "Select symptoms...";
    if (selectedCount === 1) return "1 symptom selected";
    return `${selectedCount} symptoms selected`;
  };

  const validateForm = () => {
    if (!selectedVehicle) {
      Alert.alert("Validation Error", "Please select a vehicle");
      return false;
    }

    if (!jobType) {
      Alert.alert("Validation Error", "Please select a job type");
      return false;
    }

    if (preferredTimes.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please select at least one preferred time"
      );
      return false;
    }

    if (!address.trim()) {
      Alert.alert(
        "Validation Error",
        "Please provide an address for the service location"
      );
      return false;
    }

    if (addressValid === false) {
      Alert.alert(
        "Invalid Address",
        "The address you entered could not be found. Please check the spelling and try again."
      );
      return false;
    }

    if (addressValid === null && !isValidatingAddress) {
      Alert.alert(
        "Address Validation",
        "Please wait for address validation to complete or check your address."
      );
      return false;
    }

    return true;
  };

  // Check if form is valid without showing alerts (for button state)
  const isFormValid = () => {
    return (
      selectedVehicle &&
      jobType &&
      preferredTimes.length > 0 &&
      address.trim() &&
      addressValid !== false &&
      (addressValid === true || isValidatingAddress)
    );
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.uid) return;

    setLoading(true);

    try {
      const selectedVehicleData = vehicles.find(
        (v) => v.id === selectedVehicle
      );
      const selectedSymptoms = symptoms.filter((s) => s.selected);

      const jobData = {
        title: `${
          jobType.charAt(0).toUpperCase() + jobType.slice(1)
        } Service Request`,
        description: description.trim(),
        status: "available" as const,
        ownerId: user.uid,
        vehicleId: selectedVehicle,
        customerName: profile?.name || "Unknown Customer",
        customerPhone: profile?.phone || "",
        customerLocation: profile?.location || "",
        customerZipCode: profile?.zipCode || "",
        customerAddress: geocodedLocation?.formattedAddress || address.trim(),
        customerLatitude: geocodedLocation?.latitude,
        customerLongitude: geocodedLocation?.longitude,
        vehicleMake: selectedVehicleData?.make || "",
        vehicleModel: selectedVehicleData?.model || "",
        vehicleYear: selectedVehicleData?.year?.toString() || "",
        priority: "medium" as const,
        symptoms: selectedSymptoms.map((s) => s.label),
        preferredTimes: preferredTimes.map(
          (time) => `${time.dayType}-${time.period}`
        ),
        preferredLocation,
        createdAt: new Date(),
      };

      // Add job to Firebase
      await firebaseService.createJob(jobData);

      // Save address to user profile
      const addressType =
        preferredLocation === "home" ? "homeAddress" : "workAddress";
      await firebaseService.updateUserAddress(
        user.uid,
        addressType,
        address.trim()
      );

      Alert.alert(
        "Success",
        "Your job request has been submitted successfully! Mechanics will be able to see and claim your job.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error submitting job request:", error);
      Alert.alert("Error", "Failed to submit job request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingVehicles) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.white }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading your vehicles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function getSelectedJobTypeText(): React.ReactNode {
    if (!jobType) return "Select job type...";
    switch (jobType) {
      case "brakes":
        return "Brakes";
      case "oil":
        return "Oil Change";
      case "tires":
        return "Tire Rotation";
      case "diagnosis":
        return "Diagnosis";
      case "other":
        return "Other";
      default:
        return "Select job type...";
    }
  }
  function isPreferredTimeSelected(
    period: "morning" | "afternoon" | "evening",
    dayType: "weekday" | "weekend"
  ) {
    return preferredTimes.some(
      (time) => time.period === period && time.dayType === dayType
    );
  }
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.white }]}
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={[styles.title, isDark && styles.textLight]}>
              Request Job
            </Text>
            <Text style={[styles.subtitle, isDark && styles.textMutedLight]}>
              Tell us about the issue with your vehicle
            </Text>
            <TouchableOpacity
              style={pricingModalStyles.pricingGuideContainer}
              onPress={() => setShowPricingModal(true)}
            >
              <Feather
                name="info"
                size={16}
                color={colors.primary[500]}
                style={pricingModalStyles.pricingIcon}
              />
              <Text
                style={[
                  pricingModalStyles.pricingGuideText,
                  isDark && pricingModalStyles.pricingGuideTextDark,
                ]}
              >
                Pricing Guide
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Select Vehicle
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerContainer,
                isDark && styles.pickerContainerDark,
              ]}
              onPress={() => setShowVehiclePicker(true)}
            >
              <View style={styles.pickerContent}>
                <Text
                  style={[
                    styles.pickerText,
                    isDark && styles.pickerTextDark,
                    !selectedVehicle && styles.placeholderText,
                  ]}
                >
                  {getSelectedVehicleText()}
                </Text>
                <Feather
                  name="chevron-down"
                  size={20}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Job Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Job Type
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerContainer,
                isDark && styles.pickerContainerDark,
              ]}
              onPress={() => setShowJobTypePicker(true)}
            >
              <View style={styles.pickerContent}>
                <Text
                  style={[
                    styles.pickerText,
                    isDark && styles.pickerTextDark,
                    !jobType && styles.placeholderText,
                  ]}
                >
                  {getSelectedJobTypeText()}
                </Text>
                <Feather
                  name="chevron-down"
                  size={20}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Symptoms */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Symptoms
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerContainer,
                isDark && styles.pickerContainerDark,
              ]}
              onPress={() => setShowSymptomsPicker(true)}
            >
              <View style={styles.pickerContent}>
                <Text
                  style={[
                    styles.pickerText,
                    isDark && styles.pickerTextDark,
                    symptoms.filter((s) => s.selected).length === 0 &&
                      styles.placeholderText,
                  ]}
                >
                  {getSelectedSymptomsText()}
                </Text>
                <Feather
                  name="chevron-down"
                  size={20}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Additional Details
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                isDark && styles.descriptionInputDark,
              ]}
              multiline
              placeholder="Describe the problem in more detail..."
              placeholderTextColor={
                isDark ? colors.gray[400] : colors.gray[500]
              }
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Preferred Times */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Preferred Times
            </Text>
            <View style={styles.timeGrid}>
              {[
                { period: "morning" as const, label: "Morning (9AM-12PM)" },
                { period: "afternoon" as const, label: "Afternoon (12PM-5PM)" },
                { period: "evening" as const, label: "Evening (5PM-8PM)" },
              ].map(({ period, label }) => (
                <View key={period} style={styles.timeRow}>
                  <Text style={[styles.timeLabel, isDark && styles.textLight]}>
                    {label}
                  </Text>
                  <View style={styles.dayButtons}>
                    <Button
                      title="Weekday"
                      onPress={() => togglePreferredTime(period, "weekday")}
                      variant={
                        isPreferredTimeSelected(period, "weekday")
                          ? "primary"
                          : "outline"
                      }
                      style={styles.dayButton}
                      textStyle={
                        isPreferredTimeSelected(period, "weekday")
                          ? undefined
                          : isDark
                          ? styles.dayTextDark
                          : styles.dayTextLight
                      }
                    />
                    <Button
                      title="Weekend"
                      onPress={() => togglePreferredTime(period, "weekend")}
                      variant={
                        isPreferredTimeSelected(period, "weekend")
                          ? "primary"
                          : "outline"
                      }
                      style={styles.dayButton}
                      textStyle={
                        isPreferredTimeSelected(period, "weekend")
                          ? undefined
                          : isDark
                          ? styles.dayTextDark
                          : styles.dayTextLight
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Preferred Location */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Preferred Location
            </Text>
            <View style={styles.locationButtons}>
              <Button
                title="Home"
                onPress={() => setPreferredLocation("home")}
                variant={preferredLocation === "home" ? "primary" : "outline"}
                style={styles.locationButton}
                textStyle={
                  preferredLocation === "home"
                    ? undefined
                    : isDark
                    ? styles.locationTextDark
                    : styles.locationTextLight
                }
              />
              <Button
                title="Work"
                onPress={() => setPreferredLocation("work")}
                variant={preferredLocation === "work" ? "primary" : "outline"}
                style={styles.locationButton}
                textStyle={
                  preferredLocation === "work"
                    ? undefined
                    : isDark
                    ? styles.locationTextDark
                    : styles.locationTextLight
                }
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
              Address
            </Text>
            <View style={styles.addressSectionContainer}>
              <View style={styles.addressContainer}>
                <TextInput
                  style={[
                    styles.addressInput,
                    isDark && styles.addressInputDark,
                    addressValid === false && styles.addressInputError,
                    addressValid === true && styles.addressInputSuccess,
                  ]}
                  placeholder="Enter your address for the service location"
                  placeholderTextColor={
                    isDark ? colors.gray[400] : colors.gray[500]
                  }
                  value={address}
                  onChangeText={handleAddressChange}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow selection
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                />
                {isValidatingAddress && (
                  <View style={styles.validationIcon}>
                    <Feather
                      name="loader"
                      size={20}
                      color={colors.primary[500]}
                    />
                  </View>
                )}
                {!isValidatingAddress && addressValid === true && (
                  <View style={styles.validationIcon}>
                    <Feather
                      name="check-circle"
                      size={20}
                      color={colors.green[500]}
                    />
                  </View>
                )}
                {!isValidatingAddress &&
                  addressValid === false &&
                  address.trim() && (
                    <View style={styles.validationIcon}>
                      <Feather
                        name="x-circle"
                        size={20}
                        color={colors.red[500]}
                      />
                    </View>
                  )}
              </View>

              {/* Address Suggestions - using ScrollView with disabled scrolling to avoid nesting */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <ScrollView
                  style={[
                    styles.suggestionsContainer,
                    isDark && styles.suggestionsContainerDark,
                  ]}
                  scrollEnabled={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {addressSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.placeId}
                      style={[
                        styles.suggestionItem,
                        isDark && styles.suggestionItemDark,
                      ]}
                      onPress={() => handleSuggestionSelect(item)}
                    >
                      <Feather
                        name="map-pin"
                        size={16}
                        color={colors.primary[500]}
                        style={styles.suggestionIcon}
                      />
                      <Text
                        style={[
                          styles.suggestionText,
                          isDark && styles.suggestionTextDark,
                        ]}
                        numberOfLines={2}
                      >
                        {item.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {addressValid === false &&
                address.trim() &&
                !isValidatingAddress && (
                  <Text style={styles.addressErrorText}>
                    Address not found. Please check spelling and try again.
                  </Text>
                )}
              {addressValid === true && geocodedLocation && (
                <Text
                  style={[
                    styles.addressSuccessText,
                    isDark && styles.addressSuccessTextDark,
                  ]}
                >
                  ✓ Valid address: {geocodedLocation.formattedAddress}
                </Text>
              )}
              {isValidatingAddress && (
                <Text
                  style={[
                    styles.addressValidatingText,
                    isDark && styles.addressValidatingTextDark,
                  ]}
                >
                  Validating address...
                </Text>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <Button
              title="Submit Job Request"
              onPress={handleSubmit}
              loading={loading}
              disabled={!isFormValid() || loading}
              fullWidth
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Vehicle Picker Modal */}
      <Modal
        visible={showVehiclePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVehiclePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVehiclePicker(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping modal content
          >
            <View
              style={[styles.modalHeader, isDark && styles.modalHeaderDark]}
            >
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                Select Vehicle
              </Text>
              <TouchableOpacity onPress={() => setShowVehiclePicker(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray[900]}
                />
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={selectedVehicle}
              onValueChange={(value) => {
                setSelectedVehicle(value);
                setShowVehiclePicker(false);
              }}
              style={[styles.modalPicker, isDark && styles.modalPickerDark]}
            >
              <Picker.Item label="Choose a vehicle..." value="" />
              {vehicles.map((vehicle) => (
                <Picker.Item
                  key={vehicle.id}
                  label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  value={vehicle.id}
                />
              ))}
            </Picker>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Job Type Picker Modal */}
      <Modal
        visible={showJobTypePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowJobTypePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowJobTypePicker(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping modal content
          >
            <View
              style={[styles.modalHeader, isDark && styles.modalHeaderDark]}
            >
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                Select Job Type
              </Text>
              <TouchableOpacity onPress={() => setShowJobTypePicker(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray[900]}
                />
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={jobType}
              onValueChange={(value) => {
                setJobType(value);
                setShowJobTypePicker(false);
              }}
              style={[styles.modalPicker, isDark && styles.modalPickerDark]}
            >
              <Picker.Item label="Select job type..." value="" />
              <Picker.Item label="Brakes" value="brakes" />
              <Picker.Item label="Oil Change" value="oil" />
              <Picker.Item label="Tire Rotation" value="tires" />
              <Picker.Item label="Diagnosis" value="diagnosis" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Symptoms Picker Modal */}
      <Modal
        visible={showSymptomsPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSymptomsPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSymptomsPicker(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping modal content
          >
            <View
              style={[styles.modalHeader, isDark && styles.modalHeaderDark]}
            >
              <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                Select Symptoms
              </Text>
              <TouchableOpacity onPress={() => setShowSymptomsPicker(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray[900]}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.symptomsModalContent}>
              <Text
                style={[
                  styles.symptomsModalSubtitle,
                  isDark && styles.textMutedLight,
                ]}
              >
                Select all symptoms that apply to your vehicle
              </Text>
              <View style={styles.symptomsGrid}>
                {symptoms.map((symptom) => (
                  <Button
                    key={symptom.id}
                    title={symptom.label}
                    onPress={() => toggleSymptom(symptom.id)}
                    variant={symptom.selected ? "primary" : "outline"}
                    style={styles.symptomButton}
                    textStyle={
                      symptom.selected
                        ? undefined
                        : isDark
                        ? styles.symptomTextDark
                        : styles.symptomTextLight
                    }
                  />
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button
                  title="Done"
                  onPress={() => setShowSymptomsPicker(false)}
                  style={styles.doneButton}
                />
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <PricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[900],
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  pickerContainerDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  pickerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: colors.gray[900],
  },
  pickerTextDark: {
    color: colors.white,
  },
  placeholderText: {
    color: colors.gray[500],
  },
  symptomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  symptomButton: {
    flex: 1,
    minWidth: "48%",
    marginBottom: 8,
  },
  symptomTextLight: {
    color: colors.gray[700],
  },
  symptomTextDark: {
    color: colors.gray[300],
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: colors.white,
    color: colors.gray[900],
    fontSize: 16,
  },
  descriptionInputDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
    color: colors.white,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    paddingRight: 44, // Extra padding for the validation icon
    backgroundColor: colors.white,
    color: colors.gray[900],
    fontSize: 16,
  },
  addressInputDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
    color: colors.white,
    paddingRight: 44, // Extra padding for the validation icon
  },
  addressContainer: {
    position: "relative",
  },
  addressSectionContainer: {
    position: "relative",
  },
  addressInputError: {
    borderColor: colors.red[500],
  },
  addressInputSuccess: {
    borderColor: colors.green[500],
  },
  validationIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  addressErrorText: {
    color: colors.red[500],
    fontSize: 14,
    marginTop: 4,
  },
  addressSuccessText: {
    color: colors.green[500],
    fontSize: 14,
    marginTop: 4,
  },
  addressSuccessTextDark: {
    color: colors.green[500],
  },
  addressValidatingText: {
    color: colors.primary[500],
    fontSize: 14,
    marginTop: 4,
  },
  addressValidatingTextDark: {
    color: colors.primary[400],
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    backgroundColor: colors.white,
    marginTop: 4,
    maxHeight: 150,
  },
  suggestionsContainerDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  suggestionItemDark: {
    borderBottomColor: colors.gray[700],
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.gray[900],
    flex: 1,
  },
  suggestionTextDark: {
    color: colors.white,
  },
  timeGrid: {
    gap: 15,
  },
  timeRow: {
    gap: 12,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
  },
  dayButtons: {
    flexDirection: "row",
    gap: 8,
  },
  dayButton: {
    flex: 1,
  },
  dayTextLight: {
    color: colors.gray[700],
  },
  dayTextDark: {
    color: colors.gray[300],
  },
  locationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  locationButton: {
    flex: 1,
  },
  locationTextLight: {
    color: colors.gray[700],
  },
  locationTextDark: {
    color: colors.gray[300],
  },
  submitSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  submitButton: {
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[600],
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalContentDark: {
    backgroundColor: colors.gray[900],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalHeaderDark: {
    borderBottomColor: colors.gray[700],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  modalPicker: {
    height: 200,
    color: colors.gray[900],
  },
  modalPickerDark: {
    color: colors.white,
  },
  symptomsModalContent: {
    padding: 20,
  },
  symptomsModalSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 20,
    textAlign: "center",
  },
  modalActions: {
    marginTop: 20,
    alignItems: "center",
  },
  doneButton: {
    minWidth: 120,
  },
});
