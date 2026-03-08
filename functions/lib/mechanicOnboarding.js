"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMechanicOnboarding = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Cloud Function: Notify admin when mechanic submits onboarding
 * Triggered when new document is created in mechanics collection
 */
exports.onMechanicOnboarding = (0, firestore_1.onDocumentCreated)("mechanics/{mechanicId}", async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const mechanicId = event.params.mechanicId;
    const mechanicData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
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
            userEmail = ((_b = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _b === void 0 ? void 0 : _b.email) ||
                (userData === null || userData === void 0 ? void 0 : userData.email) ||
                "No email provided";
            userName = ((_c = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _c === void 0 ? void 0 : _c.name) ||
                (userData === null || userData === void 0 ? void 0 : userData.displayName) ||
                userName;
            userPhone = ((_d = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _d === void 0 ? void 0 : _d.phone) ||
                (userData === null || userData === void 0 ? void 0 : userData.phoneNumber) ||
                userPhone;
        }
        // Prepare email content
        const subject = `New Mechanic Onboarding: ${mechanicData.businessName}`;
        const insuranceCertStatus = ((_e = mechanicData.documents) === null || _e === void 0 ? void 0 : _e.insuranceCert) ?
            "✓ Insurance Certificate" :
            "✗ Insurance Certificate (missing)";
        const licensStatus = ((_f = mechanicData.documents) === null || _f === void 0 ? void 0 : _f.driversLicense) ?
            "✓ Driver's License" :
            "✗ Driver's License (missing)";
        const w9Status = ((_g = mechanicData.documents) === null || _g === void 0 ? void 0 : _g.w9) ?
            "✓ W9 Tax Form" :
            "✗ W9 Tax Form (missing)";
        const businessRegStatus = ((_h = mechanicData.documents) === null || _h === void 0 ? void 0 : _h.businessReg) ?
            "✓ Business Registration" :
            "✗ Business Registration (missing)";
        const consoleLink = "https://console.firebase.google.com/project/" +
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
    }
    catch (error) {
        console.error("Error in onboarding notification:", error);
    }
});
//# sourceMappingURL=mechanicOnboarding.js.map