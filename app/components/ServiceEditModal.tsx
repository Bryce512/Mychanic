import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export interface ServiceEditField {
  key: string;
  label: string;
  date?: string;
  mileage?: string;
}

export interface ServiceEditModalProps {
  visible: boolean;
  title: string;
  type: "service" | "maintenance";
  fields: ServiceEditField[];
  onSave: (data: ServiceEditField[]) => Promise<void>;
  onCancel: () => void;
  maxMileage?: number;
}

const { height: screenHeight } = Dimensions.get("window");

const ServiceEditModal: React.FC<ServiceEditModalProps> = ({
  visible,
  title,
  type,
  fields,
  onSave,
  onCancel,
  maxMileage = Number.MAX_SAFE_INTEGER,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [editedFields, setEditedFields] = useState<ServiceEditField[]>([]);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const formatDate = (month: number, day: number, year: number) => {
    const monthStr = month.toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    return `${monthStr}/${dayStr}/${year}`;
  };

  const parseDate = (dateString: string) => {
    if (!dateString) {
      const now = new Date();
      return {
        month: now.getMonth() + 1,
        day: now.getDate(),
        year: now.getFullYear(),
      };
    }
    const parts = dateString.split("/");
    const month = parseInt(parts[0]) || 1;
    const day = parseInt(parts[1]) || 1;
    const year = parseInt(parts[2]) || new Date().getFullYear();
    return { month, day, year };
  };

  const validateMileageInput = (input: string): string => {
    const numValue = parseInt(input) || 0;
    if (numValue > maxMileage) {
      return (maxMileage - 1).toString();
    }
    return input;
  };

  useEffect(() => {
    if (visible) {
      setEditedFields(fields.map((f) => ({ ...f })));
    }
  }, [visible, fields]);

  const handleFieldChange = (
    index: number,
    field: "date" | "mileage",
    value: string
  ) => {
    const updated = [...editedFields];
    if (field === "date") {
      updated[index].date = value;
    } else {
      const validated = validateMileageInput(value);
      updated[index].mileage = validated;
    }
    setEditedFields(updated);
  };

  const openDatePicker = (fieldKey: string, currentDate: string) => {
    setShowDatePicker(fieldKey);
    const { month, day, year } = parseDate(currentDate);
    setSelectedMonth(month);
    setSelectedDay(day);
    setSelectedYear(year);
  };

  const handleDateConfirm = () => {
    if (showDatePicker) {
      const formattedDate = formatDate(
        selectedMonth,
        selectedDay,
        selectedYear
      );
      const index = editedFields.findIndex((f) => f.key === showDatePicker);
      if (index !== -1) {
        handleFieldChange(index, "date", formattedDate);
      }
      setShowDatePicker(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (type === "service") {
        for (const field of editedFields) {
          if (!field.date) {
            Alert.alert(
              "Validation Error",
              `Please select a date for ${field.label}.`
            );
            setSaving(false);
            return;
          }
        }
      }

      await onSave(editedFields);
      setSaving(false);
    } catch (error) {
      console.error("Error saving:", error);
      Alert.alert("Error", "Failed to save changes.");
      setSaving(false);
    }
  };

  const months = [
    { label: "January", value: 1 },
    { label: "February", value: 2 },
    { label: "March", value: 3 },
    { label: "April", value: 4 },
    { label: "May", value: 5 },
    { label: "June", value: 6 },
    { label: "July", value: 7 },
    { label: "August", value: 8 },
    { label: "September", value: 9 },
    { label: "October", value: 10 },
    { label: "November", value: 11 },
    { label: "December", value: 12 },
  ];

  const days = Array.from({ length: 31 }, (_, i) => ({
    label: (i + 1).toString(),
    value: i + 1,
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => ({
    label: (currentYear - i).toString(),
    value: currentYear - i,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={{ flex: 1 }}>
        {/* Tap outside to dismiss */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />

        {/* Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetContainer}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? "#000" : "#fff",
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Header with Buttons */}
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: isDark ? "#333" : "#eee" },
              ]}
            >
              <TouchableOpacity onPress={onCancel} disabled={saving}>
                <Text
                  style={[
                    styles.headerButton,
                    { color: saving ? "#ccc" : colors.primary[500] },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text
                style={[styles.sheetTitle, { color: isDark ? "#fff" : "#000" }]}
              >
                {title}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text
                  style={[
                    styles.headerButton,
                    {
                      color: saving ? "#ccc" : colors.primary[500],
                      fontWeight: "600",
                    },
                  ]}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {editedFields.map((field, index) => (
                <View key={field.key} style={styles.fieldSection}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: isDark ? "#ccc" : "#333" },
                    ]}
                  >
                    {field.label}
                  </Text>

                  {/* Date and Mileage on same row */}
                  {type === "service" &&
                    (field.date !== undefined ||
                      field.mileage !== undefined) && (
                      <View style={styles.fieldRow}>
                        {/* Date Input */}
                        {field.date !== undefined && (
                          <View
                            style={[
                              styles.formGroup,
                              { flex: 1, marginRight: 8 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.label,
                                { color: isDark ? "#aaa" : "#666" },
                              ]}
                            >
                              Date
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.inputField,
                                {
                                  borderColor: isDark ? "#444" : "#ddd",
                                  backgroundColor: isDark
                                    ? "#1a1a1a"
                                    : "#f9f9f9",
                                },
                              ]}
                              onPress={() =>
                                openDatePicker(field.key, field.date || "")
                              }
                            >
                              <Feather
                                name="calendar"
                                size={18}
                                color={isDark ? "#888" : "#999"}
                              />
                              <Text
                                style={[
                                  styles.inputText,
                                  {
                                    color: field.date
                                      ? isDark
                                        ? "#fff"
                                        : "#000"
                                      : isDark
                                      ? "#666"
                                      : "#999",
                                  },
                                ]}
                              >
                                {field.date || "Select Date"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Mileage Input */}
                        {field.mileage !== undefined && (
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text
                              style={[
                                styles.label,
                                { color: isDark ? "#aaa" : "#666" },
                              ]}
                            >
                              Mileage (miles)
                            </Text>
                            <View
                              style={[
                                styles.inputField,
                                {
                                  borderColor: isDark ? "#444" : "#ddd",
                                  backgroundColor: isDark
                                    ? "#1a1a1a"
                                    : "#f9f9f9",
                                },
                              ]}
                            >
                              <TextInput
                                style={[
                                  styles.inputText,
                                  { color: isDark ? "#fff" : "#000" },
                                ]}
                                placeholder="Enter mileage"
                                placeholderTextColor={isDark ? "#666" : "#999"}
                                keyboardType="number-pad"
                                value={field.mileage}
                                onChangeText={(text) =>
                                  handleFieldChange(index, "mileage", text)
                                }
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                  {/* Maintenance type - only mileage on its own line */}
                  {type === "maintenance" && field.mileage !== undefined && (
                    <View style={styles.formGroup}>
                      <Text
                        style={[
                          styles.label,
                          { color: isDark ? "#aaa" : "#666" },
                        ]}
                      >
                        Mileage (miles)
                      </Text>
                      <View
                        style={[
                          styles.inputField,
                          {
                            borderColor: isDark ? "#444" : "#ddd",
                            backgroundColor: isDark ? "#1a1a1a" : "#f9f9f9",
                          },
                        ]}
                      >
                        <TextInput
                          style={[
                            styles.inputText,
                            { color: isDark ? "#fff" : "#000" },
                          ]}
                          placeholder="Enter mileage"
                          placeholderTextColor={isDark ? "#666" : "#999"}
                          keyboardType="number-pad"
                          value={field.mileage}
                          onChangeText={(text) =>
                            handleFieldChange(index, "mileage", text)
                          }
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>

        {/* Date Picker Modal - Overlaid on top */}
        {showDatePicker !== null && (
          <View style={[styles.datePickerOverlay]}>
            <TouchableOpacity
              style={styles.datePickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowDatePicker(null)}
            />
            <View
              style={[
                styles.datePickerContainer,
                { backgroundColor: isDark ? "#1a1a1a" : "#fff" },
              ]}
            >
              <View
                style={[
                  styles.pickerHeader,
                  { borderBottomColor: isDark ? "#333" : "#eee" },
                ]}
              >
                <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                  <Text
                    style={[
                      styles.pickerHeaderButton,
                      { color: colors.primary[500] },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.pickerHeaderTitle,
                    { color: isDark ? "#fff" : "#000" },
                  ]}
                >
                  Select Date
                </Text>
                <TouchableOpacity onPress={handleDateConfirm}>
                  <Text
                    style={[
                      styles.pickerHeaderButton,
                      { color: colors.primary[500] },
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContent}>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  style={[styles.picker, { color: isDark ? "#fff" : "#000" }]}
                >
                  {months.map((m) => (
                    <Picker.Item
                      key={m.value}
                      label={m.label}
                      value={m.value}
                    />
                  ))}
                </Picker>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={setSelectedDay}
                  style={[styles.picker, { color: isDark ? "#fff" : "#000" }]}
                >
                  {days.map((d) => (
                    <Picker.Item
                      key={d.value}
                      label={d.label}
                      value={d.value}
                    />
                  ))}
                </Picker>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  style={[styles.picker, { color: isDark ? "#fff" : "#000" }]}
                >
                  {years.map((y) => (
                    <Picker.Item
                      key={y.value}
                      label={y.label}
                      value={y.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  container: {
    flex: 1,
  },
  sheetContainer: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    overflow: "hidden",
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    fontSize: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 8,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
  },
  datePickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  datePickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerHeaderButton: {
    fontSize: 14,
    fontWeight: "600",
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContent: {
    flexDirection: "row",
    height: 200,
  },
  picker: {
    flex: 1,
  },
});

export default ServiceEditModal;
