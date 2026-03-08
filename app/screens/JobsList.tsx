import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  StatusBar,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Feather } from "@expo/vector-icons";
import Card, { CardHeader, CardContent } from "../components/Card";
import { colors } from "../theme/colors";
import firebaseService from "../services/firebaseService";
import * as Location from "expo-location";
import { Job } from "../../types";
import { auth } from "../../firebaseConfig";

type JobsListRouteProp = RouteProp<RootStackParamList, "JobsList">;

export default function JobsListScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<JobsListRouteProp>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Check if this is "My Jobs" mode
  const isMyJobs = route.params?.isMyJobs || false;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number>(25); // Default 25 miles
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    zipCode?: string;
  } | null>(null);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [jobDistances, setJobDistances] = useState<Map<string, number | null>>(
    new Map()
  );
  const [geocodeCache, setGeocodeCache] = useState<
    Map<string, { latitude: number; longitude: number }>
  >(new Map());
  const [zipCodeInput, setZipCodeInput] = useState<string>("");
  const [showRadiusDropdown, setShowRadiusDropdown] = useState<boolean>(false);

  const geocodeAddress = async (
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Check cache first
      if (geocodeCache.has(address)) {
        return geocodeCache.get(address)!;
      }

      // Use Expo Location geocoding
      const geocodedLocations = await Location.geocodeAsync(address);

      if (geocodedLocations.length > 0) {
        const { latitude, longitude } = geocodedLocations[0];
        const coords = { latitude, longitude };

        // Cache the result
        setGeocodeCache((prev) => new Map(prev).set(address, coords));

        return coords;
      }

      console.warn(`Could not geocode address: ${address}`);
      return null;
    } catch (error) {
      console.error(`Error geocoding address "${address}":`, error);
      return null;
    }
  };

  const fetchJobsList = async () => {
    try {
      setError(null);
      let jobsData: Job[];

      if (isMyJobs) {
        // Fetch jobs claimed by current mechanic
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
          setError("User not authenticated");
          return;
        }
        jobsData = await firebaseService.getMyJobs(currentUserId);
      } else {
        // Fetch available jobs
        jobsData = await firebaseService.getJobsList();
      }

      setJobs(jobsData);
      // Apply filter immediately when jobs are loaded (only for available jobs)
      if (isMyJobs) {
        setFilteredJobs(jobsData); // Show all my jobs without filtering
      } else {
        const filtered = await filterJobsByRadius(jobsData, radiusFilter);
        setFilteredJobs(filtered);
      }
    } catch (err: any) {
      console.error("Error fetching jobs:", err);
      setError(
        `Failed to load ${
          isMyJobs ? "my jobs" : "available jobs"
        }. Please try again.`
      );
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location permission is required to filter jobs by distance."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get zip code
      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const zipCode = address[0]?.postalCode || undefined;

      // Show alert for simulator users
      if (__DEV__ && zipCode === "94102") {
        // Common SF zip code
        Alert.alert(
          "Simulator Location",
          "iOS Simulator defaults to San Francisco location. In a real device, this would use your actual location. You can manually enter a different zip code to test filtering.",
          [{ text: "OK" }]
        );
      }

      setUserLocation({ latitude, longitude, zipCode });
      // Only set zip code input if it's currently empty (don't override user input)
      if (zipCode && !zipCodeInput.trim()) {
        setZipCodeInput(zipCode);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Distance filtering will be disabled."
      );
    }
  };

  const calculateZipCodeDistance = (zip1: string, zip2: string): number => {
    // Improved distance calculation based on zip code geography
    // This is still an approximation, but more reasonable than the previous method
    if (!zip1 || !zip2) return 999; // Return large distance if zip codes are missing

    // Exact match = 0 miles
    if (zip1 === zip2) return 0;

    const prefix1 = zip1.substring(0, 3);
    const prefix2 = zip2.substring(0, 3);

    // Same area code = within 20 miles
    if (prefix1 === prefix2) return 20;

    const region1 = zip1.substring(0, 1);
    const region2 = zip2.substring(0, 1);

    // Same region = within 200 miles
    if (region1 === region2) {
      const diff = Math.abs(parseInt(prefix1) - parseInt(prefix2));
      return Math.min(diff * 8, 200); // Cap at 200 miles
    }

    // Different regions = far away
    return 500;
  };

  const calculateGPSDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  const filterJobsByRadius = async (
    jobs: Job[],
    radius: number
  ): Promise<Job[]> => {
    if (!zipCodeInput.trim() && !userLocation) {
      return jobs; // Return all jobs if no location entered
    }

    // Determine if we should use zip code filtering (user entered different zip) or GPS filtering
    const useZipCodeFiltering =
      zipCodeInput.trim() &&
      userLocation?.zipCode &&
      zipCodeInput.trim() !== userLocation.zipCode;

    const filtered: Job[] = [];

    for (const job of jobs) {
      let distance: number;

      // If user entered a different zip code, prioritize zip code distance
      if (useZipCodeFiltering && job.customerZipCode) {
        distance = calculateZipCodeDistance(
          zipCodeInput.trim(),
          job.customerZipCode
        );
      }
      // Otherwise, use GPS coordinates if available
      else if (userLocation && job.customerLatitude && job.customerLongitude) {
        // Use GPS distance calculation
        distance = calculateGPSDistance(
          userLocation.latitude,
          userLocation.longitude,
          job.customerLatitude,
          job.customerLongitude
        );
      } else if (userLocation && job.customerLocation) {
        // Try to geocode the address
        const jobCoords = await geocodeAddress(job.customerLocation);
        if (jobCoords) {
          distance = calculateGPSDistance(
            userLocation.latitude,
            userLocation.longitude,
            jobCoords.latitude,
            jobCoords.longitude
          );
        } else {
          // Geocoding failed, fall back to zip code if available
          if (zipCodeInput.trim() && job.customerZipCode) {
            distance = calculateZipCodeDistance(
              zipCodeInput.trim(),
              job.customerZipCode
            );
          } else {
            console.log(
              `Job ${job.id} has no usable location data, including it`
            );
            filtered.push(job);
            continue;
          }
        }
      } else if (zipCodeInput.trim() && job.customerZipCode) {
        // Fall back to zip code distance
        distance = calculateZipCodeDistance(
          zipCodeInput.trim(),
          job.customerZipCode
        );
        console.log(
          `Job ${job.id}: zip distance ${distance} miles, include: ${
            distance <= radius
          }`
        );
      } else {
        filtered.push(job);
        continue;
      }

      if (distance <= radius) {
        filtered.push(job);
      }
    }

    return filtered;
  };

  const loadJobs = async () => {
    setLoading(true);
    await fetchJobsList();
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
    getUserLocation();
  }, []);

  useEffect(() => {
    // Reload jobs when radius changes to get fresh data
    loadJobs();
  }, [radiusFilter]);

  useEffect(() => {
    // Apply radius filter whenever radius or zip code changes (only for available jobs)
    if (!isMyJobs) {
      const applyFilter = async () => {
        const filtered = await filterJobsByRadius(jobs, radiusFilter);
        setFilteredJobs(filtered);
      };
      applyFilter();
    }
  }, [radiusFilter, zipCodeInput, jobs, isMyJobs]);

  useEffect(() => {
    // Calculate distances for all jobs when location data changes
    const calculateDistances = async () => {
      const distances = new Map<string, number | null>();
      for (const job of jobs) {
        const distance = await calculateJobDistance(job);
        distances.set(job.id, distance);
      }
      setJobDistances(distances);
    };

    if (jobs.length > 0 && (userLocation || zipCodeInput.trim())) {
      calculateDistances();
    }
  }, [jobs, userLocation, zipCodeInput]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return colors.red[500];
      case "high":
        return colors.yellow[500];
      case "medium":
        return colors.yellow[500];
      case "low":
        return colors.green[500];
      default:
        return colors.gray[500];
    }
  };

  const getPriorityText = (priority: string) => {
    if (!priority) return "Unknown";
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const calculateJobDistance = async (job: Job): Promise<number | null> => {
    // Determine if we should use zip code filtering (user entered different zip) or GPS filtering
    const useZipCodeFiltering =
      zipCodeInput.trim() &&
      userLocation?.zipCode &&
      zipCodeInput.trim() !== userLocation.zipCode;

    // If user entered a different zip code, use zip code distance
    if (useZipCodeFiltering && job.customerZipCode) {
      return calculateZipCodeDistance(zipCodeInput.trim(), job.customerZipCode);
    }
    // Otherwise, use GPS coordinates if available
    else if (userLocation && job.customerLatitude && job.customerLongitude) {
      // Use GPS distance calculation
      return calculateGPSDistance(
        userLocation.latitude,
        userLocation.longitude,
        job.customerLatitude,
        job.customerLongitude
      );
    } else if (userLocation && job.customerLocation) {
      // Try to geocode the address
      const jobCoords = await geocodeAddress(job.customerLocation);
      if (jobCoords) {
        return calculateGPSDistance(
          userLocation.latitude,
          userLocation.longitude,
          jobCoords.latitude,
          jobCoords.longitude
        );
      }
    } else if (zipCodeInput.trim() && job.customerZipCode) {
      // Fall back to zip code distance
      return calculateZipCodeDistance(zipCodeInput.trim(), job.customerZipCode);
    }
    return null;
  };

  const handleJobPress = (job: Job) => {
    // Navigate to job details page
    navigation.navigate("JobDetails", { jobId: job.id });
  };

  const handleClaimJob = (job: Job) => {
    // Navigate to job details or claim job
    firebaseService.claimJob(job.id, auth.currentUser?.uid);
    alert("Job claimed successfully!");
  };

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "available":
        return colors.primary[500];
      case "claimed":
        return colors.accent[500];
      case "in_progress":
        return colors.yellow[500];
      case "completed":
        return colors.green[500];
      default:
        return colors.gray[500];
    }
  };

  const getStatusText = (status: Job["status"]) => {
    switch (status) {
      case "available":
        return "Available";
      case "claimed":
        return "Claimed";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  const renderJobCard = (job: Job) => {
    // Get pre-calculated distance
    const distance = jobDistances.get(job.id) || null;

    return (
      <TouchableOpacity
        key={job.id}
        style={styles.jobCardTouchable}
        onPress={() => handleJobPress(job)}
        activeOpacity={0.7}
      >
        <Card style={styles.jobCard}>
          <CardHeader>
            <View style={styles.headerRow}>
              <Text
                style={[
                  styles.jobTitle,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {job.title || "Vehicle Diagnostic Job"}
              </Text>
              {!isMyJobs && distance !== null && (
                <View style={styles.detailRow}>
                  <Feather
                    name="navigation"
                    size={16}
                    color={isDark ? colors.gray[400] : colors.gray[500]}
                  />
                  <Text
                    style={[
                      styles.detailText,
                      { color: isDark ? colors.white : colors.gray[900] },
                    ]}
                  >
                    {distance === 0
                      ? "Same location"
                      : `${distance} miles away`}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(job.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusText(job.status)}
                </Text>
              </View>
            </View>
          </CardHeader>

          <CardContent>
            <Text
              style={[
                styles.jobDescription,
                { color: isDark ? colors.gray[300] : colors.gray[700] },
              ]}
              numberOfLines={2}
            >
              {job.description || "Vehicle requires diagnostic attention"}
            </Text>

            <View style={styles.jobContentRow}>
              <View style={styles.jobDetails}>
                {job.vehicleMake && job.vehicleModel && job.vehicleYear && (
                  <View style={styles.detailRow}>
                    <Feather
                      name="truck"
                      size={16}
                      color={isDark ? colors.gray[400] : colors.gray[500]}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: isDark ? colors.white : colors.gray[900] },
                      ]}
                    >
                      {job.vehicleYear} {job.vehicleMake} {job.vehicleModel}
                    </Text>
                  </View>
                )}

                {job.customerLocation && (
                  <View style={styles.detailRow}>
                    <Feather
                      name="map-pin"
                      size={16}
                      color={isDark ? colors.gray[400] : colors.gray[500]}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: isDark ? colors.white : colors.gray[900] },
                      ]}
                    >
                      {job.customerLocation}
                    </Text>
                  </View>
                )}

                {job.estimatedTime && (
                  <View style={styles.detailRow}>
                    <Feather
                      name="clock"
                      size={16}
                      color={isDark ? colors.gray[400] : colors.gray[500]}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: isDark ? colors.white : colors.gray[900] },
                      ]}
                    >
                      {job.estimatedTime}
                    </Text>
                  </View>
                )}

                {job.estimatedCost && (
                  <View style={styles.detailRow}>
                    <Feather
                      name="dollar-sign"
                      size={16}
                      color={isDark ? colors.gray[400] : colors.gray[500]}
                    />
                    <Text
                      style={[
                        styles.detailText,
                        { color: isDark ? colors.white : colors.gray[900] },
                      ]}
                    >
                      Est. ${job.estimatedCost}
                    </Text>
                  </View>
                )}

                {job.dtcCodes &&
                  Array.isArray(job.dtcCodes) &&
                  job.dtcCodes.length > 0 && (
                    <View style={styles.detailRow}>
                      <Feather
                        name="alert-triangle"
                        size={16}
                        color={isDark ? colors.gray[400] : colors.gray[500]}
                      />
                      <Text
                        style={[
                          styles.detailText,
                          { color: isDark ? colors.white : colors.gray[900] },
                        ]}
                      >
                        DTC: {job.dtcCodes.join(", ")}
                      </Text>
                    </View>
                  )}
              </View>

              {isMyJobs ? (
                <View style={styles.statusControls}>
                  {/* Status controls removed - moved to JobDetails screen */}
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.claimButton,
                    { backgroundColor: colors.primary[500] },
                  ]}
                  onPress={() => handleClaimJob(job)}
                >
                  <Text style={styles.claimButtonText}>Claim Job</Text>
                </TouchableOpacity>
              )}
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? colors.gray[900] : colors.gray[50] },
        ]}
        edges={["bottom", "left", "right"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={isDark ? colors.gray[900] : colors.gray[50]}
        />
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text
          style={[
            styles.loadingText,
            { color: isDark ? colors.white : colors.gray[900] },
          ]}
        >
          Loading jobs...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.gray[900] : colors.gray[50] },
      ]}
      edges={["bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? colors.gray[900] : colors.gray[50]}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? colors.white : colors.gray[900] },
          ]}
        >
          {isMyJobs ? "My Jobs" : "Available Jobs"}
        </Text>
      </View>

      {/* Location Filter - Only show for available jobs */}
      {!isMyJobs && (
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Text
              style={[
                styles.filterLabel,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              Location:
            </Text>
            <TextInput
              style={[
                styles.zipCodeInput,
                {
                  backgroundColor: isDark ? colors.gray[800] : colors.white,
                  color: isDark ? colors.white : colors.gray[900],
                  borderColor: isDark ? colors.gray[600] : colors.gray[300],
                },
              ]}
              placeholder="Enter zip code"
              placeholderTextColor={
                isDark ? colors.gray[400] : colors.gray[500]
              }
              value={zipCodeInput}
              onChangeText={setZipCodeInput}
              keyboardType="numeric"
              maxLength={5}
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getUserLocation}
            >
              <Feather name="map-pin" size={16} color={colors.primary[500]} />
            </TouchableOpacity>
            {zipCodeInput ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setZipCodeInput("")}
              >
                <Feather
                  name="x"
                  size={16}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.radiusDropdown,
                {
                  backgroundColor: isDark ? colors.gray[800] : colors.white,
                  borderColor: isDark ? colors.gray[600] : colors.gray[300],
                },
              ]}
              onPress={() => setShowRadiusDropdown(!showRadiusDropdown)}
            >
              <Text
                style={[
                  styles.radiusDropdownText,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {radiusFilter}mi
              </Text>
              <Feather
                name={showRadiusDropdown ? "chevron-up" : "chevron-down"}
                size={16}
                color={isDark ? colors.white : colors.gray[900]}
              />
            </TouchableOpacity>
          </View>
          {showRadiusDropdown && (
            <View
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: isDark ? colors.gray[800] : colors.white,
                  borderColor: isDark ? colors.gray[600] : colors.gray[300],
                },
              ]}
            >
              {[5, 10, 25, 50].map((radius) => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.dropdownItem,
                    {
                      backgroundColor:
                        radiusFilter === radius
                          ? colors.primary[100]
                          : "transparent",
                      borderBottomColor: isDark
                        ? colors.gray[700]
                        : colors.gray[200],
                    },
                  ]}
                  onPress={() => {
                    setRadiusFilter(radius);
                    setShowRadiusDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      {
                        color: isDark ? colors.white : colors.gray[900],
                        fontWeight: radiusFilter === radius ? "600" : "400",
                      },
                    ]}
                  >
                    {radius} miles
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadJobs} />
        }
      >
        {loading && (
          <View
            style={[
              styles.reloadingContainer,
              {
                backgroundColor: isDark
                  ? colors.primary[900]
                  : colors.primary[50],
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary[500]} />
            <Text
              style={[
                styles.reloadingText,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              Updating jobs...
            </Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={48} color={colors.red[500]} />
            <Text
              style={[
                styles.errorText,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                { backgroundColor: colors.primary[500] },
              ]}
              onPress={loadJobs}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="briefcase" size={48} color={colors.gray[400]} />
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? colors.gray[400] : colors.gray[600] },
              ]}
            >
              {isMyJobs
                ? "No jobs claimed yet"
                : "No jobs within your search area"}
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: isDark ? colors.gray[500] : colors.gray[500] },
              ]}
            >
              {isMyJobs
                ? "Jobs you claim will appear here"
                : zipCodeInput.trim() || userLocation
                ? "Try increasing the distance or changing your location"
                : "Enter a zip code or use the location button to find jobs"}
            </Text>
          </View>
        ) : (
          <View style={styles.jobsContainer}>
            {filteredJobs.map((job) => renderJobCard(job))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  zipCodeInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    marginRight: 8,
  },
  locationButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButton: {
    padding: 8,
  },
  radiusDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  radiusDropdownText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownMenu: {
    position: "absolute",
    top: 44, // Position below the filter row
    right: 0, // Align with the right edge of the radius dropdown
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  reloadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  reloadingText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  jobsContainer: {
    gap: 16,
  },
  jobCardTouchable: {
    marginBottom: 8,
  },
  jobCard: {
    marginBottom: 0, // Remove margin since it's now on the TouchableOpacity
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  jobContentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
  },
  jobDetails: {
    flex: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    marginRight: 16,
  },
  claimButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  claimButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  statusControls: {
    flex: 1,
    gap: 8,
  },
});
