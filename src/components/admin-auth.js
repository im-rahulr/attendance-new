/**
 * Admin Authentication Module
 * Handles admin authentication, permissions, and Firebase integration
 */

// Admin email configuration
const ADMIN_EMAILS = [
    'admin@admin.com',
    'admin@example.com', 
    'administrator@attendance.com'
];

// Global admin state
let currentAdminUser = null;
let adminAuthInitialized = false;

/**
 * Initialize admin authentication system
 */
function initializeAdminAuth() {
    console.log('🔐 Initializing admin authentication system...');
    
    if (!firebase || !firebase.auth || !firebase.firestore) {
        console.error('❌ Firebase not properly initialized');
        throw new Error('Firebase services not available');
    }
    
    // Set up authentication state listener
    firebase.auth().onAuthStateChanged(handleAuthStateChange);
    
    adminAuthInitialized = true;
    console.log('✅ Admin authentication system initialized');
}

/**
 * Handle authentication state changes
 */
function handleAuthStateChange(user) {
    console.log('🔄 Auth state changed:', user ? user.email : 'No user');
    
    if (user) {
        // User is signed in
        if (isAdminEmail(user.email)) {
            console.log('✅ Admin user authenticated:', user.email);
            currentAdminUser = user;
            onAdminAuthenticated(user);
        } else {
            console.log('❌ Non-admin user attempted access:', user.email);
            firebase.auth().signOut();
            showAccessDenied('You do not have admin privileges');
        }
    } else {
        // User is signed out
        console.log('👤 User signed out');
        currentAdminUser = null;
        onAdminSignedOut();
    }
}

/**
 * Check if email is in admin list
 */
function isAdminEmail(email) {
    if (!email) return false;
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
    console.log(`🔍 Admin check for ${email}: ${isAdmin}`);
    return isAdmin;
}

/**
 * Sign in admin user
 */
async function signInAdmin(email, password) {
    console.log('🔑 Attempting admin sign in for:', email);
    
    try {
        // Validate admin email first
        if (!isAdminEmail(email)) {
            throw new Error('Email not authorized for admin access');
        }
        
        // Sign in with Firebase
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log('✅ Firebase authentication successful');
        
        return userCredential.user;
        
    } catch (error) {
        console.error('❌ Admin sign in failed:', error);
        
        // Handle specific error cases
        if (error.code === 'auth/user-not-found') {
            throw new Error('Admin account not found');
        } else if (error.code === 'auth/wrong-password') {
            throw new Error('Invalid password');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Invalid email format');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please try again later');
        } else {
            throw new Error(error.message || 'Authentication failed');
        }
    }
}

/**
 * Sign out admin user
 */
async function signOutAdmin() {
    console.log('🚪 Signing out admin user');
    
    try {
        await firebase.auth().signOut();
        console.log('✅ Admin signed out successfully');
    } catch (error) {
        console.error('❌ Error signing out:', error);
        throw error;
    }
}

/**
 * Check if current user is authenticated admin
 */
function isAdminAuthenticated() {
    return currentAdminUser !== null && isAdminEmail(currentAdminUser.email);
}

/**
 * Get current admin user
 */
function getCurrentAdminUser() {
    return currentAdminUser;
}

/**
 * Test Firestore connection with admin permissions
 */
async function testAdminFirestoreAccess() {
    console.log('🧪 Testing admin Firestore access...');
    
    if (!isAdminAuthenticated()) {
        throw new Error('Admin not authenticated');
    }
    
    try {
        // Test read access
        const testDoc = await firebase.firestore().collection('_test_connection').doc('admin_test').get();
        console.log('✅ Firestore read access confirmed');
        
        // Test write access
        await firebase.firestore().collection('_test_connection').doc('admin_test').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            adminEmail: currentAdminUser.email,
            test: 'Admin access test'
        });
        console.log('✅ Firestore write access confirmed');
        
        return true;
        
    } catch (error) {
        console.error('❌ Firestore access test failed:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Firestore permissions not properly configured for admin access');
        } else {
            throw new Error(`Firestore access error: ${error.message}`);
        }
    }
}

/**
 * Callback when admin is authenticated
 */
function onAdminAuthenticated(user) {
    console.log('🎉 Admin authenticated callback:', user.email);
    
    // Test Firestore access
    testAdminFirestoreAccess()
        .then(() => {
            console.log('✅ Admin Firestore access verified');
            showAdminDashboard();
        })
        .catch(error => {
            console.error('❌ Admin Firestore access failed:', error);
            showFirestoreError(error.message);
        });
}

/**
 * Callback when admin is signed out
 */
function onAdminSignedOut() {
    console.log('👋 Admin signed out callback');
    showAdminLogin();
}

/**
 * Show admin dashboard
 */
function showAdminDashboard() {
    console.log('📊 Showing admin dashboard');

    const loginContainer = document.getElementById('adminLoginContainer');
    const dashboard = document.getElementById('adminDashboard');

    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    // Initialize dashboard data
    loadAdminDashboardData();
}

/**
 * Load all admin dashboard data with proper error handling
 */
