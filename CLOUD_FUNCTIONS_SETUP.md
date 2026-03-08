# Cloud Functions & Database Rules Setup

## Overview

This project uses secure Cloud Functions to handle sensitive operations like user search, preventing direct database access vulnerabilities.

## Deploy Cloud Functions

### Build and Deploy

```bash
cd functions
npm run build
npm run deploy
```

Or deploy everything at once:

```bash
firebase deploy
```

### Test Cloud Function Locally

```bash
# Terminal 1: Start the emulator
cd functions
npm run serve

# Terminal 2: Test the function
firebase functions:shell
# In the shell, test:
searchUsers({ email: 'test' })
```

## Deploy Database Rules

The `database.rules.json` file contains restrictive rules that:

- Only allow authenticated users to read their own user profile
- Prevent direct reading of the entire users list
- Allow user search only through the Cloud Function
- Restrict vehicle access to owners only

### Deploy Rules

```bash
firebase deploy --only database
```

Or deploy everything:

```bash
firebase deploy
```

## Security Features

✅ **User Search** - Only through Cloud Function (no direct DB read)
✅ **User Privacy** - Users can only read/write their own profile
✅ **Vehicle Access** - Only owners can read/write vehicles
✅ **Input Validation** - Cloud Function validates email input
✅ **Rate Limiting** - Function returns max 20 results
✅ **Logging** - All searches are logged for audit trails

## Function Details

### searchUsers(email: string)

- **Access**: Authenticated users only
- **Input**: Email string (min 2 chars, must contain @)
- **Output**: Array of user objects (id, email, firstName, lastName)
- **Excludes**: Current user from results
- **Limit**: Max 20 results

## Troubleshooting

### Function not callable

1. Ensure `@react-native-firebase/functions` is installed
2. Ensure firebaseConfig.ts exports `functions`
3. Deploy functions: `firebase deploy --only functions`

### "Authentication required" error

- Make sure user is logged in before calling searchUsers

### "Please enter a valid email" error

- Email must contain @ symbol and be at least 2 characters

## Cost Considerations

- Cloud Functions are billed per invocation (free tier: 2M invocations/month)
- Database reads are billed as normal Realtime Database calls
- Consider caching frequently searched emails in your app
