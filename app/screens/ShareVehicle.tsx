import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import Card, { CardContent } from "../components/Card";
import SearchBar from "../components/searchBar";
import UserSearchResults from "../components/UserSearchResults";
import { colors } from "../theme/colors";
import { auth } from "../../firebaseConfig";
import firebaseService, {
  addVehicleOwner,
  removeVehicleOwner,
} from "../services/firebaseService";

const maskName = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const maskEmail = (email: string): string => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
};

interface SearchUser {
  id: string;
  email: string;
  firstName: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  vin?: string;
  ownerId: string[];
  drivers: string[];
  driverProfiles?: Record<string, { name: string; maskedEmail: string }>;
}

interface DriverProfile {
  uid: string;
  name: string;
  maskedEmail: string;
}

const isPrimaryOwner = (vehicle: Vehicle, uid: string): boolean =>
  Array.isArray(vehicle.ownerId) && vehicle.ownerId.includes(uid);

const getDriverUids = (vehicle: Vehicle): string[] =>
  vehicle.drivers ?? [];

export default function ManageDrivers() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const currentUid = auth.currentUser?.uid ?? "";

  // Step 1 — vehicle list
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Step 2 — per-vehicle driver management
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  // Add driver search
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  // Update the native header whenever the user drills into a vehicle or goes back.
  useLayoutEffect(() => {
    if (selectedVehicle) {
      navigation.setOptions({
        title: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setSelectedVehicle(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 4 }}
          >
            <Feather name="chevron-left" size={28} color={isDark ? colors.white : colors.gray[900]} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        title: "Manage Drivers",
        headerLeft: undefined,
      });
    }
  }, [selectedVehicle, navigation, isDark]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setFilteredUsers([]);
        setSearchError(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadVehicles = async () => {
    if (!currentUid) return;
    setLoadingVehicles(true);
    try {
      const list = await firebaseService.getVehicles(currentUid);
      setVehicles(
        list.map((v: any) => ({
          id: v.id,
          make: v.make || "Unknown",
          model: v.model || "Unknown",
          year: v.year || "N/A",
          vin: v.vin,
          ownerId: v.ownerId ?? v.owner ?? "",
          drivers: Array.isArray(v.drivers) ? v.drivers : [],
          driverProfiles: v.driverProfiles,
        }))
      );
    } catch {
      Alert.alert("Error", "Failed to load vehicles");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const selectVehicle = (vehicle: Vehicle) => {
    if (!isPrimaryOwner(vehicle, currentUid)) return;
    setSelectedVehicle(vehicle);
    setSearchQuery("");
    setFilteredUsers([]);
    setSelectedUser(null);
    setSearchError(null);

    // Build driver list from the profiles already stored on the vehicle doc —
    // no cross-user Firestore reads needed.
    const driverUids = getDriverUids(vehicle);
    const profiles: DriverProfile[] = driverUids.map((uid) => ({
      uid,
      name: vehicle.driverProfiles?.[uid]?.name ?? "Unknown",
      maskedEmail: vehicle.driverProfiles?.[uid]?.maskedEmail ?? "",
    }));
    setDrivers(profiles);
  };

  const handleRemoveDriver = (driverUid: string, driverName: string) => {
    if (!selectedVehicle) return;
    Alert.alert("Remove Driver", `Remove ${driverName} from this vehicle?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemoving(driverUid);
          try {
            await removeVehicleOwner(selectedVehicle.id, driverUid);
            setDrivers((prev) => prev.filter((d) => d.uid !== driverUid));
          } catch {
            Alert.alert("Error", "Failed to remove driver");
          } finally {
            setRemoving(null);
          }
        },
      },
    ]);
  };

  const handleLeaveVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      "Leave Vehicle",
      `Remove yourself from ${vehicle.year} ${vehicle.make} ${vehicle.model}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            setRemoving(vehicle.id);
            try {
              await removeVehicleOwner(vehicle.id, currentUid);
              setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
            } catch {
              Alert.alert("Error", "Failed to leave vehicle");
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const searchUsers = async (email: string) => {
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        "https://us-central1-fluid-tangent-405719.cloudfunctions.net/searchUsers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { email } }),
        }
      );
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      const data = result.result as { success: boolean; data: SearchUser[] };
      if (data.success && data.data) {
        setFilteredUsers(data.data);
        if (data.data.length === 0)
          setSearchError("No users found with that email");
      }
    } catch (err: any) {
      setSearchError(err.message || "Error searching for users");
    } finally {
      setSearching(false);
    }
  };

  const handleAddDriver = async () => {
    if (!selectedVehicle || !selectedUser) return;
    setAdding(true);
    try {
      const driverInfo = {
        name: maskName(selectedUser.firstName),
        maskedEmail: maskEmail(selectedUser.email),
      };
      await addVehicleOwner(selectedVehicle.id, selectedUser.id, driverInfo);
      const newDriver: DriverProfile = { uid: selectedUser.id, ...driverInfo };
      setDrivers((prev) => [...prev, newDriver]);
      setSearchQuery("");
      setFilteredUsers([]);
      setSelectedUser(null);
      Alert.alert("Success", `${driverInfo.name} added as a driver`);
    } catch {
      Alert.alert("Error", "Failed to add driver");
    } finally {
      setAdding(false);
    }
  };

  const bg = isDark ? colors.gray[900] : colors.gray[50];
  const textColor = isDark ? colors.white : colors.gray[900];
  const subTextColor = isDark ? colors.gray[400] : colors.gray[600];

  const ownedVehicles = vehicles.filter((v) => isPrimaryOwner(v, currentUid));
  const sharedVehicles = vehicles.filter(
    (v) => !isPrimaryOwner(v, currentUid)
  );

  // ── Step 2: per-vehicle detail ────────────────────────────────────────
  if (selectedVehicle) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: bg }]}
        edges={["bottom", "left", "right"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={bg}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current drivers */}
          <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Current Drivers
                </Text>

                {drivers.length === 0 ? (
                  <Text style={[styles.emptyText, { color: subTextColor }]}>
                    No drivers added yet
                  </Text>
                ) : (
                  drivers.map((driver) => (
                    <Card key={driver.uid} style={{ marginBottom: 4 }}>
                      <CardContent>
                        <View style={styles.driverRow}>
                          <View style={styles.driverInfo}>
                            <Text
                              style={[styles.driverName, { color: textColor }]}
                            >
                              {driver.name}
                            </Text>
                            <Text
                              style={[
                                styles.driverEmail,
                                { color: subTextColor },
                              ]}
                            >
                              {driver.maskedEmail}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              handleRemoveDriver(driver.uid, driver.name)
                            }
                            disabled={removing !== null}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {removing === driver.uid ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.red[500]}
                              />
                            ) : (
                              <Feather
                                name="minus-circle"
                                size={22}
                                color={colors.red[500]}
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </CardContent>
                    </Card>
                  ))
                )}
              </View>

              {/* Add driver */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Add Driver
                </Text>
                <View style={styles.searchContainer}>
                  <SearchBar
                    placeholder="Search by email..."
                    value={searchQuery}
                    onSearch={setSearchQuery}
                    onClear={() => {
                      setSearchQuery("");
                      setFilteredUsers([]);
                      setSelectedUser(null);
                      setSearchError(null);
                    }}
                  />
                </View>
                <UserSearchResults
                  filteredUsers={filteredUsers}
                  selectedUser={selectedUser}
                  loading={searching}
                  error={searchError}
                  onSelectUser={setSelectedUser}
                />
                {selectedUser && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: colors.primary[500] },
                    ]}
                    onPress={handleAddDriver}
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        Add {selectedUser.firstName} as Driver
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 1: vehicle selector ──────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bg }]}
      edges={["bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={bg}
      />

      {loadingVehicles ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Loading Vehicles...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {ownedVehicles.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Your Vehicles
              </Text>
              {ownedVehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  onPress={() => selectVehicle(vehicle)}
                  activeOpacity={0.7}
                  style={{ marginBottom: 4 }}
                >
                  <Card>
                    <CardContent>
                      <View style={styles.vehicleRow}>
                        <View style={styles.vehicleInfo}>
                          <Text style={[styles.vehicleName, { color: textColor }]}>
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </Text>
                          {vehicle.vin && (
                            <Text
                              style={[styles.vehicleVin, { color: subTextColor }]}
                            >
                              VIN: {vehicle.vin}
                            </Text>
                          )}
                        </View>
                        <Feather
                          name="chevron-right"
                          size={20}
                          color={subTextColor}
                        />
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {sharedVehicles.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Shared With You
              </Text>
              {sharedVehicles.map((vehicle) => (
                <Swipeable
                  key={vehicle.id}
                  renderRightActions={() => (
                    <View style={{ marginBottom: 20, justifyContent: "center" }}>
                      <TouchableOpacity
                        style={styles.leaveAction}
                        onPress={() => handleLeaveVehicle(vehicle)}
                        disabled={removing !== null}
                      >
                        {removing === vehicle.id ? (
                          <ActivityIndicator size="small" color={colors.red[500]} />
                        ) : (
                          <MaterialCommunityIcons
                            name="minus-circle"
                            size={28}
                            color={colors.red[500]}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                >
                  <View style={{ marginBottom: 4 }}>
                    <Card>
                      <CardContent>
                        <View style={styles.vehicleRow}>
                          <View style={styles.vehicleInfo}>
                            <Text style={[styles.vehicleName, { color: textColor }]}>
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </Text>
                            {vehicle.vin && (
                              <Text
                                style={[styles.vehicleVin, { color: subTextColor }]}
                              >
                                VIN: {vehicle.vin}
                              </Text>
                            )}
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  </View>
                </Swipeable>
              ))}
            </View>
          )}

          {ownedVehicles.length === 0 && sharedVehicles.length === 0 && (
            <Text style={[styles.emptyText, { color: subTextColor }]}>
              No vehicles found
            </Text>
          )}
        </ScrollView>
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    color: colors.gray[500],
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  vehicleVin: {
    fontSize: 13,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  driverInfo: {
    flex: 1,
    marginRight: 12,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  driverEmail: {
    fontSize: 13,
  },
  searchContainer: {
    marginBottom: 12,
  },
  actionButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  leaveAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 52,
  },
});
