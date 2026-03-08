import { StyleSheet } from "react-native";
import { colors } from "../colors";

export const scanDevicesStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  connectionCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  connectionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  connectionTextContainer: {
    marginLeft: 16,
  },
  deviceName: {
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
  },
  itemDivider: {
    height: 1,
    opacity: 0.3,
  },
  buttonGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: colors.primary[500],
  },
  dataCard: {
    margin: 16,
    marginBottom: 8,
  },
  logCard: {
    margin: 16,
    marginTop: 8,
    flex: 1,
    elevation: 2,
  },
  logScrollView: {
    flex: 1,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 13,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  emptyLogText: {
    fontStyle: "italic",
    opacity: 0.7,
    textAlign: "center",
    paddingVertical: 20,
  },
  debugButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: colors.gray[800],
    padding: 8,
    borderRadius: 8,
    opacity: 0.8,
  },
  debugButtonText: {
    color: colors.white,
    fontSize: 12,
  },
  debugButtonContainer: {
    position: "absolute",
    bottom: 80,
    right: 20,
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    marginLeft: 4,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 12,
  },
});
