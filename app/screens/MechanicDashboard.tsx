import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../components/theme-provider";
import Card from "../components/Card";
import { RootStackParamList } from "../navigation/AppNavigator";
import firebaseService from "../services/firebaseService";
import { auth } from "../../firebaseConfig";
import { Job } from "../../types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MechanicStats {
  todaysJobs: number;
  thisWeekJobs: number;
  averageRating: number;
}

export default function MechanicDashboard() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [stats, setStats] = useState<MechanicStats>({
    todaysJobs: 0,
    thisWeekJobs: 0,
    averageRating: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Calculate stats from jobs data
  const calculateStats = (jobs: Job[]): MechanicStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    let todaysJobs = 0;
    let thisWeekJobs = 0;
    let totalRating = 0;
    let ratingCount = 0;

    jobs.forEach((job) => {
      if (job.claimedAt) {
        const claimedDate = job.claimedAt.toDate
          ? job.claimedAt.toDate()
          : new Date(job.claimedAt);

        // Count today's jobs
        if (claimedDate >= today) {
          todaysJobs++;
        }

        // Count this week's jobs
        if (claimedDate >= weekStart) {
          thisWeekJobs++;
        }

        // Calculate average rating (only include jobs with ratings)
        // Note: This assumes jobs have a 'rating' field. If not, this will need to be updated
        // to fetch ratings from a separate reviews collection
        if (job.rating && typeof job.rating === "number") {
          totalRating += job.rating;
          ratingCount++;
        }
      }
    });

    const averageRating =
      ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;

    return {
      todaysJobs,
      thisWeekJobs,
      averageRating,
    };
  };

  // Load mechanic's jobs and calculate stats
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const jobs = await firebaseService.getMyJobs(currentUser.uid);
      const calculatedStats = calculateStats(jobs);
      setStats(calculatedStats);
    } catch (error) {
      console.error("Error loading mechanic stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.gray[900] : colors.gray[50],
      paddingTop: 8,
    },
    content: {
      flex: 1,
      padding: 8,
    },
    statsContainer: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      padding: 16,
      alignItems: "center",
    },
    statNumber: {
      fontSize: 24,
      fontWeight: "bold",
      color: isDark ? colors.white : colors.gray[900],
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? colors.gray[400] : colors.gray[600],
      textAlign: "center",
    },
    quickActionsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? colors.white : colors.gray[900],
      marginBottom: 16,
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 24,
    },
    quickActionCard: {
      width: "48%",
      padding: 16,
      alignItems: "center",
      backgroundColor: isDark ? colors.gray[800] : colors.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.gray[700] : colors.gray[200],
    },
    quickActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    quickActionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? colors.white : colors.gray[900],
      textAlign: "center",
      marginBottom: 4,
    },
    quickActionDescription: {
      fontSize: 12,
      color: isDark ? colors.gray[400] : colors.gray[600],
      textAlign: "center",
    },
    recentActivityTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? colors.white : colors.gray[900],
      marginBottom: 16,
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: isDark ? colors.gray[800] : colors.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.gray[700] : colors.gray[200],
      marginBottom: 12,
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? colors.white : colors.gray[900],
      marginBottom: 2,
    },
    activityDescription: {
      fontSize: 12,
      color: isDark ? colors.gray[400] : colors.gray[600],
    },
    activityTime: {
      fontSize: 12,
      color: isDark ? colors.gray[500] : colors.gray[500],
    },
  });

  const quickActions = [
    {
      id: "myJobs",
      title: "My Jobs",
      description: "View your claimed jobs",
      icon: "briefcase",
      onPress: () => navigation.navigate("JobsList", { isMyJobs: true }),
    },
    {
      id: "JobsList",
      title: "Available Jobs",
      description: "Browse and claim new jobs",
      icon: "briefcase",
      onPress: () => navigation.navigate("JobsList", { isMyJobs: false }),
    },
    {
      id: "diagnostic",
      title: "Diagnostic Assistant",
      description: "AI-powered diagnostic guidance",
      icon: "cpu",
      onPress: () => navigation.navigate("DiagnosticAssistant"),
    },
    {
      id: "scan",
      title: "Scan Devices",
      description: "Connect to OBD-II devices",
      icon: "bluetooth",
      onPress: () => navigation.navigate("ScanDevices"),
    },
    {
      id: "appointments",
      title: "Appointments",
      description: "View today's schedule",
      icon: "calendar",
      onPress: () => {
        // TODO: Navigate to appointments screen when available
        alert("Appointments screen coming soon!");
      },
    },
    {
      id: "profile",
      title: "Profile",
      description: "Update your information",
      icon: "user",
      onPress: () => navigation.navigate("Profile"),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>
              {loadingStats ? "..." : stats.todaysJobs}
            </Text>
            <Text style={styles.statLabel}>Today's Jobs</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>
              {loadingStats ? "..." : stats.thisWeekJobs}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>
              {loadingStats ? "..." : stats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Feather
                  name={action.icon as any}
                  size={24}
                  color={colors.white}
                />
              </View>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
              <Text style={styles.quickActionDescription}>
                {action.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}
