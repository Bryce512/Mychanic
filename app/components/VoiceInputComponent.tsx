import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "./theme-provider";
import Voice from "@react-native-voice/voice";

interface VoiceInputComponentProps {
  value: string;
  onTextChange: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
}

export default function VoiceInputComponent({
  value,
  onTextChange,
  placeholder = "Tap the microphone to start voice input...",
  multiline = true,
  maxLength = 1000,
  editable = true,
}: VoiceInputComponentProps) {
  const { colors, isDark } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [hasVoicePermission, setHasVoicePermission] = useState(false);
  const [internalText, setInternalText] = useState(value || ""); // Track text internally
  const baseTextRef = useRef(value || ""); // Use ref for immediate access during recording
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Sync internal text with external value prop
  useEffect(() => {
    if (value !== internalText) {
      setInternalText(value || "");
      baseTextRef.current = value || "";
    }
  }, [value]);

  // Initialize Voice event listeners
  useEffect(() => {
    // Set up Voice event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechRecognized = onSpeechRecognized;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      // Clean up
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Voice event handlers
  const onSpeechStart = (e: any) => {
    setIsListening(true);
    // Set the base text from current internal text at start of recording
    baseTextRef.current = internalText;
  };

  const onSpeechRecognized = (e: any) => {
    // Speech recognized - no action needed
  };

  const onSpeechEnd = (e: any) => {
    setIsListening(false);
    stopPulseAnimation();
  };

  const onSpeechError = (e: any) => {
    setIsListening(false);
    stopPulseAnimation();

    Alert.alert(
      "Voice Recognition Error",
      "Speech recognition failed. Please try again or use text input.",
      [{ text: "OK" }]
    );
  };

  const onSpeechResults = (e: any) => {
    if (e.value && e.value.length > 0) {
      const recognizedText = e.value[0];
      if (recognizedText && recognizedText.trim()) {
        // Append new speech to the base text from ref
        const baseText = baseTextRef.current;
        const separator = baseText && baseText.trim() ? " " : "";
        const newText = `${baseText}${separator}${recognizedText.trim()}`;
        const finalText = newText.substring(0, maxLength);
        setInternalText(finalText);
        onTextChange(finalText);
      }
    }
    // Only stop listening when speech actually ends, not on intermediate results
    // The onSpeechEnd handler will handle stopping the listening state
  };

  const onSpeechPartialResults = (e: any) => {
    if (e.value && e.value.length > 0) {
      const partialText = e.value[0];
      // Update text field with partial results in real-time, appending to base text from ref
      if (partialText && partialText.trim()) {
        const baseText = baseTextRef.current;
        const separator = baseText && baseText.trim() ? " " : "";
        const newText = `${baseText}${separator}${partialText.trim()}`;

        // For partial results, only update display, don't update internal state
        onTextChange(newText.substring(0, maxLength));
      }
      // Keep listening - don't change isListening state here
    }
  };

  // Check if voice recognition is available
  const isVoiceRecognitionAvailable = async (): Promise<boolean> => {
    try {
      const available = await Voice.isAvailable();
      return !!available; // Convert to boolean
    } catch (error) {
      console.warn("Voice recognition not available:", error);
      return false;
    }
  };

  // Request microphone permissions
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message:
              "This app needs access to your microphone for speech recognition",
            buttonPositive: "OK",
          }
        );
        const permissionGranted =
          granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasVoicePermission(permissionGranted);
        return permissionGranted;
      } catch (err) {
        console.warn("Microphone permission error:", err);
        return false;
      }
    }
    // For iOS, permissions are handled automatically by the system when Info.plist is configured
    setHasVoicePermission(true);
    return true;
  };

  // Start voice recording animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Stop voice recording animation
  const stopPulseAnimation = () => {
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Start voice recognition
  const startVoiceRecognition = async (): Promise<void> => {
    try {
      await Voice.start("en-US"); // You can change language as needed
      startPulseAnimation();
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      setIsListening(false);
      stopPulseAnimation();

      Alert.alert(
        "Voice Recognition Error",
        "Failed to start voice recognition. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Stop voice recognition
  const stopVoiceRecognition = async (): Promise<void> => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
    }
    setIsListening(false);
    stopPulseAnimation();
  };

  // Handle voice input toggle
  const handleVoiceInput = async () => {
    const isAvailable = await isVoiceRecognitionAvailable();

    if (!isAvailable) {
      Alert.alert(
        "Voice Recognition Unavailable",
        "Voice recognition is not available on this device. Using text input instead.",
        [
          {
            text: "OK",
            onPress: () => {
              // Fall back to text input
              Alert.prompt(
                "Text Input",
                "Enter your message:",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Add Text",
                    onPress: (text) => {
                      if (text && text.trim()) {
                        onTextChange(text.trim().substring(0, maxLength));
                      }
                    },
                  },
                ],
                "plain-text"
              );
            },
          },
        ]
      );
      return;
    }

    if (!hasVoicePermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Microphone permission is required for voice input."
        );
        return;
      }
    }

    if (isListening) {
      // Stop listening
      await stopVoiceRecognition();
      return;
    }

    // Start listening
    try {
      await startVoiceRecognition();
    } catch (error) {
      Alert.alert(
        "Voice Recognition Error",
        "Failed to start voice recognition. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleClearText = () => {
    setInternalText("");
    onTextChange("");
  };

  const handleTextChange = (text: string) => {
    setInternalText(text);
    onTextChange(text);
  };

  const styles = StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: isDark ? colors.gray[600] : colors.gray[300],
      borderRadius: 12,
      backgroundColor: isDark ? colors.gray[800] : colors.white,
      overflow: "hidden",
    },
    textInput: {
      padding: 16,
      fontSize: 16,
      color: isDark ? colors.white : colors.gray[900],
      minHeight: multiline ? 100 : 50,
      textAlignVertical: multiline ? "top" : "center",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? colors.gray[700] : colors.gray[50],
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.gray[600] : colors.gray[200],
    },
    actionButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    voiceButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary[500],
    },
    voiceButtonListening: {
      backgroundColor: colors.red[500],
    },
    clearButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDark ? colors.gray[600] : colors.gray[200],
    },
    characterCount: {
      fontSize: 12,
      color: isDark ? colors.gray[400] : colors.gray[500],
    },
    characterCountWarning: {
      color: colors.red[500],
    },
    statusText: {
      fontSize: 12,
      color: colors.primary[500],
      fontWeight: "500",
    },
    statusTextListening: {
      color: colors.red[500],
    },
  });

  const characterCount = internalText?.length || 0;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        value={internalText}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={isDark ? colors.gray[400] : colors.gray[500]}
        multiline={multiline}
        editable={editable && !isListening}
        maxLength={maxLength}
        textContentType="none"
        autoCorrect={true}
        spellCheck={true}
      />

      <View style={styles.footer}>
        <View style={styles.actionButtons}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isListening && styles.voiceButtonListening,
              ]}
              onPress={handleVoiceInput}
              disabled={!editable}
            >
              <Feather
                name={isListening ? "square" : "mic"}
                size={20}
                color={colors.white}
              />
            </TouchableOpacity>
          </Animated.View>

          {internalText && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearText}
              disabled={!editable || isListening}
            >
              <Feather
                name="x"
                size={16}
                color={isDark ? colors.white : colors.gray[600]}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ alignItems: "flex-end" }}>
          {isListening && (
            <Text style={[styles.statusText, styles.statusTextListening]}>
              🎤 Recording...
            </Text>
          )}
          <Text
            style={[
              styles.characterCount,
              isNearLimit && styles.characterCountWarning,
            ]}
          >
            {characterCount}/{maxLength}
          </Text>
        </View>
      </View>
    </View>
  );
}
