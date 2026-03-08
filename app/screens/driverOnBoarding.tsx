import React, { useState, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
} from "react-native";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import DocumentPicker from "react-native-document-picker";
import { AuthContext } from "../contexts/AuthContext";
import {
  uploadMechanicDocument,
  saveMechanicProfile,
} from "../services/firebaseService";

type DocumentType = "insurance" | "identity" | "tax" | "business";

interface UploadedDocument {
  uri: string;
  name: string;
  type: string;
  storagePath?: string;
}

interface Documents {
  insuranceCert?: UploadedDocument;
  driversLicense?: UploadedDocument;
  w9?: UploadedDocument;
  businessReg?: UploadedDocument;
}

export default function DriverOnboarding({ navigation }: any) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const [businessName, setBusinessName] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phoneNumber || "");
  const [documents, setDocuments] = useState<Documents>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Send documents via email
  const handleEmailDocuments = async () => {
    // Prepare email content
    const businessInfo = businessName.trim() ? businessName : "[Not provided]";
    const insuranceInfo = insuranceExpiry.trim()
      ? insuranceExpiry
      : "[Not provided]";
    const userEmail = user?.email || "[Not provided]";
    const userId = user?.uid || "[Not provided]";

    const emailSubject = encodeURIComponent(
      `Mechanic Onboarding Documents - ${businessInfo}`,
    );

    const emailBody = encodeURIComponent(
      `Hello Mychanic Team,\n\n` +
        `I am submitting my mechanic onboarding documents.\n\n` +
        `Business Name: ${businessInfo}\n` +
        `Insurance Expiry: ${insuranceInfo}\n` +
        `User ID: ${userId}\n` +
        `Email: ${userEmail}\n\n` +
        `Please find the following documents attached:\n` +
        `1. Insurance Certificate\n` +
        `2. Driver's License\n` +
        `3. W9 Tax Form\n` +
        `4. Business Registration (if available)\n\n` +
        `Best regards`,
    );

    const mailtoUrl = `mailto:getmychanic@gmail.com?subject=${emailSubject}&body=${emailBody}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          "Email Not Available",
          "Please send your documents to: getmychanic@gmail.com",
        );
      }
    } catch (error) {
      console.error("Error opening email:", error);
      Alert.alert(
        "Error",
        "Could not open email client. Please manually send documents to getmychanic@gmail.com",
      );
    }
  };

  // Pick a photo from gallery
  const pickPhotoFromLibrary = async (
    documentType: keyof Documents,
    label: string,
  ) => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.5, // Reduced quality for faster uploads
        maxWidth: 1920,
        maxHeight: 1920,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log("Photo picked:", {
          uri: asset.uri,
          fileName: asset.fileName,
          type: asset.type,
        });

        setDocuments((prev) => ({
          ...prev,
          [documentType]: {
            uri: asset.uri!,
            name: asset.fileName || `${documentType}_${Date.now()}.jpg`,
            type: asset.type || "image/jpeg",
          },
        }));
      }
    } catch (error) {
      console.error("Error picking photo:", error);
      Alert.alert("Error", `Failed to pick photo`);
    }
  };

  // Pick a file (PDF or image file)
  const pickFile = async (documentType: keyof Documents, label: string) => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        copyTo: "documentDirectory",
      });

      if (result && result[0]) {
        const doc = result[0];
        // Use the copied file path if available (better for iOS)
        const fileUri = doc.fileCopyUri || doc.uri;

        console.log("File picked:", {
          uri: fileUri,
          name: doc.name,
          type: doc.type,
        });

        setDocuments((prev) => ({
          ...prev,
          [documentType]: {
            uri: fileUri,
            name: doc.name || `${documentType}_${Date.now()}.pdf`,
            type: doc.type || "application/pdf",
          },
        }));
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error("Error picking file:", error);
        Alert.alert("Error", `Failed to pick ${label}`);
      }
    }
  };

  // Show choice dialog: Photo or File
  const pickDocument = async (documentType: keyof Documents, label: string) => {
    Alert.alert(
      "Upload " + label,
      "Choose an option:",
      [
        {
          text: "Take/Select Photo",
          onPress: () => pickPhotoFromLibrary(documentType, label),
        },
        {
          text: "Select File (PDF/Image)",
          onPress: () => pickFile(documentType, label),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  // Upload all documents and save profile
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to complete onboarding");
      return;
    }

    if (!businessName.trim()) {
      Alert.alert("Required", "Please enter your business name");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Required", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name");
      return;
    }

    if (!insuranceExpiry) {
      Alert.alert("Required", "Please enter insurance expiry date");
      return;
    }

    const requiredDocs = [
      { key: "insuranceCert", label: "Insurance Certificate" },
      { key: "driversLicense", label: "Driver's License" },
      { key: "w9", label: "W9 Form" },
    ];

    for (const doc of requiredDocs) {
      if (!documents[doc.key as keyof Documents]) {
        Alert.alert("Required", `Please upload ${doc.label}`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress("Uploading documents...");

    try {
      const uploadedPaths: any = {};

      // Upload Insurance Certificate
      if (documents.insuranceCert) {
        setUploadProgress("Uploading insurance certificate...");
        const path = await uploadMechanicDocument(
          user.uid,
          "insurance",
          documents.insuranceCert.uri,
          documents.insuranceCert.name,
        );
        uploadedPaths.insuranceCert = path;
      }

      // Upload Driver's License
      if (documents.driversLicense) {
        setUploadProgress("Uploading driver's license...");
        const path = await uploadMechanicDocument(
          user.uid,
          "identity",
          documents.driversLicense.uri,
          documents.driversLicense.name,
        );
        uploadedPaths.driversLicense = path;
      }

      // Upload W9
      if (documents.w9) {
        setUploadProgress("Uploading W9 form...");
        const path = await uploadMechanicDocument(
          user.uid,
          "tax",
          documents.w9.uri,
          documents.w9.name,
        );
        uploadedPaths.w9 = path;
      }

      // Upload Business Registration (optional)
      if (documents.businessReg) {
        setUploadProgress("Uploading business registration...");
        const path = await uploadMechanicDocument(
          user.uid,
          "business",
          documents.businessReg.uri,
          documents.businessReg.name,
        );
        uploadedPaths.businessReg = path;
      }

      // Save mechanic profile
      setUploadProgress("Saving profile...");
      await saveMechanicProfile(user.uid, {
        businessName,
        insuranceExpiry,
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
        documents: uploadedPaths,
      });

      Alert.alert(
        "Success",
        "Your documents have been uploaded successfully. Your profile will be reviewed shortly.",
        [
          {
            text: "OK",
            onPress: () => navigation.replace("MechanicDashboard"),
          },
        ],
      );
    } catch (error) {
      console.error("Error uploading documents:", error);
      Alert.alert("Error", "Failed to upload documents. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const DocumentUploadButton = ({
    label,
    documentKey,
    uploaded,
    onPress,
  }: {
    label: string;
    documentKey: keyof Documents;
    uploaded: boolean;
    onPress: () => void;
  }) => (
    <View style={styles.documentButton}>
      <TouchableOpacity
        style={[styles.uploadButton, uploaded && styles.uploadButtonSuccess]}
        onPress={onPress}
        disabled={isUploading}
      >
        <Text style={styles.uploadButtonText}>
          {uploaded ? "✓ " : "📄 "}
          {label}
        </Text>
        <Text style={styles.uploadButtonSub}>
          {uploaded ? documents[documentKey]?.name : "Tap to upload"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mechanic Onboarding</Text>
        <Text style={styles.subtitle}>
          Complete your profile and upload required documents
        </Text>

        {/* Required Documents List */}
        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>📋 Required Documents</Text>
          <Text style={styles.requirementText}>
            1. Insurance Certificate (Photo or PDF)
          </Text>
          <Text style={styles.requirementText}>
            2. Driver's License (Photo)
          </Text>
          <Text style={styles.requirementText}>
            3. W9 Tax Form (Photo or PDF)
          </Text>
          <Text style={styles.requirementText}>
            4. Business Registration (Photo or PDF - Optional)
          </Text>
        </View>

        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your business name"
              value={businessName}
              onChangeText={setBusinessName}
              editable={!isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Insurance Expiry Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={insuranceExpiry}
              onChangeText={setInsuranceExpiry}
              editable={!isUploading}
            />
            <Text style={styles.helperText}>
              Format: 2027-04-01 (YYYY-MM-DD)
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              editable={!isUploading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              We'll send approval notifications to this address
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              editable={!isUploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              editable={!isUploading}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Email Option */}
        <TouchableOpacity
          style={styles.emailButton}
          onPress={handleEmailDocuments}
        >
          <Text style={styles.emailButtonText}>📧 Email Documents</Text>
          <Text style={styles.emailButtonSubtext}>
            Prefer to email? Send documents to getmychanic@gmail.com
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR UPLOAD DIRECTLY</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Document Uploads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>

          <DocumentUploadButton
            label="Insurance Certificate"
            documentKey="insuranceCert"
            uploaded={!!documents.insuranceCert}
            onPress={() =>
              pickDocument("insuranceCert", "Insurance Certificate")
            }
          />

          <DocumentUploadButton
            label="Driver's License"
            documentKey="driversLicense"
            uploaded={!!documents.driversLicense}
            onPress={() => pickDocument("driversLicense", "Driver's License")}
          />

          <DocumentUploadButton
            label="W9 Tax Form"
            documentKey="w9"
            uploaded={!!documents.w9}
            onPress={() => pickDocument("w9", "W9 Form")}
          />

          <Text style={styles.sectionTitle}>Optional Documents</Text>

          <DocumentUploadButton
            label="Business Registration"
            documentKey="businessReg"
            uploaded={!!documents.businessReg}
            onPress={() => pickDocument("businessReg", "Business Registration")}
          />
        </View>

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isUploading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isUploading}
        >
          <Text style={styles.submitButtonText}>
            {isUploading ? "Uploading..." : "Submit for Review"}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            All documents will be securely stored and reviewed by our team. You
            will be notified once your profile is verified.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  documentButton: {
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  uploadButtonSuccess: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4caf50",
    borderStyle: "solid",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  uploadButtonSub: {
    fontSize: 12,
    color: "#666",
  },
  progressContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
  },
  progressText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: "#1976d2",
    lineHeight: 20,
  },
  requirementsBox: {
    backgroundColor: "#fff3cd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#856404",
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 6,
    paddingLeft: 8,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#999",
    fontWeight: "600",
  },
  emailButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  emailButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  emailButtonSubtext: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
  },
});
