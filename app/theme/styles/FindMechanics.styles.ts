import { StyleSheet } from "react-native";
import { colors } from "../colors";

export const styles = StyleSheet.create({
  topBar: {
    width: "100%",
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  topBarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,

  },
  availabilityBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  availabilityBadgeDark: {
    backgroundColor: colors.gray[800],
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.gray[500],
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  serviceBadge: {
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: "center",
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
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
  zipInputContainer: {
    flex: 0.3,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 8,
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
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
  searchInputContainerDark: {
    backgroundColor: colors.gray[800],
    borderColor: colors.gray[700],
  },
  zipInputContainerDark: {
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
  clearButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterButtonDark: {
    backgroundColor: colors.gray[800],
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.gray[900],
    marginLeft: 6,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortLabel: {
    fontSize: 14,
    color: colors.gray[600],
    marginRight: 8,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortButtonText: {
    fontSize: 14,
    color: colors.gray[900],
    marginRight: 4,
  },
  tabsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  tabsHeader: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  tabButtonDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  activeTabButton: {
    backgroundColor: colors.primary[500],
  },
  activeTabButtonDark: {
    backgroundColor: colors.primary[500],
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  activeTabButtonText: {
    color: colors.white,
  },
  mechanicsContainer: {
    marginTop: 16,
    gap: 16,
  },
  mapContainer: {
    height: 400,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 16,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapPlaceholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  mapPlaceholder: {
    color: colors.gray[500],
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  enableLocationButton: {
    marginTop: 8,
  },
  markerContainer: {
    alignItems: "center",
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerAvailable: {
    backgroundColor: colors.green[500],
  },
  markerBusy: {
    backgroundColor: colors.yellow[500],
  },
  callout: {
    width: 200,
    padding: 0,
  },
  calloutContent: {
    padding: 12,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 4,
  },
  calloutLocation: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 6,
  },
  calloutRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  calloutRatingText: {
    fontSize: 12,
    color: colors.gray[700],
    marginLeft: 4,
  },
  calloutPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary[500],
  },
  mechanicCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  mechanicCardContent: {
    padding: 16,
  },
  mechanicImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  placeholderImage: {
    backgroundColor: colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  mechanicInfo: {
    flex: 1,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 8,
  },
  mechanicHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: colors.gray[600],
    marginLeft: 4,
  },
  availabilityToday: {
    backgroundColor: colors.green[500],
    opacity: 0.15,
  },
  availabilityTomorrow: {
    backgroundColor: colors.yellow[500],
    opacity: 0.15,
  },
  availabilityTodayText: {
    color: colors.green[500],
  },
  availabilityTomorrowText: {
    color: colors.yellow[500],
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray[900],
  },
  availabilityTextDark: {
    color: colors.white,
  },
  serviceBadgeDark: {
    backgroundColor: colors.primary[900] + "30",
  },
  serviceText: {
    fontSize: 12,
    color: colors.primary[500],
  },
  detailsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: colors.gray[600],
    marginLeft: 4,
  },
  mechanicFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary[500],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: "center",
  },
  noResultsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[700],
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: "center",
  },
});
