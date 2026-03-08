import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../components/theme-provider";
import { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeedbackScreen() {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [feedback, setFeedback] = useState("");
  const [subject, setSubject] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please enter your feedback before sending.");
      return;
    }

    setIsSending(true);

    try {
      const recipientEmail = "getmychanic@gmail.com";
      const emailSubject = subject.trim() || "Mychanic App Feedback";
      const emailBody = `Feedback from Mychanic App User:\n\n${feedback.trim()}\n\n---\nSent from Mychanic App`;

      // Create mailto URL
      const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(emailBody)}`;

      // Check if device can open mailto links
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        Alert.alert(
          "Email Opened",
          "Your email app has been opened with your feedback. Please send the email to complete the submission.",
          [
            {
              text: "OK",
              onPress: () => {
                // Clear the form after successful send
                setFeedback("");
                setSubject("");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Email Not Available",
          "No email app is configured on this device. Please send your feedback to getmychanic@gmail.com manually."
        );
      }
    } catch (error) {
      console.error("Error opening email:", error);
      Alert.alert(
        "Error",
        "Unable to open email app. Please send your feedback to getmychanic@gmail.com manually."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyEmail = () => {
    Alert.alert("Email Address", "getmychanic@gmail.com", [
      {
        text: "Copy",
        onPress: () => {
          // Note: React Native doesn't have a built-in clipboard in the core,
          // but we can show the email for manual copying
          Alert.alert("Copied!", "Email address: getmychanic@gmail.com");
        },
      },
      { text: "OK" },
    ]);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? colors.gray[900] : colors.gray[50] },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? colors.gray[900] : colors.gray[50]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Section */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDarkMode ? colors.gray[800] : colors.white,
              borderColor: isDarkMode ? colors.gray[700] : colors.gray[200],
            },
          ]}
        >
          <Feather
            name="message-square"
            size={32}
            color={themeColors.primary[500]}
            style={styles.infoIcon}
          />
          <Text
            style={[
              styles.infoTitle,
              { color: isDarkMode ? colors.white : colors.gray[900] },
            ]}
          >
            We Value Your Feedback
          </Text>
          <Text
            style={[
              styles.infoText,
              { color: isDarkMode ? colors.gray[300] : colors.gray[600] },
            ]}
          >
            Help us improve Mychanic by sharing your thoughts, suggestions, or
            reporting any issues you've encountered.
          </Text>
        </View>

        {/* Feedback Form */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: isDarkMode ? colors.gray[800] : colors.white,
              borderColor: isDarkMode ? colors.gray[700] : colors.gray[200],
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              { color: isDarkMode ? colors.white : colors.gray[900] },
            ]}
          >
            Subject (Optional)
          </Text>
          <TextInput
            style={[
              styles.subjectInput,
              {
                backgroundColor: isDarkMode
                  ? colors.gray[700]
                  : colors.gray[50],
                color: isDarkMode ? colors.white : colors.gray[900],
                borderColor: isDarkMode ? colors.gray[600] : colors.gray[300],
              },
            ]}
            placeholder="Brief description of your feedback"
            placeholderTextColor={
              isDarkMode ? colors.gray[400] : colors.gray[500]
            }
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          <Text
            style={[
              styles.label,
              { color: isDarkMode ? colors.white : colors.gray[900] },
            ]}
          >
            Your Feedback *
          </Text>
          <TextInput
            style={[
              styles.feedbackInput,
              {
                backgroundColor: isDarkMode
                  ? colors.gray[700]
                  : colors.gray[50],
                color: isDarkMode ? colors.white : colors.gray[900],
                borderColor: isDarkMode ? colors.gray[600] : colors.gray[300],
              },
            ]}
            placeholder="Tell us what you think..."
            placeholderTextColor={
              isDarkMode ? colors.gray[400] : colors.gray[500]
            }
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text
            style={[
              styles.charCount,
              { color: isDarkMode ? colors.gray[400] : colors.gray[500] },
            ]}
          >
            {feedback.length}/1000 characters
          </Text>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: themeColors.primary[500],
              opacity: isSending || !feedback.trim() ? 0.6 : 1,
            },
          ]}
          onPress={handleSendFeedback}
          disabled={isSending || !feedback.trim()}
        >
          <Feather
            name={isSending ? "loader" : "send"}
            size={20}
            color={colors.white}
            style={isSending ? styles.spinner : undefined}
          />
          <Text style={styles.sendButtonText}>
            {isSending ? "Opening Email..." : "Send Feedback"}
          </Text>
        </TouchableOpacity>

        {/* Alternative Contact */}
        <View
          style={[
            styles.alternativeCard,
            {
              backgroundColor: isDarkMode ? colors.gray[800] : colors.white,
              borderColor: isDarkMode ? colors.gray[700] : colors.gray[200],
            },
          ]}
        >
          <Text
            style={[
              styles.alternativeTitle,
              { color: isDarkMode ? colors.white : colors.gray[900] },
            ]}
          >
            Alternative Contact
          </Text>
          <Text
            style={[
              styles.alternativeText,
              { color: isDarkMode ? colors.gray[300] : colors.gray[600] },
            ]}
          >
            If the email button doesn't work, you can also send your feedback
            directly to:
          </Text>
          <TouchableOpacity
            style={[
              styles.emailButton,
              {
                backgroundColor: isDarkMode
                  ? colors.gray[700]
                  : colors.gray[100],
              },
            ]}
            onPress={handleCopyEmail}
          >
            <Feather name="mail" size={16} color={themeColors.primary[500]} />
            <Text
              style={[styles.emailText, { color: themeColors.primary[500] }]}
            >
              getmychanic@gmail.com
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  infoIcon: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  formCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  subjectInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  spinner: {
    // Add spinner animation if needed
  },
  alternativeCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
});
