import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface BluetoothDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnectable?: boolean;
}

interface BluetoothDeviceSelectorProps {
  visible: boolean;
  onClose: () => void;
  devices: BluetoothDevice[];
  onSelectDevice: (device: BluetoothDevice) => Promise<boolean>;
  isScanning: boolean;
  onScanAgain: () => void;
  onUpdateDevices?: (devices: BluetoothDevice[]) => void;
  connectedDeviceId?: string | null;
  connectedDeviceName?: string | null;
  onDisconnect?: () => Promise<void>;
}

const BluetoothDeviceSelector: React.FC<BluetoothDeviceSelectorProps> = ({
  visible,
  onClose,
  devices,
  onSelectDevice,
  isScanning,
  onScanAgain,
  onUpdateDevices,
  connectedDeviceId,
  connectedDeviceName,
  onDisconnect,
}) => {
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null,
  );

  // Handle device selection with connecting feedback
  const handleDeviceSelect = async (device: BluetoothDevice) => {
    setConnectingDeviceId(device.id);
    try {
      const success = await onSelectDevice(device);
      if (success) {
        // Close modal on successful connection
        setTimeout(() => {
          setConnectingDeviceId(null);
          onClose();
        }, 500);
      } else {
        setConnectingDeviceId(null);
      }
    } catch (error) {
      setConnectingDeviceId(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select OBDII Device</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {connectedDeviceId && (
            <View style={styles.connectedBanner}>
              <View style={styles.connectedInfo}>
                <MaterialCommunityIcons
                  name="bluetooth-connect"
                  size={20}
                  color={colors.success[500]}
                />
                <Text style={styles.connectedText}>
                  Connected: {connectedDeviceName || "Device"}
                </Text>
              </View>
              {onDisconnect && (
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={onDisconnect}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isScanning && (
            <View style={styles.scanningBanner}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            </View>
          )}

          {devices.length > 0 ? (
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              style={styles.deviceList}
              renderItem={({ item }) => {
                const isConnecting = connectingDeviceId === item.id;
                const isConnected = connectedDeviceId === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.deviceItem,
                      isConnecting && styles.deviceItemConnecting,
                      isConnected && styles.deviceItemConnected,
                    ]}
                    onPress={() => handleDeviceSelect(item)}
                    disabled={isConnecting || isConnected}
                  >
                    <View style={styles.deviceInfo}>
                      <MaterialCommunityIcons
                        name="bluetooth"
                        size={24}
                        color={
                          isConnecting
                            ? colors.primary[300]
                            : colors.primary[500]
                        }
                      />
                      <View style={styles.deviceTextContainer}>
                        <Text style={styles.deviceName}>
                          {item.name || "Unnamed Device"}
                        </Text>
                        <Text style={styles.deviceId}>
                          {item.id.substring(0, 8)}...
                        </Text>
                        <View style={styles.signalContainer}>
                          <Text style={styles.deviceMeta}>Signal:</Text>
                          {/* Signal strength indicator */}
                          {[1, 2, 3, 4].map((bar) => (
                            <View
                              key={bar}
                              style={[
                                styles.signalBar,
                                {
                                  height: 3 + bar * 3,
                                  opacity:
                                    item.rssi > -100 + bar * 15 ? 1 : 0.2,
                                },
                              ]}
                            />
                          ))}
                          <Text style={styles.deviceMeta}>
                            {" "}
                            {item.rssi} dBm
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isConnecting ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary[500]}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#888"
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          ) : !isScanning ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="bluetooth-off"
                size={48}
                color="#888"
              />
              <Text style={styles.emptyText}>No OBDII devices found</Text>
              <Text style={styles.emptySubText}>
                Make sure your OBDII scanner is plugged into your vehicle,
                powered on, and in range
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.scanButton}
            onPress={onScanAgain}
            disabled={isScanning}
          >
            <MaterialCommunityIcons name="bluetooth" size={20} color="#fff" />
            <Text style={styles.scanButtonText}>
              {isScanning ? "Scanning..." : "Scan Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  deviceList: {
    maxHeight: 400,
  },
  deviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
  },
  deviceId: {
    fontSize: 12,
    color: "#666",
  },
  deviceMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  scanButton: {
    backgroundColor: colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  scanningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: colors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: colors.primary[700],
    fontWeight: "500",
  },
  signalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  signalBar: {
    width: 3,
    backgroundColor: colors.primary[500],
    marginRight: 2,
    borderRadius: 1,
  },
  deviceItemConnecting: {
    backgroundColor: "#f0f9ff",
    opacity: 0.8,
  },
  deviceItemConnected: {
    backgroundColor: colors.success[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.success[500],
  },
  connectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: colors.success[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.success[100],
  },
  connectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectedText: {
    fontSize: 14,
    color: colors.success[700],
    fontWeight: "500",
  },
  disconnectButton: {
    backgroundColor: colors.error[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default BluetoothDeviceSelector;
