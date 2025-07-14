@echo off
echo ========================================
echo Firebase Permissions Fix Script
echo ========================================
echo.

echo Checking Firebase CLI installation...
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI is not installed
    echo Please install it with: npm install -g firebase-tools
    pause
    exit /b 1
)
echo ✓ Firebase CLI is installed

echo.
echo Checking Firebase login status...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not logged in to Firebase
    echo Please login with: firebase login
    pause
    exit /b 1
)
echo ✓ Firebase authentication verified

echo.
echo Current Firebase project:
firebase use

echo.
echo Deploying Firestore security rules...
firebase deploy --only firestore:rules
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy rules
    pause
    exit /b 1
)

echo.
echo ✓ Firestore rules deployed successfully!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Open the admin panel test page
echo 2. Run the tests again
echo 3. Verify all Firebase tests pass
echo.
echo Admin Panel URL: file:///C:/Users/rahul/Downloads/attendance/src/pages/admin.html
echo Test Suite URL: file:///C:/Users/rahul/Downloads/attendance/src/tests/admin-panel-test.html
echo.
echo Admin Login Credentials:
echo - admin@admin.com
echo - admin@example.com  
echo - administrator@attendance.com
echo.
pause
