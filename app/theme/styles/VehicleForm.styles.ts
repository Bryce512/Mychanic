import { StyleSheet } from "react-native";
import { colors } from "../colors";

export const vehicleFormStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: colors.primary[500],
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.gray[100],
  },
  imageLabel: {
    marginTop: 8,
    color: colors.gray[500],
    fontSize: 14,
    textAlign: "center",
  },
  lookupSection: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: colors.primary[600],
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 16,
  },
  lookupGroup: {
    marginBottom: 16,
  },
  lookupLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.gray[900],
    fontWeight: "500",
  },
  lookupInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lookupButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  lookupButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    color: colors.gray[900],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: colors.gray[50],
    color: colors.gray[900],
  },
});
