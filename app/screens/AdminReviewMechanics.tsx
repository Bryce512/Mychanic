import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../components/theme-provider";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "@react-native-firebase/firestore";
import {
  updateMechanicOnboardingStatus,
  getDocumentDownloadURL,
} from "../services/firebaseService";

interface MechanicApplication {
  id: string;
  businessName: string;
  email: string;
  name: string;
  phone: string;
  insuranceExpiry: string;
  onboardingStatus: string;
  documents: {
    insuranceCert?: string;
    driversLicense?: string;
    w9?: string;
    businessReg?: string;
  };
  createdAt: any;
}

export default function AdminReviewMechanics() {
  const { colors, isDark } = useTheme();
  const [applications, setApplications] = useState<MechanicApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<MechanicApplication | null>(
    null,
  );
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [loadingDocument, setLoadingDocument] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  useEffect(() => {
    console.log("showDocumentViewer changed to:", showDocumentViewer);
    console.log("documentUrl:", documentUrl);
    console.log("documentTitle:", documentTitle);
  }, [showDocumentViewer, documentUrl, documentTitle]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const mechanicsRef = collection(db, "mechanics");

      let q;
      if (statusFilter === "all") {
        // Get all mechanics
        q = query(mechanicsRef, orderBy("createdAt", "desc"));
      } else {
        // Get mechanics with specific status
        q = query(
          mechanicsRef,
          where("onboardingStatus", "==", statusFilter),
          orderBy("createdAt", "desc"),
        );
      }

      const snapshot = await getDocs(q);
      const apps: MechanicApplication[] = [];

      snapshot.forEach((doc: any) => {
        apps.push({
          id: doc.id,
          ...doc.data(),
        } as MechanicApplication);
      });

      setApplications(apps);
    } catch (error) {
      console.error("Error loading applications:", error);
      Alert.alert("Error", "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;

    Alert.alert(
      "Approve Application",
      `Are you sure you want to approve ${selectedApp.businessName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setProcessing(true);
              await updateMechanicOnboardingStatus(
                selectedApp.id,
                "approved",
                adminNote || "Application approved",
              );
              Alert.alert("Success", "Mechanic approved successfully");
              setShowReviewModal(false);
              setSelectedApp(null);
              setAdminNote("");
              await loadApplications();
            } catch (error) {
              console.error("Error approving:", error);
              Alert.alert("Error", "Failed to approve mechanic");
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    if (!selectedApp) return;

    if (!adminNote.trim()) {
      Alert.alert("Note Required", "Please provide a reason for rejection");
      return;
    }

    Alert.alert(
      "Reject Application",
      `Are you sure you want to reject ${selectedApp.businessName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              await updateMechanicOnboardingStatus(
                selectedApp.id,
                "rejected",
                adminNote,
              );
              Alert.alert("Success", "Application rejected");
              setShowReviewModal(false);
              setSelectedApp(null);
              setAdminNote("");
              await loadApplications();
            } catch (error) {
              console.error("Error rejecting:", error);
              Alert.alert("Error", "Failed to reject application");
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const openDocument = async (url: string, title: string) => {
    try {
      console.log("=== openDocument called ===");
      console.log("url:", url);
      console.log("title:", title);

      setLoadingDocument(true);

      // Convert gs:// URL to download URL
      let downloadUrl = url;
      if (url.startsWith("gs://")) {
        console.log("Converting gs:// URL...");
        downloadUrl = await getDocumentDownloadURL(url);
        console.log("Got download URL:", downloadUrl);
      }

      // Extract filename before query parameters for type detection
      const urlWithoutQuery = downloadUrl.split("?")[0];
      const decodedUrl = decodeURIComponent(urlWithoutQuery);

      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(decodedUrl);
      const isPdf = /\.pdf$/i.test(decodedUrl);

      console.log("File type check:", { isImage, isPdf });

      // Show in-app viewer for images and PDFs
      if (isImage || isPdf) {
        console.log(
          "✅ File type recognized, closing review modal and opening viewer...",
        );

        // Close the review modal first
        setShowReviewModal(false);

        // Set document data
        setDocumentTitle(title);
        setDocumentUrl(downloadUrl);

        // Wait a moment for review modal to close, then open viewer
        setTimeout(() => {
          setShowDocumentViewer(true);
          console.log("Document viewer opened");
        }, 300);

        setLoadingDocument(false);
      } else {
        // Unknown type, open in browser
        console.log("❌ Unknown file type, opening in browser");
        const canOpen = await Linking.canOpenURL(downloadUrl);
        if (canOpen) {
          await Linking.openURL(downloadUrl);
        } else {
          Alert.alert("Error", "Cannot open this file type");
        }
        setLoadingDocument(false);
      }
    } catch (error) {
      console.error("Error in openDocument:", error);
      Alert.alert(
        "Error",
        `Failed to load document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setLoadingDocument(false);
    }
  };

  const DocumentStatus = ({ label, url }: { label: string; url?: string }) => (
    <View style={styles.documentRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.gray[700], fontSize: 14 }}>{label}</Text>
      </View>
      {url ? (
        <TouchableOpacity
          onPress={() => openDocument(url, label)}
          disabled={loadingDocument}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.primary[100],
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Feather name="check-circle" size={14} color={colors.primary[600]} />
          <Text
            style={{
              color: colors.primary[600],
              fontSize: 12,
              fontWeight: "600",
              marginLeft: 4,
            }}
          >
            View
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.gray[100],
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Feather name="x-circle" size={14} color={colors.gray[500]} />
          <Text
            style={{
              color: colors.gray[500],
              fontSize: 12,
              marginLeft: 4,
            }}
          >
            Missing
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={{ marginTop: 12, color: colors.gray[600] }}>
            Loading applications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter applications by search query
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.businessName?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query)
    );
  });

  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "Incomplete", value: "incomplete" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "All", value: "all" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.gray[900] }]}>
            Mechanic Applications
          </Text>
          <Text style={[styles.subtitle, { color: colors.gray[600] }]}>
            {filteredApplications.length} application
            {filteredApplications.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.gray[100] },
          ]}
        >
          <Feather name="search" size={20} color={colors.gray[400]} />
          <TextInput
            style={[styles.searchInput, { color: colors.gray[900] }]}
            placeholder="Search by business name or email..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                statusFilter === option.value && {
                  backgroundColor: colors.primary[500],
                  borderColor: colors.primary[500],
                },
                { borderColor: colors.gray[300] },
              ]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === option.value
                    ? { color: "white" }
                    : { color: colors.gray[700] },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredApplications.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color={colors.gray[300]} />
            <Text style={[styles.emptyText, { color: colors.gray[600] }]}>
              {searchQuery ? "No matching applications" : "No applications"}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.gray[500] }]}>
              {searchQuery
                ? "Try adjusting your search"
                : "No applications found for this status"}
            </Text>
          </View>
        ) : (
          <View style={styles.applicationsList}>
            {filteredApplications.map((app) => (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.applicationCard,
                  { backgroundColor: colors.white },
                ]}
                onPress={() => {
                  setSelectedApp(app);
                  setShowReviewModal(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.businessName, { color: colors.gray[900] }]}
                    >
                      {app.businessName}
                    </Text>
                    <Text
                      style={[styles.personName, { color: colors.gray[600] }]}
                    >
                      {app.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          app.onboardingStatus === "pending"
                            ? colors.primary[100]
                            : app.onboardingStatus === "approved"
                              ? "#D1FAE5"
                              : app.onboardingStatus === "incomplete"
                                ? "#FEF3C7"
                                : "#FFEBEE",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            app.onboardingStatus === "pending"
                              ? colors.primary[700]
                              : app.onboardingStatus === "approved"
                                ? "#047857"
                                : app.onboardingStatus === "incomplete"
                                  ? "#B45309"
                                  : "#C62828",
                        },
                      ]}
                    >
                      {app.onboardingStatus === "pending"
                        ? "Pending"
                        : app.onboardingStatus === "approved"
                          ? "Approved"
                          : app.onboardingStatus === "incomplete"
                            ? "Incomplete"
                            : "Rejected"}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="mail" size={14} color={colors.gray[500]} />
                  <Text style={[styles.infoText, { color: colors.gray[700] }]}>
                    {app.email}
                  </Text>
                </View>

                {app.phone && (
                  <View style={styles.infoRow}>
                    <Feather name="phone" size={14} color={colors.gray[500]} />
                    <Text
                      style={[styles.infoText, { color: colors.gray[700] }]}
                    >
                      {app.phone}
                    </Text>
                  </View>
                )}

                <View style={styles.documentSummary}>
                  <Text style={{ color: colors.gray[600], fontSize: 12 }}>
                    Documents:{" "}
                    {Object.values(app.documents).filter((doc) => doc).length} /
                    4
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={colors.gray[400]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Feather name="x" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.gray[900] }]}>
              Review Application
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedApp && (
              <>
                {/* Business Info */}
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.gray[900] }]}
                  >
                    Business Information
                  </Text>
                  <View style={styles.infoCard}>
                    <Text style={[styles.label, { color: colors.gray[600] }]}>
                      Business Name
                    </Text>
                    <Text style={[styles.value, { color: colors.gray[900] }]}>
                      {selectedApp.businessName}
                    </Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={[styles.label, { color: colors.gray[600] }]}>
                      Insurance Expiry
                    </Text>
                    <Text style={[styles.value, { color: colors.gray[900] }]}>
                      {selectedApp.insuranceExpiry}
                    </Text>
                  </View>
                </View>

                {/* Contact Info */}
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.gray[900] }]}
                  >
                    Contact Information
                  </Text>
                  <View style={styles.infoCard}>
                    <Text style={[styles.label, { color: colors.gray[600] }]}>
                      Name
                    </Text>
                    <Text style={[styles.value, { color: colors.gray[900] }]}>
                      {selectedApp.name}
                    </Text>
                  </View>
                  <View style={styles.infoCard}>
                    <Text style={[styles.label, { color: colors.gray[600] }]}>
                      Email
                    </Text>
                    <Text style={[styles.value, { color: colors.gray[900] }]}>
                      {selectedApp.email}
                    </Text>
                  </View>
                  {selectedApp.phone && (
                    <View style={styles.infoCard}>
                      <Text style={[styles.label, { color: colors.gray[600] }]}>
                        Phone
                      </Text>
                      <Text style={[styles.value, { color: colors.gray[900] }]}>
                        {selectedApp.phone}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Documents */}
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.gray[900] }]}
                  >
                    Documents
                  </Text>
                  <View style={styles.documentsCard}>
                    <DocumentStatus
                      label="Insurance Certificate"
                      url={selectedApp.documents.insuranceCert}
                    />
                    <DocumentStatus
                      label="Driver's License"
                      url={selectedApp.documents.driversLicense}
                    />
                    <DocumentStatus
                      label="W9 Tax Form"
                      url={selectedApp.documents.w9}
                    />
                    <DocumentStatus
                      label="Business Registration"
                      url={selectedApp.documents.businessReg}
                    />
                  </View>
                </View>

                {/* Admin Note */}
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.gray[900] }]}
                  >
                    Review Note (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: colors.gray[50],
                        color: colors.gray[900],
                        borderColor: colors.gray[200],
                      },
                    ]}
                    placeholder="Add notes for approval or rejection reason..."
                    placeholderTextColor={colors.gray[400]}
                    multiline
                    numberOfLines={4}
                    value={adminNote}
                    onChangeText={setAdminNote}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.rejectButton,
                      processing && styles.buttonDisabled,
                    ]}
                    onPress={handleReject}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Feather name="x-circle" size={18} color="white" />
                        <Text style={styles.buttonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.approveButton,
                      { backgroundColor: colors.primary[500] },
                      processing && styles.buttonDisabled,
                    ]}
                    onPress={handleApprove}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Feather name="check-circle" size={18} color="white" />
                        <Text style={styles.buttonText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        visible={showDocumentViewer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          console.log("Modal onRequestClose called");
          setShowDocumentViewer(false);
          setDocumentUrl(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Header with safe area */}
          <SafeAreaView style={{ backgroundColor: "#000" }}>
            <View
              style={[
                styles.modalHeader,
                {
                  backgroundColor: "#000",
                  borderBottomColor: "#333",
                  marginTop: 30,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowDocumentViewer(false);
                  setDocumentUrl(null);
                }}
                style={{ padding: 8, zIndex: 1001 }}
              >
                <Feather name="x" size={28} color="#fff" />
              </TouchableOpacity>
              <Text
                style={[
                  styles.modalTitle,
                  { color: "#fff", flex: 1, textAlign: "center" },
                ]}
              >
                {documentTitle || "Document"}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  if (documentUrl) {
                    await Linking.openURL(documentUrl);
                  }
                }}
                style={{ padding: 8, zIndex: 1001 }}
              >
                <Feather name="external-link" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Content */}
          {documentUrl ? (
            (() => {
              const urlWithoutQuery = documentUrl.split("?")[0];
              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(
                urlWithoutQuery,
              );
              const isPdf = /\.pdf$/i.test(urlWithoutQuery);

              console.log("Modal rendering type check:", {
                isImage,
                isPdf,
                urlWithoutQuery,
              });

              if (isImage) {
                console.log("Rendering Image component with URL:", documentUrl);
                return (
                  <ScrollView
                    key={documentUrl}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      flexGrow: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    maximumZoomScale={5}
                    minimumZoomScale={1}
                    bouncesZoom={true}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                  >
                    <Image
                      key={documentUrl}
                      source={{ uri: documentUrl }}
                      style={{
                        width: Dimensions.get("window").width,
                        height: Dimensions.get("window").height - 120,
                      }}
                      resizeMode="contain"
                      onLoadStart={() =>
                        console.log("Image component load started")
                      }
                      onLoad={() =>
                        console.log("Image component loaded successfully")
                      }
                      onLoadEnd={() =>
                        console.log("Image component load ended")
                      }
                      onError={(error) => {
                        console.error(
                          "Image component load error:",
                          error.nativeEvent,
                        );
                        Alert.alert(
                          "Error",
                          "Failed to load image. Try opening in browser.",
                        );
                      }}
                    />
                  </ScrollView>
                );
              } else if (isPdf) {
                console.log("Rendering WebView component");
                return (
                  <WebView
                    source={{ uri: documentUrl }}
                    style={{ flex: 1, backgroundColor: "#fff" }}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View
                        style={[
                          styles.loadingContainer,
                          { backgroundColor: "#000" },
                        ]}
                      >
                        <ActivityIndicator
                          size="large"
                          color={colors.primary[500]}
                        />
                        <Text style={{ marginTop: 12, color: "#fff" }}>
                          Loading PDF...
                        </Text>
                      </View>
                    )}
                    onLoadStart={() => console.log("PDF load started")}
                    onLoadEnd={() => console.log("PDF load ended")}
                    onError={(syntheticEvent: any) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error("PDF load error:", nativeEvent);
                      Alert.alert(
                        "Error",
                        "Failed to load PDF in viewer. Opening in browser...",
                        [
                          {
                            text: "OK",
                            onPress: async () => {
                              await Linking.openURL(documentUrl);
                              setShowDocumentViewer(false);
                            },
                          },
                        ],
                      );
                    }}
                  />
                );
              }
              console.log("No matching file type!");
              return null;
            })()
          ) : (
            <View
              style={[styles.loadingContainer, { backgroundColor: "#000" }]}
            >
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={{ marginTop: 12, color: "#fff" }}>
                Loading document...
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  applicationsList: {
    gap: 12,
  },
  applicationCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  personName: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  documentSummary: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cardFooter: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  infoCard: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  documentsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: "#DC2626",
  },
  approveButton: {
    // backgroundColor set dynamically
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
