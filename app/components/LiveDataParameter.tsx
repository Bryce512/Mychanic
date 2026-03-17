import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface LiveDataParameterProps {
  label: string;
  value: string | number | null;
  unit: string;
  icon: string;
  color: string;
  isLarge?: boolean; // For primary display (larger cards)
}

export default function LiveDataParameter({
  label,
  value,
  unit,
  icon,
  color,
  isLarge = false,
}: LiveDataParameterProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue ? value : "0";

  if (isLarge) {
    // Large card format for primary parameters
    return (
      <View style={[styles.largeCard, isDark && styles.largeCardDark]}>
        <View style={styles.largeHeader}>
          <Feather name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.largeValue}>
          <Text style={[styles.largeValueText, isDark && styles.textLight]}>
            {displayValue}
          </Text>
          <Text style={[styles.largeUnitText, isDark && styles.textMuted]}>
            {unit}
          </Text>
        </View>
        <Text style={[styles.largeLabelText, isDark && styles.textMuted]}>
          {label}
        </Text>
      </View>
    );
  }

  // Compact row format for secondary parameters
  return (
    <View style={[styles.compactRow, isDark && styles.compactRowDark]}>
      <View style={styles.compactLeft}>
        <Feather name={icon as any} size={20} color={color} />
        <Text style={[styles.compactLabel, isDark && styles.textLight]}>
          {label}
        </Text>
      </View>
      <View style={styles.compactRight}>
        <Text
          style={[
            styles.compactValue,
            isDark && styles.textLight,
            !hasValue && styles.noValueText,
            !hasValue && isDark && styles.noValueTextDark,
          ]}
        >
          {displayValue}
        </Text>
        <Text style={[styles.compactUnit, isDark && styles.textMuted]}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Large card styles (for primary parameters)
  largeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  largeCardDark: {
    backgroundColor: colors.gray[800],
    borderColor: colors.gray[700],
  },
  largeHeader: {
    marginBottom: 8,
  },
  largeValue: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
    width: "100%",
    justifyContent: "center",
  },
  largeValueText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.gray[900],
    maxFontSizeMultiplier: 1,
    adjustsFontSizeToFit: true,
    numberOfLines: 1,
  },
  largeUnitText: {
    fontSize: 14,
    marginLeft: 4,
    color: colors.gray[600],
  },
  largeLabelText: {
    fontSize: 12,
    textAlign: "center",
    color: colors.gray[600],
  },

  // Compact row styles (for secondary parameters)
  compactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  compactRowDark: {
    backgroundColor: colors.gray[800],
  },
  compactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  compactLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.gray[900],
  },
  compactRight: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  compactValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  compactUnit: {
    fontSize: 14,
    marginLeft: 4,
    color: colors.gray[600],
  },

  // No value styling
  noValueText: {
    color: colors.gray[400],
    fontWeight: "400",
  },
  noValueTextDark: {
    color: colors.gray[500],
  },

  // Common text styles
  textLight: {
    color: colors.white,
  },
  textMuted: {
    color: colors.gray[400],
  },
});
