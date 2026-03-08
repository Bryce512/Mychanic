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
  onSelectDevice: (device: BluetoothDevice) => void;
  isScanning: boolean;
  onScanAgain: () => void;
  onUpdateDevices?: (devices: BluetoothDevice[]) => void; // Add this prop
}

const BluetoothDeviceSelector: React.FC<BluetoothDeviceSelectorProps> = ({
  visible,
  onClose,
  devices,
  onSelectDevice,
  isScanning,
  onScanAgain,
  onUpdateDevices,
}) => {
  // Add state for showing all devices
  const [showAllDevices, setShowAllDevices] = useState(false);

  // Example of how the BluetoothDeviceSelector component should handle device selection
  const handleDeviceSelect = (device: BluetoothDevice) => {
    // logMessage(`Selected device: ${device.name || "Unnamed"} (${device.id})`);
    onSelectDevice(device); // This calls connectToDevice with the device object
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
            <Text style={styles.modalTitle}>Select a device</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.filterToggle}
                onPress={() => setShowAllDevices(!showAllDevices)}
              >
                <Text style={styles.filterText}>
                  {showAllDevices ? "Show Named Only" : "Show All"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {isScanning ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            </View>
          ) : (
            <>
              {devices.length > 0 ? (
                <FlatList
                  data={devices.filter((device) =>
                    showAllDevices ? true : device.name,
                  )}
                  keyExtractor={(item) => item.id}
                  style={styles.deviceList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.deviceItem}
                      onPress={() => handleDeviceSelect(item)}
                    >
                      <View style={styles.deviceInfo}>
                        <MaterialCommunityIcons
                          name="bluetooth"
                          size={24}
                          color={colors.primary[500]}
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
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#888"
                      />
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="bluetooth-off"
                    size={48}
                    color="#888"
                  />
                  <Text style={styles.emptyText}>No devices found</Text>
                  <Text style={styles.emptySubText}>
                    Make sure your Bluetooth device is powered on and in range
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.scanButton} onPress={onScanAgain}>
                <MaterialCommunityIcons
                  name="bluetooth"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.scanButtonText}>Scan Again</Text>
              </TouchableOpacity>
            </>
          )}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
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
  scanningText: {
    marginTop: 16,
    fontSize: 16,
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
  filterToggle: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    color: "#333",
  },
});

export default BluetoothDeviceSelector;
