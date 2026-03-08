"use strict";
/**
 * Import function triggers from their respective submodules:
Choose an email service (Gmail for testing, SendGrid/Mailgun for production) and follow the setup instructions above to enable actual email sending.## Next Steps---- Direct link to Firebase Console to review- Timestamp- List of documents submitted (✓/✗)- Insurance expiry date- User ID- User name and email- Business name**Body includes:****Subject:** New Mechanic Onboarding: [Business Name]  **To:** getmychanic@gmail.com  When a mechanic submits onboarding:## What Gets Sent---3. Check Firebase Console → Functions → Logs for the notification details2. Check Firebase Console → Firestore → `adminNotifications` collection1. Complete a mechanic onboarding in the app## Testing---```firebase deploy --only functions:onMechanicOnboardingnpm run buildcd functions```bashAfter setting up email (or to use the Firestore notification system):## Deploy the Function---   - Show in-app notifications to admin users   - Listen to `adminNotifications` collection3. **Create a Firestore trigger in your app:**   - Look for "MECHANIC ONBOARDING NOTIFICATION" entries   - Go to Firebase Console → Functions → Logs2. **Firebase Functions Logs:**   - Filter by: `type == "mechanic_onboarding"` and `read == false`   - Collection: `adminNotifications`1. **Firebase Console Firestore:**For now, you can monitor new mechanic onboardings through:## Current Workaround---Similar to SendGrid but with Mailgun SDK.### Option 3: Mailgun (Alternative, free tier: 5000 emails/month)4. **Update code** to use SendGrid (example provided in mechanicOnboarding.ts)   ```   firebase functions:config:set sendgrid.key="your-api-key"   ```bash3. **Set Firebase config:**   ```   npm install @sendgrid/mail   cd functions   ```bash2. **Install SendGrid:**   - Get your API key   - Create a free account   - Go to https://sendgrid.com/1. **Sign up at SendGrid:**### Option 2: SendGrid (Recommended for production, free tier: 100 emails/day)4. **Uncomment email sending code** in `mechanicOnboarding.ts`   ```   firebase functions:config:set gmail.email="getmychanic@gmail.com" gmail.password="your-app-password"   ```bash3. **Set Firebase config:**   - Copy the 16-character password   - Create an App Password for Gmail   - Enable 2-factor authentication   - Go to https://myaccount.google.com/security2. **Enable "Less secure app access" or create App Password:**   ```   npm install --save-dev @types/nodemailer   npm install nodemailer   cd functions   ```bash1. **Install nodemailer:**### Option 1: Gmail SMTP (Simplest for testing)## How to Enable Email Sending---4. ⚠️ **Email sending not yet configured** (see setup below)3. ✅ Creates an admin notification in Firestore (`adminNotifications` collection)2. ✅ Logs notification details to Firebase Functions logs1. ✅ Triggers when a new mechanic profile is created in Firestore### Current Behavior:A Firebase Cloud Function (`onMechanicOnboarding`) that triggers automatically when a mechanic submits their onboarding documents.## What's Implemented *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
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
exports.onMechanicOnboarding = exports.sendMileageReminders = exports.searchUsers = void 0;
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const searchUsers_1 = require("./searchUsers");
Object.defineProperty(exports, "searchUsers", { enumerable: true, get: function () { return searchUsers_1.searchUsers; } });
const mileageReminder_1 = require("./mileageReminder");
Object.defineProperty(exports, "sendMileageReminders", { enumerable: true, get: function () { return mileageReminder_1.sendMileageReminders; } });
const mechanicOnboarding_1 = require("./mechanicOnboarding");
Object.defineProperty(exports, "onMechanicOnboarding", { enumerable: true, get: function () { return mechanicOnboarding_1.onMechanicOnboarding; } });
// Initialize Firebase Admin
admin.initializeApp();
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onCall({maxInstances: 5}, (req, res) => {...})`.
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
//# sourceMappingURL=index.js.map