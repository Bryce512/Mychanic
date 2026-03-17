import React from "react";
import { Modal, View, Text, ActivityIndicator } from "react-native";

interface ConnectionSpinnerProps {
  visible: boolean;
  message?: string;
  subtext?: string;
}

export const ConnectionSpinner: React.FC<ConnectionSpinnerProps> = ({
  visible,
  message = "Connecting to OBD-II Device...",
  subtext = "Please wait",
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
            width: "80%",
            maxWidth: 300,
          }}
        >
          <ActivityIndicator size="large" color="#0066cc" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {message}
          </Text>
          {subtext && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "#666",
                textAlign: "center",
              }}
            >
              {subtext}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};
