import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from "@react-navigation/native";
import React from "react";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Feather } from "@expo/vector-icons";
import Card, { CardHeader, CardContent, CardFooter } from "../components/Card";
import { useTheme } from "../components/theme-provider";
import { colors } from "../theme/colors";
import { Job, userProfile, vehicle } from "../../types";
import firebaseService from "../services/firebaseService";
import { useAuth } from "../contexts/AuthContext";

type JobDetailsScreenRouteProp = RouteProp<RootStackParamList, "JobDetails">;

export default function JobDetailsScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<JobDetailsScreenRouteProp>();
  const [job, setJob] = React.useState<Job | null>(null);
  const [car, setCar] = React.useState<vehicle | null>(null);
  const [customerProfile, setCustomerProfile] =
    React.useState<userProfile | null>(null);
  const { jobId } = route.params;
  const { viewMode } = useAuth();
  const userRole = useAuth().profile?.role;
  const [showStatusDropdown, setShowStatusDropdown] =
    React.useState<boolean>(false);

  React.useEffect(() => {
    firebaseService.getJob(jobId).then((fetchedJob) => {
      setJob(fetchedJob?.data as Job);
    });
  }, []); // Empty dependency array - runs only on mount

  // Separate useEffect to fetch profile when job is loaded
  React.useEffect(() => {
    if (job?.ownerId) {
      firebaseService.getUserProfile(job.ownerId).then((profile) => {
        setCustomerProfile(profile);
      });
    }
    if (job?.vehicleId) {
      firebaseService.getVehicleById(job.vehicleId).then((vehicle) => {
        setCar(vehicle as vehicle | null);
      });
    }
  }, [job?.ownerId, job?.vehicleId]); // Runs when job.ownerId or job.vehicleId changes

  const handleClaimJob = () => {
    // Logic to claim the job goes here
    alert("Job claimed successfully!");
  };

  const handleReleaseJob = async () => {
    try {
      await firebaseService.releaseJob(jobId);
      // Update local job state
      setJob((prevJob) =>
        prevJob
          ? { ...prevJob, status: "available", mechanicId: undefined }
          : null
      );
      Alert.alert("Success", "Job released successfully");
    } catch (error) {
      console.error("Error releasing job:", error);
      Alert.alert("Error", "Failed to release job. Please try again.");
    }
  };

  const handleUpdateJobStatus = async (newStatus: Job["status"]) => {
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (!currentUser) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      if (newStatus === "claimed") {
        await firebaseService.claimJob(jobId, currentUser.uid);
        // Update local job state
        setJob((prevJob) =>
          prevJob
            ? { ...prevJob, status: newStatus, mechanicId: currentUser.uid }
            : null
        );
        Alert.alert("Success", "Job claimed successfully");
      } else {
        await firebaseService.updateJobStatus(jobId, newStatus);
        // Update local job state
        setJob((prevJob) =>
          prevJob ? { ...prevJob, status: newStatus } : null
        );
      }

      setShowStatusDropdown(false);
    } catch (error) {
      console.error("Error updating job status:", error);
      Alert.alert("Error", "Failed to update job status. Please try again.");
    }
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

  const getNextStatusOptions = (
    currentStatus: Job["status"]
  ): Job["status"][] => {
    switch (currentStatus) {
      case "available":
        return ["claimed"];
      case "claimed":
        return ["available", "in_progress", "completed"];
      case "in_progress":
        return ["completed"];
      case "completed":
        return ["available", "in_progress"];
      default:
        return [];
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${customerProfile?.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${customerProfile?.email}`);
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.gray[900] : colors.gray[50] },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* User Information Card */}
      {viewMode === "mechanic" && (
        <Card>
          <CardHeader>
            <Text
              style={[
                styles.cardTitle,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              Customer Information
            </Text>
          </CardHeader>
          <CardContent>
            <View style={styles.infoRow}>
              <Feather
                name="user"
                size={20}
                color={isDark ? colors.gray[400] : colors.gray[500]}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {customerProfile?.name}
              </Text>
            </View>

            <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
              <Feather
                name="mail"
                size={20}
                color={isDark ? colors.gray[400] : colors.gray[500]}
              />
              <Text style={[styles.infoText, { color: colors.primary[500] }]}>
                {customerProfile?.email}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Feather
                name="phone"
                size={20}
                color={isDark ? colors.gray[400] : colors.gray[500]}
              />
              <Text style={[styles.infoText, { color: colors.primary[500] }]}>
                {customerProfile?.phone}
              </Text>
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <Feather
                name="map-pin"
                size={20}
                color={isDark ? colors.gray[400] : colors.gray[500]}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {job?.customerLocation}
              </Text>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Information Card */}
      {viewMode === "mechanic" && (
        <Card>
          <CardHeader>
            <Text
              style={[
                styles.cardTitle,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              Vehicle Information
            </Text>
          </CardHeader>
          <CardContent>
            <View style={styles.vehicleHeader}>
              <Text
                style={[
                  styles.vehicleName,
                  { color: isDark ? colors.white : colors.gray[900] },
                ]}
              >
                {car?.year} {car?.make} {car?.model}
              </Text>
            </View>

            <View style={styles.vehicleDetails}>
              <View style={styles.vehicleDetailItem}>
                <Text
                  style={[
                    styles.vehicleDetailLabel,
                    { color: isDark ? colors.gray[400] : colors.gray[600] },
                  ]}
                >
                  Color:{" "}
                  <Text
                    style={[
                      styles.vehicleDetailValue,
                      { color: isDark ? colors.white : colors.gray[900] },
                    ]}
                  >
                    {car?.color}
                  </Text>
                </Text>
              </View>

              <View style={styles.vehicleDetailItem}>
                <Text
                  style={[
                    styles.vehicleDetailLabel,
                    { color: isDark ? colors.gray[400] : colors.gray[600] },
                  ]}
                >
                  VIN:{" "}
                  <Text
                    style={[
                      styles.vehicleDetailValue,
                      { color: isDark ? colors.white : colors.gray[900] },
                    ]}
                  >
                    {car?.vin}
                  </Text>
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      )}
      {/* Diagnostic Information Card */}
      <Card>
        <CardHeader>
          <View style={styles.diagnosticHeader}>
            <Text
              style={[
                styles.diagnosticTitle,
                { color: isDark ? colors.white : colors.gray[900] },
              ]}
            >
              {job?.title}
            </Text>
            <View
              style={[
                styles.severityBadge,
                {
                  backgroundColor:
                    job?.priority === "high"
                      ? colors.red[500]
                      : job?.priority === "medium"
                      ? colors.yellow[500]
                      : colors.green[500],
                },
              ]}
            >
              <Text style={styles.severityText}>{job?.priority}</Text>
            </View>
          </View>

          {job?.dtcCodes &&
            Array.isArray(job.dtcCodes) &&
            job.dtcCodes.length > 0 && (
              <View style={styles.diagnosticHeader}>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: isDark ? colors.white : colors.gray[900] },
                  ]}
                >
                  Diagnostic Code: {job.dtcCodes.join(", ")}
                </Text>
              </View>
            )}
        </CardHeader>
        <CardContent>
          <Text
            style={[
              styles.diagnosticDescription,
              { color: isDark ? colors.gray[300] : colors.gray[700] },
            ]}
          >
            {job?.description}
          </Text>
        </CardContent>
      </Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {(userRole === "user" || userRole === "admin") && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary[500] },
            ]}
            onPress={() => navigation.navigate("FindMechanics")}
          >
            <Text style={styles.actionButtonText}>Request Mechanic</Text>
          </TouchableOpacity>
        )}
        {userRole === "user" && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary[500] },
            ]}
            onPress={() => navigation.navigate("FindMechanics")}
          >
            <Text style={styles.actionButtonText}>Find Mechanics</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Update Section for Mechanics */}
      {viewMode === "mechanic" && job && (
        <View style={styles.statusControlsContainer}>
          {job.status !== "available" && (
            <View style={styles.statusButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  { backgroundColor: getStatusColor(job.status) },
                ]}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={styles.statusButtonText}>
                  {getStatusText(job.status)}
                </Text>
                <Feather
                  name={showStatusDropdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.white}
                  style={styles.statusButtonIcon}
                />
              </TouchableOpacity>

              {showStatusDropdown && (
                <View
                  style={[
                    styles.statusDropdown,
                    {
                      backgroundColor: isDark ? colors.gray[800] : colors.white,
                      borderColor: isDark ? colors.gray[600] : colors.gray[300],
                    },
                  ]}
                >
                  {getNextStatusOptions(job.status).map((statusOption) => (
                    <TouchableOpacity
                      key={statusOption}
                      style={[
                        styles.statusOption,
                        {
                          borderBottomColor: isDark
                            ? colors.gray[700]
                            : colors.gray[200],
                        },
                      ]}
                      onPress={() => handleUpdateJobStatus(statusOption)}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          { color: isDark ? colors.white : colors.gray[900] },
                        ]}
                      >
                        {statusOption === "claimed"
                          ? "Claim Job"
                          : `${getStatusText(statusOption)}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.releaseButton,
              {
                backgroundColor: colors.primary[500],
              },
            ]}
            onPress={
              job.status === "available"
                ? () => handleUpdateJobStatus("claimed")
                : handleReleaseJob
            }
          >
            <Text style={styles.releaseButtonText}>
              {job.status === "available" ? "Claim Job" : "Release Job"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "600",
  },
  vehicleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  vehicleDetails: {
    marginBottom: 8,
  },
  vehicleDetailItem: {
    marginBottom: 8,
  },
  vehicleDetailLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  vehicleDetailValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  diagnosticHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  diagnosticTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  diagnosticDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  diagnosticMeta: {
    marginTop: 8,
  },
  diagnosticMetaText: {
    fontSize: 14,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  currentStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  currentStatusLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  statusButtonIcon: {
    marginLeft: 4,
  },
  statusDropdown: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusOptionText: {
    fontSize: 14,
  },
  statusControlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  statusButtonContainer: {
    position: "relative",
  },
  releaseButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  releaseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
