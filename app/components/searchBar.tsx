import { View, StyleSheet, TextInput } from "react-native";
import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { useColorScheme } from "react-native";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  onClear: () => void;
}

export default function SearchBar({
  placeholder = "Search...",
  value = "",
  onSearch,
  onClear,
}: SearchBarProps) {
  const colorScheme = useColorScheme();

  const isDark = colorScheme === "dark";

  const handleChangeText = (text: string) => {
    if (text.length === 0) {
      onClear();
    } else {
      onSearch(text);
    }
  };

  const handleSubmitEditing = () => {
    // Search is already triggered by handleChangeText
    // This is kept for backwards compatibility if needed
  };

  return (
    <View
      style={[
        styles.searchInputContainer,
        isDark && styles.searchInputContainerDark,
      ]}
    >
      <Feather
        name="search"
        size={16}
        color={isDark ? colors.gray[400] : colors.gray[500]}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.input, isDark && styles.inputDark, { paddingLeft: 24 }]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? colors.gray[400] : colors.gray[500]}
        value={value}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType="search"
        autoCapitalize="none"
        keyboardType="email-address"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: colors.gray[900],
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: "left",
  },
  inputDark: {
    backgroundColor: colors.gray[800],
    color: colors.white,
    borderColor: colors.gray[700],
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  searchContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 16,
    gap: 8,
  },
  searchInputContainer: {
    flex: 0.73,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 8,
    minHeight: 40,
  },
  searchInputContainerDark: {
    backgroundColor: colors.gray[800],
    borderColor: colors.gray[700],
  },
  searchButton: {
    marginTop: 8,
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  searchButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
});
