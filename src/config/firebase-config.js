/**
 * Firebase Configuration
 * Centralized Firebase configuration for the Attendance Application
 */

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyBl4gC04HoBGzttBrNtVYu0-xWCzI9qYc0",
    authDomain: "attendance-a9a19.firebaseapp.com",
    databaseURL: "https://attendance-a9a19-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "attendance-a9a19",
    storageBucket: "attendance-a9a19.appspot.com",
    messagingSenderId: "1055787262218",
    appId: "1:1055787262218:web:c0c9c33d771456888d5af3",
    measurementId: "G-3XPB4VLFYH"
};

// Firebase initialization function with error handling
function initializeFirebaseApp() {
    try {
        // Check if Firebase is already initialized
        if (firebase.apps.length > 0) {
            console.log("Firebase already initialized");
            return firebase.app();
        }
        
        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
        
        // Enable offline persistence for Firestore
        if (firebase.firestore) {
            firebase.firestore().enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('The current browser does not support all features required to enable persistence');
                    } else {
                        console.error('Persistence error:', err);
                    }
                });
        }
        
        return app;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        throw error;
    }
}

// Get Firebase services with error handling
function getFirebaseServices() {
    try {
        const app = initializeFirebaseApp();
        
        return {
            auth: firebase.auth(),
            firestore: firebase.firestore(),
            database: firebase.database ? firebase.database() : null,
            storage: firebase.storage ? firebase.storage() : null,
            analytics: firebase.analytics ? firebase.analytics() : null
        };
    } catch (error) {
        console.error('Error getting Firebase services:', error);
        return null;
    }
}

// Admin email configuration
const ADMIN_EMAILS = [
    'admin@admin.com',
    'admin@example.com',
    'administrator@attendance.com'
];

// Check if user is admin
function isAdminUser(email) {
    return ADMIN_EMAILS.includes(email);
}

// Firebase configuration validation
function validateFirebaseConfig() {
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    
    for (const key of requiredKeys) {
        if (!firebaseConfig[key]) {
            throw new Error(`Missing required Firebase config key: ${key}`);
        }
    }
    
    console.log('Firebase configuration validated successfully');
    return true;
}

// Initialize Firebase when script loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        validateFirebaseConfig();
        initializeFirebaseApp();
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        
        // Show user-friendly error message
        const errorMessage = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Configuration Error</h4>
                <p>Failed to initialize Firebase. Please check your configuration and try again.</p>
                <hr>
                <p class="mb-0">Error: ${error.message}</p>
            </div>
        `;
        
        // Try to display error in common container elements
        const containers = ['#main-content', '.container', 'body'];
        for (const selector of containers) {
            const element = document.querySelector(selector);
            if (element) {
                element.innerHTML = errorMessage;
                break;
            }
        }
    }
});

// Export configuration and functions for use in other modules
if (typeof window !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
    window.initializeFirebaseApp = initializeFirebaseApp;
    window.getFirebaseServices = getFirebaseServices;
    window.isAdminUser = isAdminUser;
    window.validateFirebaseConfig = validateFirebaseConfig;
    window.ADMIN_EMAILS = ADMIN_EMAILS;
}

// For Node.js environments (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        firebaseConfig,
        initializeFirebaseApp,
        getFirebaseServices,
        isAdminUser,
        validateFirebaseConfig,
        ADMIN_EMAILS
    };
}
