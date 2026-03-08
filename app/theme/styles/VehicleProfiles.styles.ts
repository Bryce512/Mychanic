import { StyleSheet } from "react-native";
import { colors } from "../colors";

export const vehicleProfileStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  vehicleListContainer: {
    paddingBottom: 16,
  },
  vehicleCard: {
    width: 250,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    padding: 16,
    marginRight: 16,
  },
  vehicleCardDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  selectedVehicleCard: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  selectedVehicleCardDark: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[900] + "30", // 30% opacity
  },
  vehicleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  connectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  connectedBadge: {
    backgroundColor: colors.green[500] + "20", // 20% opacity
  },
  notConnectedBadge: {
    backgroundColor: colors.gray[200],
  },
  connectionBadgeDark: {
    backgroundColor: colors.gray[700],
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.green[500],
  },
  notConnectedText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray[600],
  },
  vehicleImage: {
    width: "100%",
    height: 100,
    marginBottom: 12,
  },
  vehicleStatus: {
    gap: 8,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  statusValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusGood: {
    color: colors.green[500],
  },
  statusFair: {
    color: colors.yellow[500],
  },
  statusPoor: {
    color: colors.red[500],
  },
  statusUnknown: {
    color: colors.gray[500],
  },
  progressBarContainer: {
    height: 16,
    backgroundColor: colors.gray[200],
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  progressBarContainerDark: {
    backgroundColor: colors.gray[700],
  },
  progressBar: {
    height: "100%",
    borderRadius: 12,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressBarText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.white,
    textAlign: "center",
  },
  progressBarTextDark: {
    color: colors.gray[900],
  },
  progressGood: {
    backgroundColor: colors.green[500],
  },
  progressFair: {
    backgroundColor: colors.yellow[500],
  },
  progressPoor: {
    backgroundColor: colors.red[500],
  },
  progressUnknown: {
    backgroundColor: colors.gray[400],
  },
  vehicleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  syncText: {
    fontSize: 10,
    color: colors.gray[500],
  },
  alertInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  alertText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.yellow[500],
  },
  addVehicleCard: {
    width: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  addVehicleCardDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  addVehicleText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[600],
    textAlign: "center",
  },
  detailsCard: {
    marginTop: 16,
  },
  detailsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  detailsMileage: {
    fontSize: 14,
    color: colors.gray[600],
  },
  detailsActions: {
    flexDirection: "row",
    gap: 8,
  },
  detailsCardContent: {
    gap: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.gray[900],
    marginTop: 12,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: "center",
  },
  alertCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: colors.yellow[500] + "10", // 10% opacity
    borderWidth: 1,
    borderColor: colors.yellow[500] + "30", // 30% opacity
    borderRadius: 8,
    gap: 12,
    alignItems: "flex-start",
  },
  alertCardDark: {
    backgroundColor: colors.yellow[500] + "20", // 20% opacity
  },
  alertCardContent: {
    flex: 1,
    gap: 8,
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[900],
  },
  alertCardText: {
    fontSize: 12,
    color: colors.gray[600],
  },
  alertCardButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  infoCards: {
    flexDirection: "row",
    gap: 16,
  },
  infoCard: {
    flex: 1,
  },
  infoCardHeader: {
    paddingBottom: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray[900],
  },
  serviceInfo: {
    gap: 12,
  },
  serviceItem: {
    gap: 4,
  },
  serviceLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  serviceDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serviceText: {
    fontSize: 12,
    color: colors.gray[900],
  },
  scheduleButton: {
    marginTop: 8,
  },
  diagnosticsCard: {
    marginTop: 8,
  },
  diagnosticsCardHeader: {
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diagnosticsTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
  },
  diagnosticsGrid: {
    gap: 12,
  },
  diagnosticItem: {
    width: "48%",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  diagnosticItemDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  diagnosticLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 4,
  },
  diagnosticValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  diagnosticText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray[900],
  },
  viewDetailsButton: {
    alignSelf: "center",
  },
  diagnosticsButtonContainer: {
    marginTop: 16,
    alignItems: "center",
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray[900],
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray[900],
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
