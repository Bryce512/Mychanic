"use client";

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  useColorScheme,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import Button from "../components/Button";
import Card, { CardContent } from "../components/Card";
import MechanicCard from "../components/MechanicCard";
import { styles } from "../theme/styles/FindMechanics.styles";
import { colors } from "../theme/colors";
import {
  PlacesService,
  getMockMechanicData,
  type PlaceResult,
} from "../services/placesService";

// Mock data
const mechanicData = [
  {
    id: 1,
    name: "Precision Auto Care",
    image: "https://via.placeholder.com/300x200",
    location: "Austin, TX",
    distance: 2.4,
    availability: "Available Today",
    rating: 4.8,
    reviewCount: 243,
    services: ["Oil Change", "Brake Service", "Engine Repair"],
    pricingTransparency: "Customer can choose parts",
    certification: "ASE Certified Master Technician",
    startingPrice: 49,
    estimatedTime: "Est. time: 1-2 hours",
    latitude: 30.2672,
    longitude: -97.7431,
    phoneNumber: "(512) 555-0123",
  },
  {
    id: 2,
    name: "Hometown Mechanics",
    image: "https://via.placeholder.com/300x200",
    location: "Austin, TX",
    distance: 3.1,
    availability: "Available Tomorrow",
    rating: 4.6,
    reviewCount: 187,
    services: ["Transmission", "Engine Diagnostics", "Brake Service"],
    pricingTransparency: "Uses best value parts",
    certification: "Factory Trained Specialists",
    startingPrice: 39,
    estimatedTime: "Est. time: 1-3 hours",
    latitude: 30.2849,
    longitude: -97.7341,
    phoneNumber: "(512) 555-0456",
  },
  {
    id: 3,
    name: "AutoTech Solutions",
    image: "https://via.placeholder.com/300x200",
    location: "Austin, TX",
    distance: 4.5,
    availability: "Available Today",
    rating: 4.9,
    reviewCount: 311,
    services: ["Engine Repair", "Electrical Systems", "Transmission"],
    pricingTransparency: "Customer can choose parts",
    certification: "ASE and Factory Certified",
    startingPrice: 59,
    estimatedTime: "Est. time: 2-4 hours",
    latitude: 30.25,
    longitude: -97.75,
    phoneNumber: "(512) 555-0789",
  },
];

