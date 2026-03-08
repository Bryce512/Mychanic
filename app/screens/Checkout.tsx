import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Button from "../components/Button";
import Card, { CardHeader, CardContent } from "../components/Card";
import { styles } from "../theme/styles/Checkout.styles";
import { colors } from "../theme/colors";
import { useTheme } from "../components/theme-provider";

interface CheckoutParams {
  jobId?: string;
  amount: number;
  description: string;
  mechanicName?: string;
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const params = route.params as CheckoutParams;

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | null>(
    null
  );

  const { amount, description, mechanicName } = params || {
    amount: 0,
    description: "Service Payment",
    mechanicName: "Mechanic",
  };

  // Initialize Square when component mounts
  useEffect(() => {
    const initializeSquare = async () => {
      try {
        const { SQIPCore } = await import(
          "react-native-square-in-app-payments"
        );
        await SQIPCore.setSquareApplicationId(
          process.env.EXPO_PUBLIC_SQUARE_APPLICATION_ID
        );
      } catch (error) {
        console.error("Square initialization failed:", error);
        Alert.alert("Error", "Payment system unavailable");
      }
    };

    initializeSquare();
  }, []);

  const handleCardPayment = async () => {
    setPaymentMethod("card");
    setIsProcessing(true);

    // Simulate payment processing
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert(
        "Payment Successful",
        `Your payment of $${amount.toFixed(
          2
        )} has been processed successfully!`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Payment Failed",
        "There was an error processing your payment. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashPayment = () => {
    setPaymentMethod("cash");
    Alert.alert(
      "Cash Payment Selected",
      `Please pay $${amount.toFixed(2)} directly to ${
        mechanicName || "your mechanic"
      }. Contact them to arrange payment.`,
      [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={24}
              color={themeColors.primary[500]}
            />
          </TouchableOpacity>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            Checkout
          </Text>
        </View>

        {/* Order Summary */}
        <Card style={styles.summaryCard}>
          <CardHeader>
            <Text
              style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
            >
              Order Summary
            </Text>
          </CardHeader>
          <CardContent>
            <View style={styles.summaryRow}>
              <Text
                style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}
              >
                Service
              </Text>
              <Text
                style={[styles.summaryValue, isDark && styles.summaryValueDark]}
              >
                {description}
              </Text>
            </View>
            {mechanicName && (
              <View style={styles.summaryRow}>
                <Text
                  style={[
                    styles.summaryLabel,
                    isDark && styles.summaryLabelDark,
                  ]}
                >
                  Mechanic
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    isDark && styles.summaryValueDark,
                  ]}
                >
                  {mechanicName}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text
                style={[styles.totalLabel, isDark && styles.totalLabelDark]}
              >
                Total
              </Text>
              <Text
                style={[styles.totalAmount, isDark && styles.totalAmountDark]}
              >
                {formatAmount(amount)}
              </Text>
            </View>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card style={styles.paymentCard}>
          <CardHeader>
            <Text
              style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}
            >
              Payment Method
            </Text>
          </CardHeader>
          <CardContent>
            {/* Card Payment */}
            <Button
              title="Pay with Card"
              onPress={handleCardPayment}
              loading={isProcessing}
              disabled={isProcessing}
              style={styles.paymentButton}
              icon={
                <Feather name="credit-card" size={20} color={colors.white} />
              }
            />

            {/* Cash Payment Option */}
            <TouchableOpacity
              style={styles.cashOption}
              onPress={handleCashPayment}
              disabled={isProcessing}
            >
              <Feather
                name="dollar-sign"
                size={20}
                color={themeColors.primary[500]}
              />
              <Text style={[styles.cashText, isDark && styles.cashTextDark]}>
                Pay with Cash (Contact mechanic directly)
              </Text>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card style={styles.securityCard}>
          <CardContent>
            <View style={styles.securityRow}>
              <Feather name="shield" size={20} color={themeColors.green[500]} />
              <Text
                style={[styles.securityText, isDark && styles.securityTextDark]}
              >
                Your payment information is secure and encrypted
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
