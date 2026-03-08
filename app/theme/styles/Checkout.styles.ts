import { StyleSheet } from "react-native";
import { colors } from "../colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  titleDark: {
    color: colors.white,
  },
  summaryCard: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[900],
  },
  sectionTitleDark: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.gray[600],
  },
  summaryLabelDark: {
    color: colors.gray[300],
  },
  summaryValue: {
    fontSize: 16,
    color: colors.gray[900],
    fontWeight: "500",
  },
  summaryValueDark: {
    color: colors.white,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[900],
  },
  totalLabelDark: {
    color: colors.white,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary[500],
  },
  totalAmountDark: {
    color: colors.primary[400],
  },
  paymentCard: {
    margin: 20,
    marginTop: 0,
  },
  paymentButton: {
    marginBottom: 12,
  },
  cardButton: {
    marginBottom: 16,
    borderColor: colors.primary[500],
  },
  cashOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cashText: {
    fontSize: 16,
    color: colors.primary[500],
    marginLeft: 12,
    fontWeight: "500",
  },
  cashTextDark: {
    color: colors.primary[400],
  },
  securityCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: colors.gray[100],
    borderColor: colors.green[500],
    borderWidth: 1,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  securityText: {
    fontSize: 14,
    color: colors.green[500],
    marginLeft: 12,
    flex: 1,
  },
  securityTextDark: {
    color: colors.green[500],
  },
});
