/**
 * Import function triggers from their respective submodules:
Choose an email service (Gmail for testing, SendGrid/Mailgun for production) and follow the setup instructions above to enable actual email sending.## Next Steps---- Direct link to Firebase Console to review- Timestamp- List of documents submitted (✓/✗)- Insurance expiry date- User ID- User name and email- Business name**Body includes:****Subject:** New Mechanic Onboarding: [Business Name]  **To:** getmychanic@gmail.com  When a mechanic submits onboarding:## What Gets Sent---3. Check Firebase Console → Functions → Logs for the notification details2. Check Firebase Console → Firestore → `adminNotifications` collection1. Complete a mechanic onboarding in the app## Testing---```firebase deploy --only functions:onMechanicOnboardingnpm run buildcd functions```bashAfter setting up email (or to use the Firestore notification system):## Deploy the Function---   - Show in-app notifications to admin users   - Listen to `adminNotifications` collection3. **Create a Firestore trigger in your app:**   - Look for "MECHANIC ONBOARDING NOTIFICATION" entries   - Go to Firebase Console → Functions → Logs2. **Firebase Functions Logs:**   - Filter by: `type == "mechanic_onboarding"` and `read == false`   - Collection: `adminNotifications`1. **Firebase Console Firestore:**For now, you can monitor new mechanic onboardings through:## Current Workaround---Similar to SendGrid but with Mailgun SDK.### Option 3: Mailgun (Alternative, free tier: 5000 emails/month)4. **Update code** to use SendGrid (example provided in mechanicOnboarding.ts)   ```   firebase functions:config:set sendgrid.key="your-api-key"   ```bash3. **Set Firebase config:**   ```   npm install @sendgrid/mail   cd functions   ```bash2. **Install SendGrid:**   - Get your API key   - Create a free account   - Go to https://sendgrid.com/1. **Sign up at SendGrid:**### Option 2: SendGrid (Recommended for production, free tier: 100 emails/day)4. **Uncomment email sending code** in `mechanicOnboarding.ts`   ```   firebase functions:config:set gmail.email="getmychanic@gmail.com" gmail.password="your-app-password"   ```bash3. **Set Firebase config:**   - Copy the 16-character password   - Create an App Password for Gmail   - Enable 2-factor authentication   - Go to https://myaccount.google.com/security2. **Enable "Less secure app access" or create App Password:**   ```   npm install --save-dev @types/nodemailer   npm install nodemailer   cd functions   ```bash1. **Install nodemailer:**### Option 1: Gmail SMTP (Simplest for testing)## How to Enable Email Sending---4. ⚠️ **Email sending not yet configured** (see setup below)3. ✅ Creates an admin notification in Firestore (`adminNotifications` collection)2. ✅ Logs notification details to Firebase Functions logs1. ✅ Triggers when a new mechanic profile is created in Firestore### Current Behavior:A Firebase Cloud Function (`onMechanicOnboarding`) that triggers automatically when a mechanic submits their onboarding documents.## What's Implemented *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import * as admin from "firebase-admin";
import { searchUsers } from "./searchUsers";
import { sendMileageReminders } from "./mileageReminder";
import { onMechanicOnboarding } from "./mechanicOnboarding";

// Initialize Firebase Admin
admin.initializeApp();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onCall({maxInstances: 5}, (req, res) => {...})`.
setGlobalOptions({ maxInstances: 10 });

// Export cloud functions
export { searchUsers, sendMileageReminders, onMechanicOnboarding };
