# Mechanic Onboarding Implementation

## Summary

Implemented a complete mechanic onboarding system with document upload functionality and status-based workflow.

## Onboarding Status System

The system uses a status field to track the application state throughout the review process.

### Status Values

| Status         | Description                             | User Experience                                  | Admin Action            |
| -------------- | --------------------------------------- | ------------------------------------------------ | ----------------------- |
| **incomplete** | Default state, documents not submitted  | Yellow badge: "Complete Onboarding" - clickable  | N/A                     |
| **pending**    | Documents submitted, awaiting review    | Blue badge: "Pending Review" - not clickable     | Review & approve/reject |
| **approved**   | Application approved, mechanic verified | No badge shown - full access                     | Can revoke if needed    |
| **rejected**   | Application rejected                    | Red badge: "Application Rejected" - shows reason | Can update status       |

### Status Badge Display (Profile Screen)

The Profile screen shows different badges based on onboarding status:

- 🟡 **Yellow** (Incomplete) - Prompts mechanic to complete onboarding
- 🔵 **Blue** (Pending) - Informs mechanic their application is under review
- 🔴 **Red** (Rejected) - Shows rejection (contact admin for details)
- ✅ **None** (Approved) - Normal profile display

## Features Implemented

### 1. Firebase Storage Upload Functions

**File:** `app/services/firebaseService.ts`

Added three new functions:

- `uploadMechanicDocument()` - Uploads documents to Firebase Storage at the path:
  `mechanic-documents/{mechanicId}/{documentType}/{fileName}`
- `saveMechanicProfile()` - Saves mechanic profile data to Firestore at:
  `mechanics/{mechanicId}`
- `getMechanicProfile()` - Retrieves mechanic profile from Firestore

### 2. Mechanic Onboarding Screen

**File:** `app/screens/driverOnBoarding.tsx`

Complete React Native screen with:

- **Business Information Form**
  - Business Name (required)
  - Insurance Expiry Date (required)

- **Document Upload (4 types)**
  - Insurance Certificate (PDF/Image) - Required
  - Driver's License (Image) - Required
  - W9 Tax Form (PDF/Image) - Required
  - Business Registration (PDF/Image) - Optional

- **Features**
  - Image picker for photos (driver's license)
  - Document picker for PDFs and images
  - Upload progress indicator
  - Form validation
  - Success/error handling
  - Navigation to MechanicDashboard on completion

### 3. Storage Structure

**Firebase Storage Path:**

```
mechanic-documents/
    {mechanicId}/
        insurance/
            certificate.pdf
        identity/
            drivers_license.jpg
        tax/
            w9.pdf
        business/
            registration.pdf
```

**Firestore Structure:**

```javascript
mechanics/{mechanicId} = {
  businessName: "Joe's Mobile Auto",
  email: "joe@example.com",
  name: "Joe Smith",
  phone: "+1234567890",
  insuranceStatus: "pending",
  insuranceExpiry: "2027-04-01",
  onboardingStatus: "pending", // NEW: tracks application status
  verified: false,
  documents: {
      insuranceCert: "gs://bucket/mechanic-documents/123/insurance/cert.pdf",
      driversLicense: "gs://bucket/mechanic-documents/123/identity/license.jpg",
      w9: "gs://bucket/mechanic-documents/123/tax/w9.pdf",
      businessReg: "gs://bucket/mechanic-documents/123/business/reg.pdf"
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  statusUpdatedAt: timestamp,
  adminNote: "Optional admin feedback"
}

users/{userId} = {
  profile: {
    role: "mechanic",
    onboardingStatus: "pending", // NEW: synced with mechanics collection
    onboardingSubmittedAt: timestamp,
    statusUpdatedAt: timestamp,
    // ... other profile fields
  }
}
```

### 4. Dependencies Installed

- `react-native-document-picker` - For PDF and document selection

## Next Steps (Optional)

1. **Firebase Storage Security Rules** - Add rules to restrict document access:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /mechanic-documents/{mechanicId}/{documentType}/{fileName} {
      // Allow mechanics to upload their own documents
      allow write: if request.auth != null && request.auth.uid == mechanicId;
      // Allow admins and the mechanic to read their documents
      allow read: if request.auth != null &&
        (request.auth.uid == mechanicId || request.auth.token.admin == true);
    }
  }
}
```

2. **Firestore Security Rules** - Add rules for mechanics collection:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mechanics/{mechanicId} {
      allow create: if request.auth.uid == mechanicId;
      allow update: if request.auth.uid == mechanicId;
      allow read: if request.auth.uid == mechanicId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

3. **Admin Review Dashboard** - Create a screen for admins to review and approve mechanic documents

4. **Document Status Tracking** - Add status tracking for each document (pending, approved, rejected)

5. **Push Notifications** - Notify mechanics when their documents are approved/rejected

## Usage

Navigate to the screen from MechanicSignUp or Profile screen:

```javascript
navigation.navigate("DriverOnboarding");
```

## Admin Functions

### Updating Onboarding Status

Use the helper function to approve or reject applications:

```typescript
import { updateMechanicOnboardingStatus } from "./services/firebaseService";

// Approve a mechanic
await updateMechanicOnboardingStatus(
  mechanicId,
  "approved",
  "All documents verified and approved",
);

// Reject a mechanic
await updateMechanicOnboardingStatus(
  mechanicId,
  "rejected",
  "Insurance certificate is expired. Please resubmit with current insurance.",
);

// Mark as incomplete (if they need to resubmit)
await updateMechanicOnboardingStatus(
  mechanicId,
  "incomplete",
  "Missing W9 document. Please complete your submission.",
);
```

### Manual Status Update (Firebase Console)

If you need to update manually:

1. Go to Firebase Console → Firestore
2. Update **both** locations:
   - `mechanics/{mechanicId}`:
     - Set `onboardingStatus` to desired status
     - Set `verified` to `true` (if approved)
     - Add `adminNote` with feedback
     - Update `statusUpdatedAt` timestamp
   - `users/{mechanicId}`:
     - Set `profile.onboardingStatus` to same status
     - Update `profile.statusUpdatedAt` timestamp

### Reviewing Applications

When a mechanic submits:

1. Check `adminNotifications` collection for new entries
2. Review documents in Storage: `mechanic-documents/{mechanicId}/`
3. Verify:
   - Insurance certificate is current
   - Driver's license is valid
   - W9 is properly filled
   - Business registration (if provided)
4. Use `updateMechanicOnboardingStatus()` to approve/reject

## Deploy Instructions

Deploy the updated rules and functions:

```bash
# Deploy Firestore rules (includes admin update permissions)
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules

# Deploy Cloud Functions
firebase deploy --only functions:onMechanicOnboarding
```
