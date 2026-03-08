import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../components/theme-provider";
import Card from "../components/Card";
import VoiceInputComponent from "../components/VoiceInputComponent";
import { diagnosticService } from "../services/diagnosticService";
import {
  vehicleDataService,
  VehicleInfo,
  VehicleYear,
  VehicleMake,
  VehicleModel,
} from "../services/vehicleDataService";
import { dtcCodeService, DTCCode } from "../services/vehicleDiagnostics";
import { Feather } from "@expo/vector-icons";

interface DiagnosticData {
  vehicle: VehicleInfo;
  dtcCodes: DTCCode[];
  symptoms: string;
  mechanicNotes: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  diagnosticData?: Partial<DiagnosticData>;
  priority?: "low" | "medium" | "high" | "critical";
}

interface DiagnosticResult {
  analysis: string;
  suggestedSteps: string[];
  estimatedTime: string;
  requiredParts: string[];
  priority: "low" | "medium" | "high" | "critical";
}

type InputTab = "symptoms" | "notes";

export default function DiagnosticAssistant() {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // Vehicle Selection State
  const [vehicleYears, setVehicleYears] = useState<VehicleYear[]>([]);
  const [vehicleMakes, setVehicleMakes] = useState<VehicleMake[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo>({
    year: 0,
    make: "",
    model: "",
  });

  // Dropdown States
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showDTCDropdown, setShowDTCDropdown] = useState(false);

  // DTC Codes State
  const [selectedDTCCodes, setSelectedDTCCodes] = useState<DTCCode[]>([]);
  const [dtcSearchQuery, setDtcSearchQuery] = useState("");
  const [dtcSearchResults, setDtcSearchResults] = useState<DTCCode[]>([]);

  // Voice Input Tabs
  const [activeTab, setActiveTab] = useState<InputTab>("symptoms");
  const [symptomsText, setSymptomsText] = useState("");
  const [notesText, setNotesText] = useState("");

  // Chat and Processing State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingVehicleData, setIsLoadingVehicleData] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [hasInitialAnalysis, setHasInitialAnalysis] = useState(false);

  // Initialize component
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      // Load vehicle years
      const years = await vehicleDataService.getVehicleYears();
      setVehicleYears(years);

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "ai",
        content:
          "Hello! I'm your AI diagnostic assistant. Please fill out the vehicle information, DTC codes, and symptoms below, then I'll help you analyze the diagnostic data and provide guidance.",
        timestamp: new Date(),
      };
      setChatMessages([welcomeMessage]);
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  };

  // Vehicle Selection Handlers
  const handleYearSelect = async (year: number) => {
    setSelectedVehicle((prev) => ({ ...prev, year, make: "", model: "" }));
    setShowYearDropdown(false);
    setIsLoadingVehicleData(true);

    try {
      const makes = await vehicleDataService.getVehicleMakes(year);
      setVehicleMakes(makes);
      setVehicleModels([]);
    } catch (error) {
      console.error("Error loading makes:", error);
      Alert.alert("Error", "Failed to load vehicle makes");
    } finally {
      setIsLoadingVehicleData(false);
    }
  };

  const handleMakeSelect = async (make: VehicleMake) => {
    setSelectedVehicle((prev) => ({
      ...prev,
      make: make.MakeName || make.Make_Name || "",
      makeId: make.MakeId || make.Make_ID || 0,
      model: "",
    }));
    setShowMakeDropdown(false);
    setIsLoadingVehicleData(true);

    try {
      const models = await vehicleDataService.getVehicleModels(
        make.MakeName || make.Make_Name || "",
        selectedVehicle.year
      );
      setVehicleModels(models);
    } catch (error) {
      console.error("Error loading models:", error);
      Alert.alert("Error", "Failed to load vehicle models");
    } finally {
      setIsLoadingVehicleData(false);
    }
  };

  const handleModelSelect = (model: VehicleModel) => {
    setSelectedVehicle((prev) => ({
      ...prev,
      model: model.Model_Name || "",
      modelId: model.Model_ID,
    }));
    setShowModelDropdown(false);
  };

  // DTC Code Handlers
  const handleDTCSearch = (query: string) => {
    setDtcSearchQuery(query);
    const results = dtcCodeService.searchCodes(query);
    setDtcSearchResults(results);
  };

  const handleDTCSelect = (dtcCode: DTCCode) => {
    if (!selectedDTCCodes.find((code) => code.code === dtcCode.code)) {
      setSelectedDTCCodes((prev) => [...prev, dtcCode]);
    }
    setDtcSearchQuery("");
    setDtcSearchResults([]);
    setShowDTCDropdown(false);
  };

  const removeDTCCode = (codeToRemove: string) => {
    setSelectedDTCCodes((prev) =>
      prev.filter((code) => code.code !== codeToRemove)
    );
  };

  // Voice Input Handlers
  const handleTabChange = (tab: InputTab) => {
    setActiveTab(tab);
  };

  const handleVoiceTextChange = (text: string) => {
    if (activeTab === "symptoms") {
      setSymptomsText(text);
    } else {
      setNotesText(text);
    }
  };

  const getCurrentVoiceText = () => {
    return activeTab === "symptoms" ? symptomsText : notesText;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, newMessage]);
    scrollToBottom();
  };

  // Send analysis request with current form data
  const sendAnalysisRequest = async () => {
    // Validate form data
    if (
      !selectedVehicle.year ||
      !selectedVehicle.make ||
      !selectedVehicle.model
    ) {
      Alert.alert(
        "Missing Information",
        "Please complete the vehicle information."
      );
      return;
    }

    if (selectedDTCCodes.length === 0 && !symptomsText.trim()) {
      Alert.alert(
        "Missing Information",
        "Please provide either DTC codes or symptoms."
      );
      return;
    }

    setIsTyping(true);

    try {
      // Build diagnostic data
      const diagnosticData: DiagnosticData = {
        vehicle: selectedVehicle,
        dtcCodes: selectedDTCCodes,
        symptoms: symptomsText,
        mechanicNotes: notesText,
      };

      // Add user message summarizing the input
      const userSummary = buildUserSummary(diagnosticData);
      addMessage({
        type: "user",
        content: userSummary,
        diagnosticData,
      });

      // Get AI analysis
      const result = await diagnosticService.analyzeDiagnostic({
        symptoms: symptomsText,
        vehicleDetails: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
        dtcCodes: selectedDTCCodes.map((code) => code.code).join(", "),
        mechanicNotes: notesText,
      });

      setIsTyping(false);

      const analysisMessage = `## Diagnostic Analysis

**Vehicle:** ${selectedVehicle.year} ${selectedVehicle.make} ${
        selectedVehicle.model
      }
**Priority: ${result.priority.toUpperCase()}**

${result.analysis}

**Suggested Steps:**
${result.suggestedSteps
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}

**Estimated Time:** ${result.estimatedTime}
**Required Parts:** ${result.requiredParts.join(", ")}

Would you like me to explain any of these steps in more detail, or do you have questions about the diagnosis?`;

      addMessage({
        type: "ai",
        content: analysisMessage,
        priority: result.priority,
      });

      // Mark that we have initial analysis for follow-up questions
      setHasInitialAnalysis(true);
    } catch (error) {
      setIsTyping(false);
      console.error("Error getting AI analysis:", error);
      addMessage({
        type: "ai",
        content:
          "I encountered an error while analyzing the diagnostic data. Please try again or provide more information.",
      });
    }
  };

  const sendFollowUpMessage = async () => {
    if (!followUpMessage.trim() || isTyping) return;

    const userMessage = followUpMessage.trim();
    setFollowUpMessage("");
    setIsTyping(true);

    // Add user message
    addMessage({
      type: "user",
      content: userMessage,
    });

    try {
      // Get AI response for follow-up question
      const result = await diagnosticService.analyzeConversation(
        {
          previousMessages: chatMessages,
          vehicleDetails: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
          dtcCodes: selectedDTCCodes.map((code) => code.code).join(", "),
        },
        userMessage
      );

      setIsTyping(false);

      addMessage({
        type: "ai",
        content: result.content,
      });
    } catch (error) {
      setIsTyping(false);
      console.error("Error getting AI response:", error);
      addMessage({
        type: "ai",
        content:
          "I encountered an error while processing your question. Please try asking again.",
      });
    }
  };

  const handleInputFocus = () => {
    // Scroll to bottom when input is focused
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const buildUserSummary = (data: DiagnosticData): string => {
    let summary = `**Diagnostic Request**\n\n`;

    summary += `**Vehicle:** ${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}\n\n`;

    if (data.dtcCodes.length > 0) {
      summary += `**DTC Codes:**\n`;
      data.dtcCodes.forEach((code) => {
        summary += `• ${code.code}: ${code.description}\n`;
      });
      summary += "\n";
    }

    if (data.symptoms) {
      summary += `**Symptoms:** ${data.symptoms}\n\n`;
    }

    if (data.mechanicNotes) {
      summary += `**Notes:** ${data.mechanicNotes}\n\n`;
    }

    summary += `Please analyze this diagnostic information and provide recommendations.`;

    return summary;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "critical":
        return colors.red?.[500] || "#EF4444";
      case "high":
        return "#F97316";
      case "medium":
        return colors.yellow?.[500] || "#EAB308";
      case "low":
        return colors.green?.[500] || "#22C55E";
      default:
        return colors.gray?.[500] || "#6B7280";
    }
  };

  const isFormValid = () => {
    return (
      selectedVehicle.year &&
      selectedVehicle.make &&
      selectedVehicle.model &&
      (selectedDTCCodes.length > 0 || symptomsText.trim())
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.gray?.[900] : colors.gray?.[50],
    },
    content: {
      flex: 1,
    },
    formSection: {
      backgroundColor: isDark ? colors.gray?.[800] : colors.white,
      margin: 16,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[700] : colors.gray?.[200],
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? colors.white : colors.gray?.[900],
      marginBottom: 12,
    },
    formRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 12,
    },
    dropdownContainer: {
      flex: 1,
    },
    dropdownButton: {
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[600] : colors.gray?.[300],
      borderRadius: 8,
      padding: 12,
      backgroundColor: isDark ? colors.gray?.[700] : colors.white,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dropdownButtonText: {
      color: isDark ? colors.white : colors.gray?.[900],
      fontSize: 16,
    },
    dropdownPlaceholder: {
      color: isDark ? colors.gray?.[400] : colors.gray?.[500],
      fontSize: 16,
    },
    dropdownModal: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    dropdownContent: {
      backgroundColor: isDark ? colors.gray?.[800] : colors.white,
      borderRadius: 12,
      maxHeight: "70%",
    },
    dropdownHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.gray?.[700] : colors.gray?.[200],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dropdownHeaderText: {
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? colors.white : colors.gray?.[900],
    },
    dropdownItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.gray?.[700] : colors.gray?.[200],
    },
    dropdownItemText: {
      fontSize: 16,
      color: isDark ? colors.white : colors.gray?.[900],
    },
    dropdownItemDescription: {
      fontSize: 14,
      color: isDark ? colors.gray?.[400] : colors.gray?.[600],
      marginTop: 4,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[600] : colors.gray?.[300],
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDark ? colors.white : colors.gray?.[900],
      backgroundColor: isDark ? colors.gray?.[700] : colors.white,
      margin: 16,
    },
    selectedCodesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    selectedCodeChip: {
      backgroundColor: colors.primary?.[500],
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    selectedCodeText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "500",
    },
    tabContainer: {
      flexDirection: "row",
      marginBottom: 12,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? colors.gray?.[700] : colors.gray?.[100],
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[600] : colors.gray?.[300],
    },
    tabLeft: {
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      borderRightWidth: 0,
    },
    tabRight: {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    tabActive: {
      backgroundColor: colors.primary?.[500],
      borderColor: colors.primary?.[500],
    },
    tabText: {
      textAlign: "center",
      fontSize: 16,
      fontWeight: "500",
      color: isDark ? colors.white : colors.gray?.[700],
    },
    tabTextActive: {
      color: colors.white,
    },
    analyzeButton: {
      margin: 16,
      backgroundColor: colors.primary?.[500],
      borderRadius: 12,
      paddingVertical: 16,
    },
    analyzeButtonDisabled: {
      backgroundColor: isDark ? colors.gray?.[600] : colors.gray?.[400],
    },
    analyzeButtonText: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
    },
    chatContainer: {
      flex: 1,
      padding: 16,
    },
    messageContainer: {
      marginBottom: 16,
      maxWidth: "85%",
    },
    userMessageContainer: {
      alignSelf: "flex-end",
    },
    aiMessageContainer: {
      alignSelf: "flex-start",
    },
    messageCard: {
      padding: 12,
      borderRadius: 16,
    },
    userMessage: {
      backgroundColor: colors.primary?.[500],
    },
    aiMessage: {
      backgroundColor: isDark ? colors.gray?.[800] : colors.white,
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[700] : colors.gray?.[200],
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },
    userMessageText: {
      color: colors.white,
    },
    aiMessageText: {
      color: isDark ? colors.white : colors.gray?.[900],
    },
    messageTime: {
      fontSize: 11,
      marginTop: 4,
      opacity: 0.7,
    },
    priorityBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginBottom: 8,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: "bold",
      color: colors.white,
      textTransform: "uppercase",
    },
    typingContainer: {
      alignSelf: "flex-start",
      padding: 12,
      backgroundColor: isDark ? colors.gray?.[800] : colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[700] : colors.gray?.[200],
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    typingText: {
      marginLeft: 8,
      color: isDark ? colors.gray?.[400] : colors.gray?.[600],
      fontStyle: "italic",
    },
    loadingText: {
      textAlign: "center",
      color: isDark ? colors.gray?.[400] : colors.gray?.[600],
      fontStyle: "italic",
      marginTop: 8,
    },
    followUpContainer: {
      flexDirection: "row",
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 16 : 16,
      gap: 12,
      backgroundColor: isDark ? colors.gray?.[800] : colors.white,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.gray?.[700] : colors.gray?.[200],
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    followUpInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? colors.gray?.[600] : colors.gray?.[300],
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: isDark ? colors.white : colors.gray?.[900],
      backgroundColor: isDark ? colors.gray?.[700] : colors.gray?.[50],
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: colors.primary?.[500],
      borderRadius: 24,
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    sendButtonDisabled: {
      backgroundColor: isDark ? colors.gray?.[600] : colors.gray?.[400],
    },
  });

  // Render dropdown for vehicle selection
  const renderDropdown = (
    title: string,
    placeholder: string,
    value: string,
    onPress: () => void,
    isDisabled = false
  ) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, isDisabled && { opacity: 0.5 }]}
        onPress={onPress}
        disabled={isDisabled}
      >
        <Text
          style={value ? styles.dropdownButtonText : styles.dropdownPlaceholder}
        >
          {value || placeholder}
        </Text>
        <Feather
          name="chevron-down"
          size={20}
          color={isDark ? colors.white : colors.gray?.[600]}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vehicle Information Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>

            <View style={styles.formRow}>
              {renderDropdown(
                "Year",
                "Select Year",
                selectedVehicle.year ? selectedVehicle.year.toString() : "",
                () => setShowYearDropdown(true)
              )}
              {renderDropdown(
                "Make",
                "Select Make",
                selectedVehicle.make,
                () => setShowMakeDropdown(true),
                !selectedVehicle.year
              )}
            </View>

            <View style={styles.formRow}>
              {renderDropdown(
                "Model",
                "Select Model",
                selectedVehicle.model,
                () => setShowModelDropdown(true),
                !selectedVehicle.make
              )}
            </View>

            {isLoadingVehicleData && (
              <Text style={styles.loadingText}>Loading vehicle data...</Text>
            )}
          </View>

          {/* DTC Codes Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>DTC Codes</Text>

            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDTCDropdown(true)}
            >
              <Text style={styles.dropdownPlaceholder}>
                Search and add DTC codes...
              </Text>
              <Feather
                name="search"
                size={20}
                color={isDark ? colors.white : colors.gray?.[600]}
              />
            </TouchableOpacity>

            {selectedDTCCodes.length > 0 && (
              <View style={styles.selectedCodesContainer}>
                {selectedDTCCodes.map((code) => (
                  <View key={code.code} style={styles.selectedCodeChip}>
                    <Text style={styles.selectedCodeText}>{code.code}</Text>
                    <TouchableOpacity onPress={() => removeDTCCode(code.code)}>
                      <Feather name="x" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Symptoms and Notes Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Symptoms & Notes</Text>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  styles.tabLeft,
                  activeTab === "symptoms" && styles.tabActive,
                ]}
                onPress={() => handleTabChange("symptoms")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "symptoms" && styles.tabTextActive,
                  ]}
                >
                  Symptoms
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  styles.tabRight,
                  activeTab === "notes" && styles.tabActive,
                ]}
                onPress={() => handleTabChange("notes")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "notes" && styles.tabTextActive,
                  ]}
                >
                  Notes
                </Text>
              </TouchableOpacity>
            </View>

            <VoiceInputComponent
              value={getCurrentVoiceText()}
              onTextChange={handleVoiceTextChange}
              placeholder={
                activeTab === "symptoms"
                  ? "Describe the vehicle symptoms..."
                  : "Add mechanic notes..."
              }
              multiline={true}
              maxLength={1000}
            />
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              !isFormValid() && styles.analyzeButtonDisabled,
            ]}
            onPress={sendAnalysisRequest}
            disabled={!isFormValid() || isTyping}
          >
            <Text style={styles.analyzeButtonText}>
              {isTyping ? "Analyzing..." : "Analyze Diagnostic Data"}
            </Text>
          </TouchableOpacity>

          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>AI Analysis</Text>

              <View style={styles.chatContainer}>
                {chatMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageContainer,
                      message.type === "user"
                        ? styles.userMessageContainer
                        : styles.aiMessageContainer,
                    ]}
                  >
                    {message.priority && (
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor: getPriorityColor(message.priority),
                          },
                        ]}
                      >
                        <Text style={styles.priorityText}>
                          {message.priority}
                        </Text>
                      </View>
                    )}

                    <Card
                      style={StyleSheet.flatten([
                        styles.messageCard,
                        message.type === "user"
                          ? styles.userMessage
                          : styles.aiMessage,
                      ])}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          message.type === "user"
                            ? styles.userMessageText
                            : styles.aiMessageText,
                        ]}
                      >
                        {message.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          message.type === "user"
                            ? styles.userMessageText
                            : styles.aiMessageText,
                        ]}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Card>
                  </View>
                ))}

                {isTyping && (
                  <View style={styles.typingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={colors.primary?.[500]}
                    />
                    <Text style={styles.typingText}>AI is analyzing...</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Follow-up Message Input */}
        {hasInitialAnalysis && (
          <View style={styles.followUpContainer}>
            <TextInput
              style={styles.followUpInput}
              value={followUpMessage}
              onChangeText={setFollowUpMessage}
              placeholder="Ask a follow-up question..."
              placeholderTextColor={
                isDark ? colors.gray?.[400] : colors.gray?.[500]
              }
              multiline
              returnKeyType="send"
              onSubmitEditing={sendFollowUpMessage}
              onFocus={handleInputFocus}
              editable={!isTyping}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!followUpMessage.trim() || isTyping) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={sendFollowUpMessage}
              disabled={!followUpMessage.trim() || isTyping}
            >
              <Feather name="send" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Dropdown Modals */}
      {/* Year Dropdown */}
      <Modal visible={showYearDropdown} transparent animationType="fade">
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearDropdown(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray?.[600]}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicleYears}
              keyExtractor={(item) => item.year.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleYearSelect(item.year)}
                >
                  <Text style={styles.dropdownItemText}>{item.year}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      {/* Make Dropdown */}
      <Modal visible={showMakeDropdown} transparent animationType="fade">
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Select Make</Text>
              <TouchableOpacity onPress={() => setShowMakeDropdown(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray?.[600]}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicleMakes}
              keyExtractor={(item) =>
                (item.MakeId || item.Make_ID || 0).toString()
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleMakeSelect(item)}
                >
                  <Text style={styles.dropdownItemText}>
                    {item.MakeName || item.Make_Name || "Unknown"}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      {/* Model Dropdown */}
      <Modal visible={showModelDropdown} transparent animationType="fade">
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Select Model</Text>
              <TouchableOpacity onPress={() => setShowModelDropdown(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray?.[600]}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicleModels}
              keyExtractor={(item, index) =>
                `model-${item.Model_ID || item.ModelId || index}-${
                  item.Model_Name || item.ModelName || index
                }`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleModelSelect(item)}
                >
                  <Text style={styles.dropdownItemText}>
                    {item.Model_Name || item.ModelName || "Unknown"}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      {/* DTC Code Search Dropdown */}
      <Modal visible={showDTCDropdown} transparent animationType="fade">
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownContent}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Search DTC Codes</Text>
              <TouchableOpacity onPress={() => setShowDTCDropdown(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.white : colors.gray?.[600]}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Type DTC code or description..."
              placeholderTextColor={
                isDark ? colors.gray?.[400] : colors.gray?.[500]
              }
              value={dtcSearchQuery}
              onChangeText={handleDTCSearch}
              autoFocus
            />
            <FlatList
              data={dtcSearchResults}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleDTCSelect(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.code}</Text>
                  <Text style={styles.dropdownItemDescription}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