async function loadAdminDashboardData() {
    console.log('📊 Loading admin dashboard data...');

    const loadingFunctions = [
        { name: 'User Data', func: 'loadUserData' },
        { name: 'Subjects', func: 'loadSubjects' },
        { name: 'User Logs', func: 'loadUserLogs' },
        { name: 'Error Logs', func: 'loadErrorLogs' },
        { name: 'Deleted Reports', func: 'loadDeletedReports' },
        { name: 'Attendance Form Data', func: 'loadAttendanceFormData' },
        { name: 'Recent Attendance', func: 'loadRecentAttendance' }
    ];

    const results = [];

    for (const { name, func } of loadingFunctions) {
        try {
            console.log(`📥 Loading ${name}...`);

            if (typeof window[func] === 'function') {
                await window[func]();
                console.log(`✅ ${name} loaded successfully`);
                results.push({ name, status: 'success' });
            } else {
                console.warn(`⚠️ Function ${func} not found`);
                results.push({ name, status: 'not_found' });
            }
        } catch (error) {
            console.error(`❌ Error loading ${name}:`, error);
            results.push({ name, status: 'error', error: error.message });
        }
    }

    // Show loading summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`📊 Dashboard loading complete: ${successCount} successful, ${errorCount} errors`);

    if (errorCount > 0) {
        console.warn('⚠️ Some dashboard components failed to load:',
            results.filter(r => r.status === 'error'));
    }

    // Perform system health check
    setTimeout(async () => {
        try {
            await performSystemHealthCheck();
            console.log('✅ System health check completed');
        } catch (error) {
            console.error('❌ System health check failed:', error);
        }
    }, 2000);
}

/**
 * Perform system health check
 */
async function performSystemHealthCheck() {
    console.log('🏥 Performing system health check...');

    const checks = [];

    try {
        // Check Firebase connectivity
        await firebase.firestore().collection('_test_connection').doc('health_check').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            adminUser: currentAdminUser?.email,
            check: 'system_health'
        });
        checks.push({ name: 'Firebase Connectivity', status: 'pass' });
    } catch (error) {
        checks.push({ name: 'Firebase Connectivity', status: 'fail', error: error.message });
    }

    try {
        // Check admin permissions
        const testRead = await firebase.firestore().collection('users').limit(1).get();
        checks.push({ name: 'Admin Read Permissions', status: 'pass' });
    } catch (error) {
        checks.push({ name: 'Admin Read Permissions', status: 'fail', error: error.message });
    }

    // Check UI components
    const requiredElements = [
        'adminDashboard', 'adminTableContainer', 'subjectsList',
        'userLogsTableBody', 'errorLogsTableBody'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length === 0) {
        checks.push({ name: 'UI Components', status: 'pass' });
    } else {
        checks.push({
            name: 'UI Components',
            status: 'fail',
            error: `Missing elements: ${missingElements.join(', ')}`
        });
    }

    const passCount = checks.filter(c => c.status === 'pass').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    console.log(`🏥 Health check complete: ${passCount} passed, ${failCount} failed`);

    if (failCount > 0) {
        console.warn('⚠️ Health check failures:', checks.filter(c => c.status === 'fail'));
    }

    return checks;
}

/**
 * Show admin login form
 */
function showAdminLogin() {
    console.log('🔐 Showing admin login');
    
    const loginContainer = document.getElementById('adminLoginContainer');
    const dashboard = document.getElementById('adminDashboard');
    
    if (loginContainer) loginContainer.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
}

/**
 * Show access denied message
 */
function showAccessDenied(message = 'Access denied') {
    console.log('🚫 Showing access denied:', message);
    
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    showAdminLogin();
}

/**
 * Show Firestore error message
 */
function showFirestoreError(message) {
    console.log('🔥 Showing Firestore error:', message);
    
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.innerHTML = `
            <strong>Firestore Access Error:</strong><br>
            ${message}<br><br>
            <small>Please ensure Firebase security rules are properly configured for admin access.</small>
        `;
        errorElement.style.display = 'block';
    }
}

/**
 * Initialize admin authentication when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, checking for admin auth initialization');
    
    // Only initialize if we're on an admin page
    if (document.getElementById('adminLoginContainer') || document.getElementById('adminDashboard')) {
        // Wait for Firebase to be ready
        if (typeof firebase !== 'undefined') {
            initializeAdminAuth();
        } else {
            console.log('⏳ Waiting for Firebase to load...');
            window.addEventListener('load', function() {
                setTimeout(() => {
                    if (typeof firebase !== 'undefined') {
                        initializeAdminAuth();
                    } else {
                        console.error('❌ Firebase failed to load');
                    }
                }, 1000);
            });
        }
    }
});

// Export functions for global access
window.adminAuth = {
    signIn: signInAdmin,
    signOut: signOutAdmin,
    isAuthenticated: isAdminAuthenticated,
    getCurrentUser: getCurrentAdminUser,
    testFirestoreAccess: testAdminFirestoreAccess,
    isAdminEmail: isAdminEmail,
    loadDashboardData: loadAdminDashboardData,
    performHealthCheck: performSystemHealthCheck
};
