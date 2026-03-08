import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Cloud Function: Notify admin when mechanic submits onboarding
 * Triggered when new document is created in mechanics collection
 */
export const onMechanicOnboarding = onDocumentCreated(
  "mechanics/{mechanicId}",
  async (event) => {
    const mechanicId = event.params.mechanicId;
    const mechanicData = event.data?.data();

    if (!mechanicData) {
      console.log("No mechanic data found");
      return;
    }

    try {
      // Get contact info from mechanic profile
      let userEmail = mechanicData.email || "No email provided";
      let userName = mechanicData.name || "Unknown";
      let userPhone = mechanicData.phone || "Not provided";

      // Fallback: try users collection if not in profile
      if (userEmail === "No email provided") {
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(mechanicId)
          .get();

        const userData = userDoc.data();
        userEmail =
          userData?.profile?.email || userData?.email || "No email provided";
        userName = userData?.profile?.name || userData?.displayName || userName;
        userPhone =
          userData?.profile?.phone || userData?.phoneNumber || userPhone;
      }

      // Prepare email content
      const subject = `New Mechanic Onboarding: ${mechanicData.businessName}`;

      const insuranceCertStatus = mechanicData.documents?.insuranceCert
        ? "✓ Insurance Certificate"
        : "✗ Insurance Certificate (missing)";
      const licensStatus = mechanicData.documents?.driversLicense
        ? "✓ Driver's License"
        : "✗ Driver's License (missing)";
      const w9Status = mechanicData.documents?.w9
        ? "✓ W9 Tax Form"
        : "✗ W9 Tax Form (missing)";
      const businessRegStatus = mechanicData.documents?.businessReg
        ? "✓ Business Registration"
        : "✗ Business Registration (missing)";

      const consoleLink =
        "https://console.firebase.google.com/project/" +
        `${process.env.GCLOUD_PROJECT}/firestore/data/` +
        `mechanics/${mechanicId}`;

      const body = `
New mechanic has submitted onboarding documents for approval.

Mechanic Details:
- Business Name: ${mechanicData.businessName}
- User Name: ${userName}
- Email: ${userEmail}
- Phone: ${userPhone}
- User ID: ${mechanicId}
- Insurance Expiry: ${mechanicData.insuranceExpiry}
- Insurance Status: ${mechanicData.insuranceStatus}
- Onboarding Status: ${mechanicData.onboardingStatus || "pending"}
- Verified: ${mechanicData.verified}

Documents Submitted:
${insuranceCertStatus}
${licensStatus}
${w9Status}
${businessRegStatus}

Submitted at: ${new Date().toLocaleString()}

Action Required:
Review documents in Console & update onboarding status.
To approve: Update onboardingStatus to "approved" in both:
  - mechanics/${mechanicId} collection
  - users/${mechanicId}/profile/onboardingStatus

Firebase Console Link: ${consoleLink}
      `.trim();

      // Log the notification (for debugging)
      console.log("=== MECHANIC ONBOARDING NOTIFICATION ===");
      console.log("To: getmychanic@gmail.com");
      console.log("Subject:", subject);
      console.log("Body:\n", body);
      console.log("=========================================");

      // Create notification document in Firestore for admin
      await admin.firestore().collection("adminNotifications").add({
        type: "mechanic_onboarding",
        mechanicId: mechanicId,
        businessName: mechanicData.businessName,
        userName: userName,
        userEmail: userEmail,
        userPhone: userPhone,
        subject: subject,
        body: body,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // TODO: Integrate with actual email service
      // To send actual emails, you need to:
      // 1. Set up email service (SendGrid, Mailgun, etc.)
      // 2. Add API keys to Firebase Functions config
      // 3. Use the service SDK to send the email

      console.log("Admin notification created:", mechanicId);
    } catch (error) {
      console.error("Error in onboarding notification:", error);
    }
  },
);
