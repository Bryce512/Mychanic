import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "./theme-provider";
import { colors } from "../theme/colors";

interface PricingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PricingModal({ visible, onClose }: PricingModalProps) {
  const { isDark } = useTheme();
  const screenHeight = Dimensions.get("window").height;
  const modalHeight = screenHeight * 0.8;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.modalContent, isDark && styles.modalContentDark, { height: modalHeight }]}
        >
          <View style={[styles.header, isDark && styles.headerDark]}>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              Pricing Guide
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather
                name="x"
                size={24}
                color={isDark ? colors.white : colors.gray[900]}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={[styles.scrollContent, { flex: 1 }]}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
          >
            <View>
            <Text style={[styles.intro, isDark && styles.introDark]}>
              Our transparent pricing ensures you know exactly what to expect.
              All prices include parts and labor.
            </Text>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
              >
                Common Services
              </Text>

              <View style={styles.pricingItem}>
                <View style={styles.serviceInfo}>
                  <Text
                    style={[
                      styles.serviceName,
                      isDark && styles.serviceNameDark,
                    ]}
                  >
                    Oil Change
                  </Text>
                  <Text
                    style={[
                      styles.serviceDesc,
                      isDark && styles.serviceDescDark,
                    ]}
                  >
                    Full synthetic oil change with filter
                  </Text>
                </View>
                <Text style={[styles.price, isDark && styles.priceDark]}>
                  $45 - $85
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={styles.serviceInfo}>
                  <Text
                    style={[
                      styles.serviceName,
                      isDark && styles.serviceNameDark,
                    ]}
                  >
                    Brake Pad Replacement
                  </Text>
                  <Text
                    style={[
                      styles.serviceDesc,
                      isDark && styles.serviceDescDark,
                    ]}
                  >
                    Front or rear brake pads (per axle)
                  </Text>
                </View>
                <Text style={[styles.price, isDark && styles.priceDark]}>
                  $120 - $250
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={styles.serviceInfo}>
                  <Text
                    style={[
                      styles.serviceName,
                      isDark && styles.serviceNameDark,
                    ]}
                  >
                    Battery Replacement
                  </Text>
                  <Text
                    style={[
                      styles.serviceDesc,
                      isDark && styles.serviceDescDark,
                    ]}
                  >
                    Standard battery replacement
                  </Text>
                </View>
                <Text style={[styles.price, isDark && styles.priceDark]}>
                  $100 - $200
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={styles.serviceInfo}>
                  <Text
                    style={[
                      styles.serviceName,
                      isDark && styles.serviceNameDark,
                    ]}
                  >
                    Tire Rotation
                  </Text>
                  <Text
                    style={[
                      styles.serviceDesc,
                      isDark && styles.serviceDescDark,
                    ]}
                  >
                    Complete tire rotation service
                  </Text>
                </View>
                <Text style={[styles.price, isDark && styles.priceDark]}>
                  $25 - $45
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <View style={styles.serviceInfo}>
                  <Text
                    style={[
                      styles.serviceName,
                      isDark && styles.serviceNameDark,
                    ]}
                  >
                    Diagnostic Scan
                  </Text>
                  <Text
                    style={[
                      styles.serviceDesc,
                      isDark && styles.serviceDescDark,
                    ]}
                  >
                    Full system diagnostic scan
                  </Text>
                </View>
                <Text style={[styles.price, isDark && styles.priceDark]}>
                  $80 - $120
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
              >
                What Our Pricing Includes
              </Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Feather
                    name="check"
                    size={16}
                    color={colors.primary[500]}
                    style={styles.bulletIcon}
                  />
                  <Text
                    style={[styles.bulletText, isDark && styles.bulletTextDark]}
                  >
                    All parts and materials
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Feather
                    name="check"
                    size={16}
                    color={colors.primary[500]}
                    style={styles.bulletIcon}
                  />
                  <Text
                    style={[styles.bulletText, isDark && styles.bulletTextDark]}
                  >
                    Professional labor
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Feather
                    name="check"
                    size={16}
                    color={colors.primary[500]}
                    style={styles.bulletIcon}
                  />
                  <Text
                    style={[styles.bulletText, isDark && styles.bulletTextDark]}
                  >
                    12-month/12,000-mile warranty on repairs
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Feather
                    name="check"
                    size={16}
                    color={colors.primary[500]}
                    style={styles.bulletIcon}
                  />
                  <Text
                    style={[styles.bulletText, isDark && styles.bulletTextDark]}
                  >
                    No hidden fees or surprise charges
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Feather
                    name="check"
                    size={16}
                    color={colors.primary[500]}
                    style={styles.bulletIcon}
                  />
                  <Text
                    style={[styles.bulletText, isDark && styles.bulletTextDark]}
                  >
                    Free multi-point vehicle inspection
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
              >
                Additional Notes
              </Text>
              <Text style={[styles.note, isDark && styles.noteDark]}>
                • Prices may vary based on vehicle make, model, and location
                {"\n"}• Emergency services available 24/7{"\n"}• Senior and
                military discounts available{"\n"}• All mechanics are licensed
                and insured
              </Text>
            </View>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  modalContentDark: {
    backgroundColor: colors.gray[900],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerDark: {
    borderBottomColor: colors.gray[700],
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  titleDark: {
    color: colors.white,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  intro: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 24,
    lineHeight: 20,
  },
  introDark: {
    color: colors.gray[400],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[900],
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: colors.white,
  },
  pricingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
    marginBottom: 2,
  },
  serviceNameDark: {
    color: colors.white,
  },
  serviceDesc: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 18,
  },
  serviceDescDark: {
    color: colors.gray[400],
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary[600],
  },
  priceDark: {
    color: colors.primary[400],
  },
  bulletList: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  bulletIcon: {
    marginRight: 12,
  },
  bulletText: {
    fontSize: 14,
    color: colors.gray[700],
    flex: 1,
  },
  bulletTextDark: {
    color: colors.gray[300],
  },
  note: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  noteDark: {
    color: colors.gray[400],
  },
  pricingGuideContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  pricingIcon: {
    marginRight: 6,
  },
  pricingGuideText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: "500",
  },
  pricingGuideTextDark: {
    color: colors.primary[400],
  },
});

export { styles as pricingModalStyles };