export default function FindMechanicsScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [nearbyMechanics, setNearbyMechanics] = useState<PlaceResult[]>([]);
  const [isLoadingMechanics, setIsLoadingMechanics] = useState(false);
  const [useMockData, setUseMockData] = useState(false); // Toggle for testing - set to true while API key is being configured

  useEffect(() => {
    // Re-enable location services
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        setLocationPermission(false);
        Alert.alert(
          "Location Permission",
          "Location permission is required to show nearby mechanics on the map.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingMechanics(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log("Got user location:", coords);
      setUserLocation(coords);

      // Fetch nearby mechanics after getting location
      fetchNearbyMechanics(coords.latitude, coords.longitude);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Unable to get your location. Please try again.");

      // Fallback to Austin location if location fails
      const fallbackCoords = {
        latitude: 30.2672,
        longitude: -97.7431,
      };
      setUserLocation(fallbackCoords);
      fetchNearbyMechanics(fallbackCoords.latitude, fallbackCoords.longitude);
    } finally {
      setIsLoadingMechanics(false);
    }
  };

  const fetchNearbyMechanics = async (latitude: number, longitude: number) => {
    setIsLoadingMechanics(true);
    try {
      // PlacesService now handles fallback to mock data internally
      const mechanics = await PlacesService.searchNearbyMechanics(
        latitude,
        longitude
      );
      setNearbyMechanics(mechanics);
    } catch (error) {
      console.error("Error fetching nearby mechanics:", error);
      // Final fallback to mock data
      const fallbackMechanics = getMockMechanicData(latitude, longitude);
      setNearbyMechanics(fallbackMechanics);
    } finally {
      setIsLoadingMechanics(false);
    }
  };

  // Calculate map region to show at least 5 mechanics
  const calculateMapRegion = () => {
    if (!userLocation) {
      return {
        latitude: 30.2672,
        longitude: -97.7431,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    if (nearbyMechanics.length < 5) {
      // Zoom out more to potentially show more mechanics
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.15, // Larger delta = more zoomed out
        longitudeDelta: 0.15,
      };
    }

    // Calculate bounds to fit all mechanics
    const latitudes = nearbyMechanics.map((m) => m.latitude);
    const longitudes = nearbyMechanics.map((m) => m.longitude);

    const minLat = Math.min(...latitudes, userLocation.latitude);
    const maxLat = Math.max(...latitudes, userLocation.latitude);
    const minLng = Math.min(...longitudes, userLocation.longitude);
    const maxLng = Math.max(...longitudes, userLocation.longitude);

    const latDelta = (maxLat - minLat) * 1.3; // Add 30% padding
    const lngDelta = (maxLng - minLng) * 1.3;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.05), // Minimum zoom level
      longitudeDelta: Math.max(lngDelta, 0.05),
    };
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && !locationQuery.trim()) {
      // If both fields are empty, reset to user's current location
      if (userLocation) {
        await fetchNearbyMechanics(
          userLocation.latitude,
          userLocation.longitude
        );
      }
      return;
    }

    setIsLoadingMechanics(true);
    try {
      let searchLatitude = userLocation?.latitude || 30.2672; // Default to Austin
      let searchLongitude = userLocation?.longitude || -97.7431;

      // Handle zip code/location search
      if (locationQuery.trim()) {
        console.log("Attempting to geocode:", locationQuery.trim());
        try {
          const coordinates = await geocodeLocation(locationQuery.trim());
          if (coordinates) {
            console.log("Geocoding successful, new coordinates:", coordinates);
            searchLatitude = coordinates.latitude;
            searchLongitude = coordinates.longitude;
            // Update user location state to the new search location
            setUserLocation(coordinates);
          } else {
            console.log("Geocoding failed, using default location");
            Alert.alert(
              "Location Not Found",
              `Could not find "${locationQuery.trim()}". Using current location instead.`
            );
          }
        } catch (error) {
          console.error("Error geocoding location:", error);
          Alert.alert(
            "Location Error",
            "Could not find the specified location. Using current location instead."
          );
        }
      }

      let mechanics: PlaceResult[];

      if (searchQuery.trim()) {
        // Search for mechanics by text query
        if (useMockData) {
          const mockMechanics = getMockMechanicData(
            searchLatitude,
            searchLongitude
          );
          mechanics = mockMechanics.filter(
            (mechanic) =>
              mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              mechanic.address.toLowerCase().includes(searchQuery.toLowerCase())
          );
        } else {
          mechanics = await PlacesService.searchMechanicsByText(
            searchQuery,
            searchLatitude,
            searchLongitude
          );
        }
      } else {
        // Just search by location (zip code)
        mechanics = await PlacesService.searchNearbyMechanics(
          searchLatitude,
          searchLongitude
        );
      }

      setNearbyMechanics(mechanics);
    } catch (error) {
      console.error("Error searching mechanics:", error);
      Alert.alert(
        "Search Error",
        "Failed to search for mechanics. Please try again."
      );
    } finally {
      setIsLoadingMechanics(false);
    }
  };

  // Function to convert zip code or address to coordinates
  const geocodeLocation = async (
    location: string
  ): Promise<{ latitude: number; longitude: number } | null> => {
    console.log("Geocoding location:", location);

    // Simple zip code fallback for common areas
    const zipCodeFallbacks: {
      [key: string]: { latitude: number; longitude: number };
    } = {
      "78701": { latitude: 30.2672, longitude: -97.7431 }, // Austin, TX
      "78702": { latitude: 30.2849, longitude: -97.7341 }, // Austin, TX
      "78703": { latitude: 30.2729, longitude: -97.7831 }, // Austin, TX
      "90210": { latitude: 34.0901, longitude: -118.4065 }, // Beverly Hills, CA
      "10001": { latitude: 40.7589, longitude: -73.9851 }, // New York, NY
      "60601": { latitude: 41.8781, longitude: -87.6298 }, // Chicago, IL
      "33101": { latitude: 25.7617, longitude: -80.1918 }, // Miami, FL
      "75201": { latitude: 32.7767, longitude: -96.797 }, // Dallas, TX
      "77001": { latitude: 29.7604, longitude: -95.3698 }, // Houston, TX
    };

    // Check if it's a known zip code first
    if (zipCodeFallbacks[location.trim()]) {
      console.log("Using zip code fallback for:", location);
      return zipCodeFallbacks[location.trim()];
    }

    try {
      // First try using Expo Location geocoding (works without additional API key)
      console.log("Trying Expo Location geocoding...");
      const geocoded = await Location.geocodeAsync(location);
      console.log("Expo geocoding result:", geocoded);

      if (geocoded.length > 0) {
        const result = {
          latitude: geocoded[0].latitude,
          longitude: geocoded[0].longitude,
        };
        console.log("Expo geocoding successful:", result);
        return result;
      }

      // Fallback: Try using Google Geocoding API
      console.log("Trying Google Geocoding API...");
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        location
      )}&key=AIzaSyDH_5rYB8ja6e6xtjZ5hmmN7NosXNEpeI8`;

      console.log("Google geocoding URL:", geocodeUrl);
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      console.log("Google geocoding response:", data);

      if (data.status === "OK" && data.results.length > 0) {
        const result = {
          latitude: data.results[0].geometry.location.lat,
          longitude: data.results[0].geometry.location.lng,
        };
        console.log("Google geocoding successful:", result);
        return result;
      } else {
        console.log(
          "Google geocoding failed:",
          data.status,
          data.error_message
        );
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const handleClearSearch = async () => {
    setSearchQuery("");
    setLocationQuery("");
    if (userLocation) {
      await fetchNearbyMechanics(userLocation.latitude, userLocation.longitude);
    }
  };

  const convertMockToPlaceResult = (
    mockMechanic: (typeof mechanicData)[0]
  ): PlaceResult => ({
    id: mockMechanic.id.toString(),
    name: mockMechanic.name,
    address: mockMechanic.location,
    latitude: mockMechanic.latitude,
    longitude: mockMechanic.longitude,
    rating: mockMechanic.rating,
    reviewCount: mockMechanic.reviewCount,
    isOpen: mockMechanic.availability === "Available Today",
    distance: mockMechanic.distance,
    // Include phone number from mock data
    photoUrl: mockMechanic.image,
    phoneNumber: mockMechanic.phoneNumber,
    website: undefined,
    priceLevel: undefined,
  });

  const handleMechanicPress = (mechanic: PlaceResult) => {
    // Show detailed view with all mechanic data
    Alert.alert(
      mechanic.name,
      `Address: ${mechanic.address}\n` +
        `Rating: ${
          mechanic.rating ? mechanic.rating.toFixed(1) : "No rating"
        }\n` +
        `Reviews: ${mechanic.reviewCount || "No reviews"}\n` +
        `Status: ${
          mechanic.isOpen === undefined
            ? "Hours unknown"
            : mechanic.isOpen
            ? "Open now"
            : "Closed"
        }\n` +
        `Distance: ${
          mechanic.distance
            ? mechanic.distance.toFixed(1) + " miles"
            : "Distance unknown"
        }\n` +
        `Phone: ${mechanic.phoneNumber || "Not available"}\n` +
        `Website: ${mechanic.website || "Not available"}\n` +
        `Price Level: ${
          mechanic.priceLevel
            ? "$".repeat(mechanic.priceLevel)
            : "Not available"
        }`,
      [
        { text: "Call", onPress: () => console.log("Call pressed") },
        {
          text: "Directions",
          onPress: () => console.log("Directions pressed"),
        },
        { text: "Close", style: "cancel" },
      ]
    );
  };

  const renderMechanicCard = ({ item }: { item: (typeof mechanicData)[0] }) => (
    <MechanicCard
      mechanic={convertMockToPlaceResult(item)}
      onPress={() => handleMechanicPress(convertMockToPlaceResult(item))}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={true}>
        <View>
          <Text style={[styles.subtitle, isDark && styles.textMutedLight]}>
            Search for trusted mechanics in your area with transparent pricing
            and verified reviews.
          </Text>

          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
              <View
                style={[
                  styles.searchInputContainer,
                  isDark && styles.searchInputContainerDark,
                ]}
              >
                <Feather
                  name="search"
                  size={16}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    { paddingLeft: 24 },
                  ]}
                  placeholder="Search for services or shops"
                  placeholderTextColor={
                    isDark ? colors.gray[400] : colors.gray[500]
                  }
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
              </View>

              <View
                style={[
                  styles.zipInputContainer,
                  isDark && styles.zipInputContainerDark,
                ]}
              >
                <Feather
                  name="map-pin"
                  size={16}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                    { paddingLeft: 24 },
                  ]}
                  placeholder="Zip Code or City"
                  placeholderTextColor={
                    isDark ? colors.gray[400] : colors.gray[500]
                  }
                  value={locationQuery}
                  onChangeText={setLocationQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
              </View>
            </View>

            <View style={styles.searchButtonRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button
                  title={isLoadingMechanics ? "Searching..." : "Search"}
                  onPress={handleSearch}
                  style={styles.searchButton}
                  disabled={isLoadingMechanics}
                />
              </View>
              {(searchQuery.trim() || locationQuery.trim()) && (
                <TouchableOpacity
                  style={[
                    styles.clearButton,
                    {
                      backgroundColor: isDark
                        ? colors.gray[700]
                        : colors.gray[200],
                    },
                  ]}
                  onPress={handleClearSearch}
                  disabled={isLoadingMechanics}
                >
                  <Feather
                    name="x"
                    size={16}
                    color={isDark ? colors.gray[300] : colors.gray[600]}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterButton, isDark && styles.filterButtonDark]}
          >
            <Feather
              name="filter"
              size={14}
              color={isDark ? colors.white : colors.gray[900]}
            />
            <Text style={[styles.filterButtonText, isDark && styles.textLight]}>
              Filters
            </Text>
          </TouchableOpacity>

          <View style={styles.sortContainer}>
            <Text style={[styles.sortLabel, isDark && styles.textMutedLight]}>
              Sort by:
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={[styles.sortButtonText, isDark && styles.textLight]}>
                Recommended
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color={isDark ? colors.white : colors.gray[900]}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabsHeader}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "list" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "list" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("list")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "list" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                List View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "map" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "map" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("map")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "map" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                Map View
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "list" ? (
            <View style={styles.mechanicsContainer}>
              {isLoadingMechanics ? (
                <View style={styles.loadingContainer}>
                  <Text
                    style={[styles.loadingText, isDark && styles.textLight]}
                  >
                    Finding nearby mechanics...
                  </Text>
                </View>
              ) : nearbyMechanics.length > 0 ? (
                nearbyMechanics.map((mechanic) => (
                  <MechanicCard
                    key={mechanic.id}
                    mechanic={mechanic}
                    onPress={() => handleMechanicPress(mechanic)}
                  />
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Feather
                    name="search"
                    size={48}
                    color={isDark ? colors.gray[400] : colors.gray[500]}
                  />
                  <Text
                    style={[styles.noResultsText, isDark && styles.textLight]}
                  >
                    No mechanics found nearby
                  </Text>
                  <Text
                    style={[
                      styles.noResultsSubtext,
                      isDark && styles.textMutedLight,
                    ]}
                  >
                    Try adjusting your search criteria or location
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.mapContainer}>
              {locationPermission && userLocation ? (
                <MapView
                  style={styles.map}
                  initialRegion={calculateMapRegion()}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  {nearbyMechanics.map((mechanic) => (
                    <Marker
                      key={mechanic.id}
                      coordinate={{
                        latitude: mechanic.latitude,
                        longitude: mechanic.longitude,
                      }}
                      title={mechanic.name}
                      description={`${
                        mechanic.rating
                          ? mechanic.rating.toFixed(1) + "⭐"
                          : "No rating"
                      } • ${mechanic.address}`}
                    >
                      <View style={styles.markerContainer}>
                        <View
                          style={[
                            styles.marker,
                            mechanic.isOpen === true
                              ? styles.markerAvailable
                              : styles.markerBusy,
                          ]}
                        >
                          <Feather name="tool" size={16} color={colors.white} />
                        </View>
                      </View>
                      <Callout style={styles.callout}>
                        <View style={styles.calloutContent}>
                          <Text style={styles.calloutTitle}>
                            {mechanic.name}
                          </Text>
                          <Text style={styles.calloutLocation}>
                            {mechanic.address}
                            {mechanic.distance &&
                              ` • ${mechanic.distance} miles`}
                          </Text>
                          <View style={styles.calloutRating}>
                            <Feather
                              name="star"
                              size={12}
                              color={colors.primary[500]}
                            />
                            <Text style={styles.calloutRatingText}>
                              {mechanic.rating} ({mechanic.reviewCount})
                            </Text>
                          </View>
                          <Text style={styles.calloutPrice}>
                            {mechanic.isOpen === undefined
                              ? "Hours unknown"
                              : mechanic.isOpen
                              ? "Open now"
                              : "Closed"}
                          </Text>
                        </View>
                      </Callout>
                    </Marker>
                  ))}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholderContainer}>
                  <Feather
                    name="map-pin"
                    size={48}
                    color={isDark ? colors.gray[400] : colors.gray[500]}
                  />
                  <Text
                    style={[
                      styles.mapPlaceholder,
                      isDark && styles.textMutedLight,
                    ]}
                  >
                    {locationPermission
                      ? "Loading map..."
                      : "Location permission required for map view"}
                  </Text>
                  {!locationPermission && (
                    <Button
                      title="Enable Location"
                      onPress={requestLocationPermission}
                      style={styles.enableLocationButton}
                      size="sm"
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type Mechanic = (typeof mechanicData)[0];
