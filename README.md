# Attendance System Admin Panel

## Firebase Permissions Fix

To fix the "Missing or insufficient permissions" error when managing subjects in the admin panel, you need to update your Firebase security rules. Follow these steps:

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your project "attendance-a9a19"

2. **Update Firestore Security Rules**
   - In the left sidebar, click on "Firestore Database"
   - Click on the "Rules" tab
   - Replace the current rules with the following:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin users to read and write to all documents
    match /{document=**} {
      allow read, write: if request.auth != null && isAdmin(request.auth.token.email);
    }
    
    // Allow subjects collection to be read by all authenticated users
    match /subjects/{subjectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isAdmin(request.auth.token.email);
    }
    
    // Allow users to read and write only their own documents
    match /users/{userId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && (request.auth.uid == userId || isAdmin(request.auth.token.email));
    }
    
    // Helper function to check if user is admin
    function isAdmin(email) {
      return email in ['admin@admin.com'];
    }
  }
}
```

3. **Publish the Rules**
   - Click the "Publish" button to deploy these security rules

These rules will:
- Allow admin users (admin@admin.com) to read and write to all collections
- Allow all authenticated users to read the subjects collection
- Only allow admin users to create/modify/delete subjects
- Allow users to manage their own data

## Admin Panel Updates

The admin panel has been updated with:
1. A new color scheme to match the website theme
2. Enhanced UI with smooth animations and better visual hierarchy
3. Fixed subject management functionality
4. Improved charts and data visualization

## Subjects Management

The admin panel now allows you to:
1. Add new subjects that will be available to all users
2. View and delete existing subjects
3. Monitor attendance across all subjects

When users log in, they will only see the subjects that have been added through the admin panel. 