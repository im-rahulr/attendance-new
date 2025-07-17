// This file will contain all the JavaScript for the admin panel.
// Using Firebase v9 compat mode to match admin.html

// Firebase configuration
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

// Initialize Firebase (using compat mode)
let app, auth, db, rtdb, analytics;

function initializeFirebaseServices() {
    try {
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }

        auth = firebase.auth();
        db = firebase.firestore();
        rtdb = firebase.database();

        if (firebase.analytics) {
            analytics = firebase.analytics();
        }

        console.log('✅ Firebase services initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// --- Global Variables ---
let currentUser;
let userProfile = {};
let attendanceChart = null;
let reportsChart = null;

// --- App Initialization ---
function initializeAdminPanel() {
    console.log("Admin Panel Initializing...");
    showLoading(true);

    // Initialize Firebase services first
    if (!initializeFirebaseServices()) {
        console.error('Failed to initialize Firebase services');
        showToast('Failed to initialize Firebase services', 'danger');
        return;
    }

    // Bind event listeners
    document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
    document.getElementById('add-subject-btn')?.addEventListener('click', addSubject);
    
    // User Management event listeners
    document.getElementById('addUserSubmitBtn')?.addEventListener('click', submitAddUserForm);
    document.getElementById('editUserSubmitBtn')?.addEventListener('click', submitEditUserForm);
    document.getElementById('deleteUserConfirmBtn')?.addEventListener('click', confirmDeleteUser);
    
    // ... add other top-level event listeners here ...

    // Start authentication check
    auth.onAuthStateChanged(user => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const adminContent = document.getElementById('adminContent');
        const unauthorizedView = document.getElementById('unauthorizedView');
        
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (adminContent) adminContent.style.display = 'none';
        if (unauthorizedView) unauthorizedView.style.display = 'none';
        
        if (user) {
            currentUser = user;
            console.log("User authenticated:", currentUser.uid);
            checkAdminPermissions(user);
        } else {
            console.log("User not authenticated. Redirecting to login.");
            showLoading(false);
            if (adminContent) adminContent.style.display = 'none';
            if (unauthorizedView) {
                unauthorizedView.style.display = 'block';
                document.getElementById('login-redirect-btn').onclick = () => window.location.href = 'login.html';
            }
        }
    });

    // Enable offline persistence (compat mode)
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => console.log("Firestore persistence enabled."))
        .catch((err) => {
            console.warn("Firestore persistence failed.", err);
            if (err.code == 'failed-precondition') {
                showToast("Offline mode disabled: app is open in multiple tabs.", "warning");
            } else if (err.code == 'unimplemented') {
                showToast("Offline mode not supported on this browser.", "warning");
            }
        });
}

async function checkAdminPermissions(user) {
    console.log("Checking admin permissions...");
    const adminContent = document.getElementById('adminContent');
    const unauthorizedView = document.getElementById('unauthorizedView');
    const userEmailSpan = document.getElementById('user-email');

    try {
        const userDocRef = db.collection("users").doc(user.uid);
        const userDocSnap = await userDocRef.get();

        if (userDocSnap.exists && userDocSnap.data().isAdmin) {
            userProfile = { uid: user.uid, ...userDocSnap.data() };
            console.log("Admin access granted for:", userProfile.email);
            
            if(userEmailSpan) userEmailSpan.textContent = userProfile.email;
            
            document.body.classList.add('admin-authed');
            adminContent.style.display = 'block';
            unauthorizedView.style.display = 'none';
            
            // Proceed with loading admin data
            loadAdminDashboard();

        } else {
            console.log("User is not an admin. Denying access.");
            showAccessDenied();
        }
    } catch (error) {
        console.error("Error checking admin permissions:", error);
        showErrorPopup("Permission Check Failed", `An error occurred while verifying your permissions: ${error.message}. Please try again later.`);
        showAccessDenied();
    } finally {
        showLoading(false);
    }
}

function showAccessDenied() {
    const adminContent = document.getElementById('adminContent');
    const unauthorizedView = document.getElementById('unauthorizedView');
    
    adminContent.style.display = 'none';
    unauthorizedView.style.display = 'block';
    document.getElementById('login-redirect-btn').onclick = () => window.location.href = 'login.html';
    showLoading(false);
}

async function loadAdminDashboard() {
    console.log("Loading admin dashboard data...");
    // Initialize all data loading functions
    loadDashboardStats();
    loadRecentUsers();
    loadRecentAttendance();
    loadSubjects();
    loadUserLogs();
    loadSystemHealth();
    loadContactSubmissions();

    // Set up event listeners for user table rows
    setupUserTableEventListeners();

    // Initialize contact submissions event listeners
    initializeContactSubmissionsEventListeners();

    // Initialize user logs event listeners
    initializeUserLogsEventListeners();

    // Initialize email testing event listeners
    initializeEmailTestingEventListeners();

    // Add tab click event listener for contact submissions
    const contactSubmissionsTab = document.getElementById('contact-submissions-tab');
    if (contactSubmissionsTab) {
        contactSubmissionsTab.addEventListener('click', function() {
            console.log('Contact submissions tab clicked, reloading data...');
            setTimeout(() => {
                loadContactSubmissions();
            }, 100); // Small delay to ensure tab content is visible
        });
    }

    // ... add other loading functions as needed from the old script
}

// --- Utility Functions ---

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconMap = {
        'success': '<i class="fas fa-check-circle"></i>',
        'danger': '<i class="fas fa-exclamation-triangle"></i>',
        'warning': '<i class="fas fa-exclamation-circle"></i>',
        'info': '<i class="fas fa-info-circle"></i>'
    };

    const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${iconMap[type] || ''} ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

function showErrorPopup(title, message) {
    const modalTitle = document.getElementById('errorModalLabel');
    const modalBody = document.getElementById('errorModalBody');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = `<p>${message}</p><p>If the issue persists, please contact support.</p>`;
    
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
}

function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if(overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function signOutUser() {
    // Show loading if available
    showLoading("Logging out...");

    // Log logout attempt
    if (window.logUserActivity) {
        window.logUserActivity('Admin logout initiated', {
            logoutMethod: 'admin_panel',
            page: window.location.pathname,
            timestamp: new Date().toISOString()
        });
    }

    auth.signOut().then(() => {
        console.log('User signed out successfully from admin panel.');

        // Log successful logout
        if (window.logUserActivity) {
            window.logUserActivity('Admin logout successful', {
                logoutMethod: 'admin_panel',
                page: window.location.pathname,
                timestamp: new Date().toISOString(),
                logoutSuccess: true
            });
        }

        // Clear any cached data
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        // Redirection is now handled by the global auth state listener in auth.js
    }).catch((error) => {
        console.error('Sign out error:', error);

        // Log failed logout
        if (window.logUserActivity) {
            window.logUserActivity('Admin logout failed', {
                logoutMethod: 'admin_panel',
                page: window.location.pathname,
                errorCode: error.code,
                errorMessage: error.message,
                timestamp: new Date().toISOString(),
                logoutSuccess: false
            });
        }

        showErrorPopup("Sign Out Failed", `An error occurred while signing out: ${error.message}`);
        showLoading(false);
    });
}

// --- Feature-specific Functions (Users, Subjects, Attendance etc.) ---

async function loadDashboardStats() {
    try {
        const usersSnapshot = await db.collection("users").get();
        const subjectsSnapshot = await db.collection("subjects").get();
        const attendanceSnapshot = await db.collection("attendanceRecords").get();

        document.getElementById('total-users').textContent = usersSnapshot.size;
        document.getElementById('total-subjects').textContent = subjectsSnapshot.size;
        document.getElementById('total-attendance').textContent = attendanceSnapshot.size;
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        showToast("Could not load dashboard stats.", "danger");
    }
}

async function loadRecentUsers() {
    const tbody = document.getElementById('recent-users-body');
    if (!tbody) return;

    try {
        const usersSnapshot = await db.collection("users")
            .orderBy("lastLogin", "desc")
            .limit(5)
            .get();

        if (usersSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No recent users</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const lastLogin = userData.lastLogin ? userData.lastLogin.toDate().toLocaleString() : 'Never';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${userData.displayName || 'Anonymous'}</td>
                <td>${userData.email || 'No email'}</td>
                <td>${lastLogin}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading recent users:", error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading users</td></tr>';
    }
}

async function loadRecentAttendance() {
    const tbody = document.getElementById('recent-attendance-body');
    if (!tbody) return;

    try {
        const attendanceSnapshot = await db.collection("attendanceRecords")
            .orderBy("timestamp", "desc")
            .limit(5)
            .get();

        if (attendanceSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No recent attendance records</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Unknown';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.userName || 'Unknown'}</td>
                <td>${data.subject || 'Unknown'}</td>
                <td>${data.status || 'Present'}</td>
                <td>${timestamp}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading recent attendance:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading attendance</td></tr>';
    }
}

async function loadSubjects() {
    const subjectsList = document.getElementById('subjectsList');
    if (!subjectsList) return;
    
    try {
        const subjectsSnapshot = await db.collection("subjects")
            .orderBy("order", "asc")
            .get();

        if (subjectsSnapshot.empty) {
            subjectsList.innerHTML = '<li class="list-group-item">No subjects found. Add one to get started.</li>';
            return;
        }

        subjectsList.innerHTML = '';
        subjectsSnapshot.forEach(doc => {
            const data = doc.data();
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                <div>
                    <h6 class="mb-1">${data.name}</h6>
                    <small class="text-muted">Class days: ${data.days?.join(', ') || 'None'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-subject-btn" data-id="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-subject-btn" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            subjectsList.appendChild(listItem);
        });
        
        // Add event listeners to the edit and delete buttons
        document.querySelectorAll('.edit-subject-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Get the subject ID from the data-id attribute
                const subjectId = btn.getAttribute('data-id');
                // Implement edit functionality
                editSubject(subjectId);
            });
        });
        
        document.querySelectorAll('.delete-subject-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Get the subject ID from the data-id attribute
                const subjectId = btn.getAttribute('data-id');
                // Implement delete functionality
                deleteSubject(subjectId);
            });
        });
    } catch (error) {
        console.error("Error loading subjects:", error);
        subjectsList.innerHTML = '<li class="list-group-item text-danger">Error loading subjects</li>';
    }
}

async function addSubject() {
    const subjectName = document.getElementById('subjectName').value.trim();
    const classOrder = parseInt(document.getElementById('classOrder').value) || 1;
    
    // Get selected days
    const selectedDays = [];
    document.querySelectorAll('.class-day-checkbox:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
    });
    
    if (!subjectName) {
        showToast('Please enter a subject name', 'warning');
        return;
    }
    
    try {
        await db.collection("subjects").add({
            name: subjectName,
            days: selectedDays,
            order: classOrder,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser ? currentUser.uid : 'unknown'
        });
        
        showToast('Subject added successfully', 'success');
        
        // Reset form
        document.getElementById('subjectName').value = '';
        document.getElementById('classOrder').value = '';
        document.querySelectorAll('.class-day-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Reload subjects
        loadSubjects();
        
    } catch (error) {
        console.error("Error adding subject:", error);
        showToast('Failed to add subject: ' + error.message, 'danger');
    }
}

async function deleteSubject(subjectId) {
    if (!subjectId) {
        console.error("No subject ID provided for deletion");
        return;
    }

    if (!confirm('Are you sure you want to delete this subject? This cannot be undone.')) {
        return;
    }

    try {
        // First, get the subject data to know which subject name to remove from user data
        const subjectDoc = await db.collection("subjects").doc(subjectId).get();
        if (!subjectDoc.exists) {
            showToast('Subject not found', 'warning');
            return;
        }

        const subjectData = subjectDoc.data();
        const subjectName = subjectData.name;

        // Store in deletedRecords collection for backup
        await db.collection('deletedRecords').add({
            type: 'subject',
            data: subjectData,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: currentUser ? currentUser.email : 'unknown'
        });

        // Delete the subject from subjects collection
        await db.collection("subjects").doc(subjectId).delete();

        // Clean up user attendance data - remove this subject from all users
        const usersSnapshot = await db.collection('users').get();
        const batch = db.batch();

        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.attendanceData && userData.attendanceData.subjects && userData.attendanceData.subjects[subjectName]) {
                // Remove the subject from user's attendance data
                const updatedAttendanceData = { ...userData.attendanceData };
                delete updatedAttendanceData.subjects[subjectName];

                batch.update(userDoc.ref, {
                    attendanceData: updatedAttendanceData
                });
            }
        });

        // Commit all user data updates
        await batch.commit();

        showToast('Subject deleted successfully and cleaned from all user data', 'success');
        loadSubjects();
    } catch (error) {
        console.error("Error deleting subject:", error);
        showToast('Failed to delete subject: ' + error.message, 'danger');
    }
}

async function loadUserLogs() {
    // Use the enhanced version with debugging
    return await loadUserLogsWithDebug();
}

// Helper function to display user logs in the table
function displayUserLogs(logs) {
    const tableBody = document.querySelector('#userLogsTable tbody');
    if (!tableBody) return;

    if (logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No logs match the current filters</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    logs.forEach(log => {
        const row = document.createElement('tr');

        // Format timestamp
        let timestamp = 'Unknown';
        if (log.timestamp) {
            timestamp = log.timestamp.toDate().toLocaleString();
        } else if (log['@timestamp']) {
            timestamp = new Date(log['@timestamp']).toLocaleString();
        }

        // Format user info
        const userName = log.userName || 'Unknown User';
        const userEmail = log.userEmail || 'Unknown Email';

        // Format activity
        const activity = log.activity || log.message || 'Unknown Activity';

        // Format page
        const page = log.page || log.url || 'Unknown Page';

        // Format device info
        const deviceInfo = log.deviceType || log.browser || 'Unknown Device';

        // Format session
        const sessionId = log.sessionId ? log.sessionId.substring(0, 8) + '...' : 'N/A';

        row.innerHTML = `
            <td>
                <small class="text-muted">${timestamp}</small>
            </td>
            <td>
                <div class="d-flex flex-column">
                    <span class="fw-bold">${userName}</span>
                    <small class="text-muted">${userEmail}</small>
                </div>
            </td>
            <td>
                <span class="badge ${getActivityBadgeClass(activity)}">${activity}</span>
            </td>
            <td>
                <small>${page}</small>
            </td>
            <td>
                <small>${deviceInfo}</small>
            </td>
            <td>
                <small class="font-monospace">${sessionId}</small>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="showLogDetails('${log.id}', ${JSON.stringify(log).replace(/"/g, '&quot;')})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// Helper function to get badge class for activity type
function getActivityBadgeClass(activity) {
    const activityLower = activity.toLowerCase();

    if (activityLower.includes('login') || activityLower.includes('authenticated')) {
        return 'bg-success';
    } else if (activityLower.includes('logout') || activityLower.includes('signed out')) {
        return 'bg-warning';
    } else if (activityLower.includes('error') || activityLower.includes('failed')) {
        return 'bg-danger';
    } else if (activityLower.includes('page') || activityLower.includes('view')) {
        return 'bg-info';
    } else if (activityLower.includes('button') || activityLower.includes('click')) {
        return 'bg-primary';
    } else if (activityLower.includes('form') || activityLower.includes('submit')) {
        return 'bg-secondary';
    } else {
        return 'bg-light text-dark';
    }
}

// Helper function to update log statistics
function updateLogStats(count) {
    const statsElement = document.getElementById('logStatsText');
    if (statsElement) {
        statsElement.textContent = `Showing ${count} logs`;
    }
}

// Function to show detailed log information
function showLogDetails(logId, logData) {
    try {
        // Parse the log data if it's a string
        const log = typeof logData === 'string' ? JSON.parse(logData.replace(/&quot;/g, '"')) : logData;

        // Create modal content
        const modalTitle = document.querySelector('#activityDetailsModal .modal-title');
        const modalBody = document.querySelector('#activityDetailsModal .modal-body');

        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-info-circle me-2"></i>Activity Log Details';
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Basic Information</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Activity:</strong></td><td>${log.activity || log.message || 'N/A'}</td></tr>
                            <tr><td><strong>User:</strong></td><td>${log.userName || 'Unknown'}</td></tr>
                            <tr><td><strong>Email:</strong></td><td>${log.userEmail || 'Unknown'}</td></tr>
                            <tr><td><strong>Page:</strong></td><td>${log.page || 'Unknown'}</td></tr>
                            <tr><td><strong>URL:</strong></td><td>${log.url || 'Unknown'}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Technical Details</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Session ID:</strong></td><td>${log.sessionId || 'N/A'}</td></tr>
                            <tr><td><strong>User Agent:</strong></td><td><small>${log.userAgent || 'Unknown'}</small></td></tr>
                            <tr><td><strong>Device:</strong></td><td>${log.deviceType || 'Unknown'}</td></tr>
                            <tr><td><strong>Browser:</strong></td><td>${log.browser || 'Unknown'}</td></tr>
                            <tr><td><strong>OS:</strong></td><td>${log.operatingSystem || 'Unknown'}</td></tr>
                        </table>
                    </div>
                </div>

                ${log.additionalData ? `
                <div class="mt-3">
                    <h6>Additional Data</h6>
                    <pre class="bg-light p-3 rounded" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(log.additionalData, null, 2)}</pre>
                </div>
                ` : ''}
            `;
        }

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('activityDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error showing log details:', error);
        showToast('Error displaying log details', 'danger');
    }
}

// Initialize event listeners for user logs functionality
function initializeUserLogsEventListeners() {
    console.log("Initializing user logs event listeners...");

    // Refresh logs button
    const refreshBtn = document.getElementById('refreshLogsBtn');
    if (refreshBtn && !refreshBtn.dataset.listenerAdded) {
        refreshBtn.addEventListener('click', loadUserLogs);
        refreshBtn.dataset.listenerAdded = 'true';
    }

    // Search logs button
    const searchBtn = document.getElementById('searchLogsBtn');
    if (searchBtn && !searchBtn.dataset.listenerAdded) {
        searchBtn.addEventListener('click', loadUserLogs);
        searchBtn.dataset.listenerAdded = 'true';
    }

    // Search input (Enter key)
    const searchInput = document.getElementById('logSearchInput');
    if (searchInput && !searchInput.dataset.listenerAdded) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadUserLogs();
            }
        });
        searchInput.dataset.listenerAdded = 'true';
    }

    // Filter select changes
    const filterSelect = document.getElementById('logFilterSelect');
    if (filterSelect && !filterSelect.dataset.listenerAdded) {
        filterSelect.addEventListener('change', loadUserLogs);
        filterSelect.dataset.listenerAdded = 'true';
    }

    // Limit select changes
    const limitSelect = document.getElementById('logLimitSelect');
    if (limitSelect && !limitSelect.dataset.listenerAdded) {
        limitSelect.addEventListener('change', loadUserLogs);
        limitSelect.dataset.listenerAdded = 'true';
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearLogFiltersBtn');
    if (clearFiltersBtn && !clearFiltersBtn.dataset.listenerAdded) {
        clearFiltersBtn.addEventListener('click', function() {
            // Clear all filter inputs
            if (searchInput) searchInput.value = '';
            if (filterSelect) filterSelect.value = 'all';
            if (limitSelect) limitSelect.value = '100';

            const dateFrom = document.getElementById('logDateFrom');
            const dateTo = document.getElementById('logDateTo');
            const userFilter = document.getElementById('logUserFilter');

            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            if (userFilter) userFilter.value = '';

            // Reload logs
            loadUserLogs();
        });
        clearFiltersBtn.dataset.listenerAdded = 'true';
    }

    // Export logs button
    const exportBtn = document.getElementById('exportLogsBtn');
    if (exportBtn && !exportBtn.dataset.listenerAdded) {
        exportBtn.addEventListener('click', exportUserLogs);
        exportBtn.dataset.listenerAdded = 'true';
    }

    // Clear logs button
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn && !clearLogsBtn.dataset.listenerAdded) {
        clearLogsBtn.addEventListener('click', clearUserLogs);
        clearLogsBtn.dataset.listenerAdded = 'true';
    }

    // Date filter changes
    const dateFrom = document.getElementById('logDateFrom');
    const dateTo = document.getElementById('logDateTo');
    const userFilter = document.getElementById('logUserFilter');

    if (dateFrom && !dateFrom.dataset.listenerAdded) {
        dateFrom.addEventListener('change', loadUserLogs);
        dateFrom.dataset.listenerAdded = 'true';
    }

    if (dateTo && !dateTo.dataset.listenerAdded) {
        dateTo.addEventListener('change', loadUserLogs);
        dateTo.dataset.listenerAdded = 'true';
    }

    if (userFilter && !userFilter.dataset.listenerAdded) {
        userFilter.addEventListener('input', debounce(loadUserLogs, 500));
        userFilter.dataset.listenerAdded = 'true';
    }
}

// Export user logs to CSV
async function exportUserLogs() {
    try {
        showToast('Generating logs export...', 'info');

        // Get all logs (without limit for export)
        const snapshot = await db.collection('userLogs').orderBy('timestamp', 'desc').get();

        if (snapshot.empty) {
            showToast('No logs to export', 'warning');
            return;
        }

        // Prepare CSV content
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "User Activity Logs Export\n";
        csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
        csvContent += "Timestamp,User Name,User Email,Activity,Page,Device,Session ID,Additional Data\n";

        snapshot.forEach(doc => {
            const log = doc.data();
            const timestamp = log.timestamp ? log.timestamp.toDate().toLocaleString() : 'Unknown';
            const userName = (log.userName || 'Unknown').replace(/"/g, '""');
            const userEmail = (log.userEmail || 'Unknown').replace(/"/g, '""');
            const activity = (log.activity || log.message || 'Unknown').replace(/"/g, '""');
            const page = (log.page || 'Unknown').replace(/"/g, '""');
            const device = (log.deviceType || log.browser || 'Unknown').replace(/"/g, '""');
            const sessionId = (log.sessionId || 'N/A').replace(/"/g, '""');
            const additionalData = log.additionalData ? JSON.stringify(log.additionalData).replace(/"/g, '""') : '';

            csvContent += `"${timestamp}","${userName}","${userEmail}","${activity}","${page}","${device}","${sessionId}","${additionalData}"\n`;
        });

        // Download the file
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `user_activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Logs exported successfully', 'success');

    } catch (error) {
        console.error('Error exporting logs:', error);
        showToast('Failed to export logs: ' + error.message, 'danger');
    }
}

// Clear user logs (admin only)
async function clearUserLogs() {
    const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL user activity logs.\n\nThis action cannot be undone. Are you sure you want to continue?');

    if (!confirmed) return;

    try {
        showToast('Clearing user logs...', 'info');

        // Get all logs
        const snapshot = await db.collection('userLogs').get();

        if (snapshot.empty) {
            showToast('No logs to clear', 'info');
            return;
        }

        // Delete in batches
        const batchSize = 500;
        const batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;

        snapshot.forEach(doc => {
            currentBatch.delete(doc.ref);
            operationCount++;

            if (operationCount === batchSize) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
        });

        if (operationCount > 0) {
            batches.push(currentBatch);
        }

        // Execute all batches
        await Promise.all(batches.map(batch => batch.commit()));

        showToast(`Successfully cleared ${snapshot.size} user logs`, 'success');

        // Reload the logs table
        loadUserLogs();

    } catch (error) {
        console.error('Error clearing logs:', error);
        showToast('Failed to clear logs: ' + error.message, 'danger');
    }
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debug function to test user logs functionality
async function debugUserLogs() {
    console.log('🔍 DEBUG: Testing user logs functionality...');

    try {
        // Check if user is authenticated
        const currentUser = auth.currentUser;
        console.log('🔍 DEBUG: Current user:', currentUser ? currentUser.email : 'Not authenticated');

        if (!currentUser) {
            console.error('❌ DEBUG: No authenticated user');
            return;
        }

        // Check if user is admin
        const adminEmails = ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
        const isAdmin = adminEmails.includes(currentUser.email);
        console.log('🔍 DEBUG: Is admin user:', isAdmin, 'Email:', currentUser.email);

        if (!isAdmin) {
            console.error('❌ DEBUG: User is not admin');
            return;
        }

        // Check database connection
        console.log('🔍 DEBUG: Testing database connection...');
        const testQuery = await db.collection('userLogs').limit(1).get();
        console.log('✅ DEBUG: Database connection successful');
        console.log('🔍 DEBUG: Test query result:', testQuery.size, 'documents');

        // Try to get all user logs
        console.log('🔍 DEBUG: Fetching all user logs...');
        const allLogsQuery = await db.collection('userLogs').orderBy('timestamp', 'desc').limit(10).get();
        console.log('✅ DEBUG: User logs query successful');
        console.log('🔍 DEBUG: Found', allLogsQuery.size, 'user logs');

        // Log details of first few logs
        allLogsQuery.forEach((doc, index) => {
            if (index < 3) {
                const logData = doc.data();
                console.log(`🔍 DEBUG: Log ${index + 1}:`, {
                    id: doc.id,
                    activity: logData.activity || logData.message,
                    user: logData.userName || logData.userEmail,
                    timestamp: logData.timestamp ? logData.timestamp.toDate() : 'No timestamp'
                });
            }
        });

        // Test creating a test log
        console.log('🔍 DEBUG: Creating test log...');
        await db.collection('userLogs').add({
            activity: 'Admin panel debug test',
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Admin User',
            userEmail: currentUser.email,
            page: '/admin.html',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            additionalData: {
                testType: 'admin_debug',
                debugTime: new Date().toISOString()
            }
        });
        console.log('✅ DEBUG: Test log created successfully');

        // Try to load logs using the actual function
        console.log('🔍 DEBUG: Testing loadUserLogs function...');
        await loadUserLogs();
        console.log('✅ DEBUG: loadUserLogs function completed');

    } catch (error) {
        console.error('❌ DEBUG: Error in debugUserLogs:', error);
        console.error('❌ DEBUG: Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    }
}

// Enhanced loadUserLogs with better error handling and debugging
async function loadUserLogsWithDebug() {
    console.log("🔍 Loading user logs with debug information...");

    try {
        // Check authentication first
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        console.log('✅ User authenticated:', currentUser.email);

        // Check admin status
        const adminEmails = ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
        const isAdmin = adminEmails.includes(currentUser.email);

        if (!isAdmin) {
            throw new Error(`User ${currentUser.email} is not an admin`);
        }

        console.log('✅ Admin status confirmed');

        // Show loading spinner
        const spinner = document.getElementById('logsSpinner');
        const tableBody = document.querySelector('#userLogsTable tbody');

        if (spinner) {
            spinner.style.display = 'flex';
        }

        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading logs...</td></tr>';
        }

        console.log('🔍 Querying userLogs collection...');

        // Build Firestore query with error handling
        let query = db.collection('userLogs').orderBy('timestamp', 'desc').limit(100);

        // Execute query
        const snapshot = await query.get();

        console.log('✅ Query executed successfully');
        console.log('📊 Found', snapshot.size, 'logs');

        if (snapshot.empty) {
            console.log('⚠️ No logs found in database');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No user logs found in database</td></tr>';
            }
            updateLogStats(0);
            return;
        }

        // Process logs
        let logs = [];
        snapshot.forEach(doc => {
            const logData = doc.data();
            logData.id = doc.id;
            logs.push(logData);
        });

        console.log('✅ Processed', logs.length, 'logs');

        // Display logs in table
        displayUserLogs(logs);
        updateLogStats(logs.length);

        console.log('✅ Logs displayed successfully');

    } catch (error) {
        console.error("❌ Error loading user logs:", error);

        const tableBody = document.querySelector('#userLogsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <div class="alert alert-danger">
                            <h6>Error loading logs</h6>
                            <p><strong>Error:</strong> ${error.message}</p>
                            <p><strong>Code:</strong> ${error.code || 'Unknown'}</p>
                            <button class="btn btn-sm btn-outline-primary" onclick="debugUserLogs()">
                                <i class="fas fa-bug me-1"></i>Run Debug Test
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        showToast('Failed to load user logs: ' + error.message, 'danger');
    } finally {
        // Hide loading spinner
        const spinner = document.getElementById('logsSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
}

async function loadSystemHealth() {
    // Implementation for checking system health
    console.log("Loading system health...");
    // This function would typically check database connections, API endpoints, etc.
}

// --- User Management Functions ---

// Function to set up event listeners for user table rows
function setupUserTableEventListeners() {
    const adminTable = document.getElementById('adminTable');
    if (!adminTable) return;

    // Load users data when the users tab is shown
    document.querySelector('#users-tab').addEventListener('click', loadUsersData);
    
    // Also load user data if the page loads directly to the users tab
    if (window.location.hash === '#users-content') {
        loadUsersData();
    }
}

// Function to load users data into the table
async function loadUsersData() {
    const tableBody = document.querySelector('#adminTable tbody');
    const spinner = document.getElementById('spinner');
    const tableContainer = document.getElementById('adminTableContainer');
    
    if (!tableBody || !spinner || !tableContainer) return;
    
    // Show spinner, hide table
    spinner.style.display = 'block';
    tableContainer.style.display = 'none';
    
    try {
        // Get all users from Firestore
        const usersSnapshot = await db.collection('users').get();
        
        // Clear existing table data
        tableBody.innerHTML = '';
        
        if (usersSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        } else {
            let counter = 1;
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const row = document.createElement('tr');
                
                const lastUpdated = userData.lastUpdated 
                    ? userData.lastUpdated.toDate().toLocaleString() 
                    : 'Never';
                    
                const status = userData.status || 'active';
                const statusBadge = getStatusBadge(status);
                
                row.innerHTML = `
                    <td>${counter}</td>
                    <td>${userData.displayName || 'Not set'}</td>
                    <td>${userData.email || 'No email'}</td>
                    <td>${userData.role || 'student'}</td>
                    <td>${statusBadge}</td>
                    <td>${lastUpdated}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${doc.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${doc.id}" 
                                data-user-name="${userData.displayName || userData.email}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
                counter++;
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-user-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const userId = btn.getAttribute('data-user-id');
                    openEditUserModal(userId);
                });
            });
            
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const userId = btn.getAttribute('data-user-id');
                    const userName = btn.getAttribute('data-user-name');
                    openDeleteUserModal(userId, userName);
                });
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">
            Error loading users: ${error.message}
        </td></tr>`;
    } finally {
        // Hide spinner, show table
        spinner.style.display = 'none';
        tableContainer.style.display = 'block';
    }
}

// Helper function to generate status badge HTML
function getStatusBadge(status) {
    let badgeClass = 'bg-secondary';
    
    switch (status.toLowerCase()) {
        case 'active':
            badgeClass = 'bg-success';
            break;
        case 'inactive':
            badgeClass = 'bg-warning';
            break;
        case 'suspended':
            badgeClass = 'bg-danger';
            break;
    }
    
    return `<span class="badge ${badgeClass}">${status}</span>`;
}

// Function to submit the Add User form
async function submitAddUserForm() {
    // Get form values
    const name = document.getElementById('addUserName').value.trim();
    const email = document.getElementById('addUserEmail').value.trim();
    const password = document.getElementById('addUserPassword').value.trim();
    const role = document.getElementById('addUserRole').value;
    
    // Basic validation
    if (!name || !email || !password) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        // Create user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        
        // Set display name
        await newUser.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(newUser.uid).set({
            displayName: name,
            email: email,
            role: role,
            status: 'active',
            isAdmin: role === 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal and show success message
        const addUserModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        addUserModal.hide();
        
        showToast(`User ${name} created successfully`, 'success');
        
        // Reload users data
        loadUsersData();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showToast(`Error creating user: ${error.message}`, 'danger');
    }
}

// Function to open the Edit User modal and populate it with user data
async function openEditUserModal(userId) {
    try {
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            showToast('User not found', 'danger');
            return;
        }
        
        const userData = userDoc.data();
        
        // Populate form fields
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserName').value = userData.displayName || '';
        document.getElementById('editUserEmail').value = userData.email || '';
        document.getElementById('editUserRole').value = userData.role || 'student';
        document.getElementById('editUserStatus').value = userData.status || 'active';
        document.getElementById('editUserPassword').value = ''; // Clear password field
        
        // Show modal
        const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
        editUserModal.show();
        
    } catch (error) {
        console.error('Error loading user data for edit:', error);
        showToast(`Error loading user data: ${error.message}`, 'danger');
    }
}

// Function to submit the Edit User form
async function submitEditUserForm() {
    // Get form values
    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const password = document.getElementById('editUserPassword').value.trim();
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;
    
    // Basic validation
    if (!userId || !name || !email) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        // Update user document in Firestore
        await db.collection('users').doc(userId).update({
            displayName: name,
            email: email,
            role: role,
            status: status,
            isAdmin: role === 'admin',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // If password provided, update it
        if (password) {
            // Get user Auth record
            const user = await firebase.auth().currentUser;
            
            if (user && user.uid === userId) {
                // If updating own password
                await user.updatePassword(password);
            } else {
                // For other users, we'd need admin SDK (not available in client-side)
                // This is a limitation of Firebase Auth in client-side code
                showToast('Password can only be updated by the user themselves or via backend', 'warning');
            }
        }
        
        // Close modal and show success message
        const editUserModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
        editUserModal.hide();
        
        showToast(`User ${name} updated successfully`, 'success');
        
        // Reload users data
        loadUsersData();
        
    } catch (error) {
        console.error('Error updating user:', error);
        showToast(`Error updating user: ${error.message}`, 'danger');
    }
}

// Function to open the Delete User confirmation modal
function openDeleteUserModal(userId, userName) {
    document.getElementById('deleteUserId').value = userId;
    document.getElementById('deleteUserName').textContent = userName;
    
    // Show modal
    const deleteUserModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    deleteUserModal.show();
}

// Function to confirm user deletion
async function confirmDeleteUser() {
    const userId = document.getElementById('deleteUserId').value;
    
    if (!userId) {
        showToast('User ID not provided', 'danger');
        return;
    }
    
    try {
        // Delete user document from Firestore
        await db.collection('users').doc(userId).delete();
        
        // Note: To delete the actual Auth user would require Firebase Admin SDK
        // which we can't use on the client-side due to security concerns
        // We're just removing the user document from Firestore
        
        // Close modal and show success message
        const deleteUserModal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
        deleteUserModal.hide();
        
        showToast('User deleted successfully', 'success');
        
        // Reload users data
        loadUsersData();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast(`Error deleting user: ${error.message}`, 'danger');
    }
}

// --- Contact Submissions Management ---

let contactSubmissions = [];
let filteredContactSubmissions = [];
let currentContactPage = 1;
const contactSubmissionsPerPage = 10;

async function loadContactSubmissions() {
    try {
        console.log('Loading contact submissions...');

        // Check if Firebase is initialized
        if (!db) {
            console.error('Firebase database not initialized');
            showToast('Firebase not initialized', 'danger');
            return;
        }

        // Show loading state
        const tableBody = document.getElementById('contactSubmissionsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Loading contact submissions...</p>
                    </td>
                </tr>
            `;
        }

        const contactSubmissionsSnapshot = await db.collection('contactSubmissions')
            .orderBy('timestamp', 'desc')
            .get();

        contactSubmissions = [];
        contactSubmissionsSnapshot.forEach(doc => {
            const data = doc.data();
            contactSubmissions.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            });
        });

        console.log(`Loaded ${contactSubmissions.length} contact submissions`);

        // Update statistics
        updateContactSubmissionsStats();

        // Apply current filters
        applyContactFilters();

        // Show success message if no submissions found
        if (contactSubmissions.length === 0) {
            console.log('No contact submissions found in database');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted">
                            <i class="fas fa-inbox fa-2x mb-2"></i>
                            <p>No contact submissions found</p>
                            <small>Contact form submissions will appear here once users submit the contact form.</small>
                        </td>
                    </tr>
                `;
            }
        }

    } catch (error) {
        console.error('Error loading contact submissions:', error);

        // Show detailed error in table
        const tableBody = document.getElementById('contactSubmissionsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>Error loading contact submissions</p>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        }

        showToast(`Error loading contact submissions: ${error.message}`, 'danger');
    }
}

function updateContactSubmissionsStats() {
    const total = contactSubmissions.length;
    const unread = contactSubmissions.filter(s => s.status === 'unread').length;
    const pending = contactSubmissions.filter(s => s.status === 'pending').length;
    const resolved = contactSubmissions.filter(s => s.resolved === true || s.status === 'resolved').length;

    document.getElementById('totalSubmissions').textContent = total;
    document.getElementById('unreadSubmissions').textContent = unread;
    document.getElementById('pendingSubmissions').textContent = pending;
    document.getElementById('resolvedSubmissions').textContent = resolved;
}

function applyContactFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const subjectFilter = document.getElementById('subjectFilter')?.value || '';
    const searchTerm = document.getElementById('contactSearch')?.value.toLowerCase() || '';

    filteredContactSubmissions = contactSubmissions.filter(submission => {
        // Status filter
        if (statusFilter && submission.status !== statusFilter) {
            return false;
        }

        // Subject filter
        if (subjectFilter && submission.subject !== subjectFilter) {
            return false;
        }

        // Search filter
        if (searchTerm) {
            const searchableText = `${submission.name} ${submission.email} ${submission.message}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        return true;
    });

    currentContactPage = 1;
    renderContactSubmissionsTable();
    renderContactPagination();
}

function renderContactSubmissionsTable() {
    const tbody = document.getElementById('contactSubmissionsTableBody');
    if (!tbody) return;

    if (filteredContactSubmissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>No contact submissions found</p>
                </td>
            </tr>
        `;
        return;
    }

    const startIndex = (currentContactPage - 1) * contactSubmissionsPerPage;
    const endIndex = startIndex + contactSubmissionsPerPage;
    const pageSubmissions = filteredContactSubmissions.slice(startIndex, endIndex);

    tbody.innerHTML = pageSubmissions.map(submission => {
        const statusBadge = getStatusBadge(submission.status);
        const messagePreview = submission.message.length > 50
            ? submission.message.substring(0, 50) + '...'
            : submission.message;

        return `
            <tr>
                <td>${statusBadge}</td>
                <td>${submission.name}</td>
                <td>${submission.email}</td>
                <td><span class="badge bg-secondary">${formatSubject(submission.subject)}</span></td>
                <td>${messagePreview}</td>
                <td>${submission.timestamp.toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewContactSubmission('${submission.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="respondToContactSubmission('${submission.id}')">
                        <i class="fas fa-reply"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusBadge(status) {
    const badges = {
        'unread': '<span class="badge bg-warning">Unread</span>',
        'read': '<span class="badge bg-info">Read</span>',
        'pending': '<span class="badge bg-primary">Pending</span>',
        'resolved': '<span class="badge bg-success">Resolved</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

function formatSubject(subject) {
    const subjects = {
        'technical-support': 'Technical Support',
        'feature-request': 'Feature Request',
        'bug-report': 'Bug Report',
        'partnership': 'Partnership',
        'general': 'General Inquiry',
        'other': 'Other'
    };
    return subjects[subject] || subject;
}

function renderContactPagination() {
    const pagination = document.getElementById('contactSubmissionsPagination');
    if (!pagination) return;

    const totalPages = Math.ceil(filteredContactSubmissions.length / contactSubmissionsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <li class="page-item ${currentContactPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeContactPage(${currentContactPage - 1})">Previous</a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentContactPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changeContactPage(${i})">${i}</a>
            </li>
        `;
    }

    // Next button
    paginationHTML += `
        <li class="page-item ${currentContactPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeContactPage(${currentContactPage + 1})">Next</a>
        </li>
    `;

    pagination.innerHTML = paginationHTML;
}

function changeContactPage(page) {
    const totalPages = Math.ceil(filteredContactSubmissions.length / contactSubmissionsPerPage);
    if (page < 1 || page > totalPages) return;

    currentContactPage = page;
    renderContactSubmissionsTable();
    renderContactPagination();
}

async function viewContactSubmission(submissionId) {
    try {
        const submission = contactSubmissions.find(s => s.id === submissionId);
        if (!submission) {
            showToast('Contact submission not found', 'danger');
            return;
        }

        // Populate modal with submission details
        document.getElementById('modalContactName').textContent = submission.name;
        document.getElementById('modalContactEmail').textContent = submission.email;
        document.getElementById('modalContactSubject').textContent = formatSubject(submission.subject);
        document.getElementById('modalContactDate').textContent = submission.timestamp.toLocaleString();
        document.getElementById('modalContactMessage').textContent = submission.message;
        document.getElementById('modalContactId').textContent = submission.id;
        document.getElementById('modalContactUserAgent').textContent = submission.userAgent || 'Not available';
        document.getElementById('modalContactIP').textContent = submission.ipAddress || 'Not available';
        document.getElementById('modalContactUpdated').textContent = submission.lastUpdated ?
            submission.lastUpdated.toLocaleString() : 'Never';
        document.getElementById('modalContactStatus').value = submission.status || 'unread';

        // Mark as read if it's unread
        if (submission.status === 'unread') {
            await updateContactSubmissionStatus(submissionId, 'read');
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('contactSubmissionModal'));
        modal.show();

        // Store current submission ID for saving changes
        document.getElementById('contactSubmissionModal').dataset.submissionId = submissionId;

    } catch (error) {
        console.error('Error viewing contact submission:', error);
        showToast('Error loading contact submission details', 'danger');
    }
}

async function updateContactSubmissionStatus(submissionId, newStatus) {
    try {
        await db.collection('contactSubmissions').doc(submissionId).update({
            status: newStatus,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local data
        const submission = contactSubmissions.find(s => s.id === submissionId);
        if (submission) {
            submission.status = newStatus;
            submission.lastUpdated = new Date();
        }

        // Refresh display
        updateContactSubmissionsStats();
        applyContactFilters();

    } catch (error) {
        console.error('Error updating contact submission status:', error);
        throw error;
    }
}

async function respondToContactSubmission(submissionId) {
    try {
        const submission = contactSubmissions.find(s => s.id === submissionId);
        if (!submission) {
            showToast('Contact submission not found', 'danger');
            return;
        }

        // Populate response modal
        document.getElementById('responseToEmail').textContent = `${submission.name} <${submission.email}>`;
        document.getElementById('responseSubject').value = `Re: ${formatSubject(submission.subject)}`;
        document.getElementById('responseMessage').value = '';

        // Show response modal
        const modal = new bootstrap.Modal(document.getElementById('contactResponseModal'));
        modal.show();

        // Store submission ID for sending response
        document.getElementById('contactResponseModal').dataset.submissionId = submissionId;

    } catch (error) {
        console.error('Error preparing contact response:', error);
        showToast('Error preparing response', 'danger');
    }
}

async function sendContactResponse() {
    try {
        const modal = document.getElementById('contactResponseModal');
        const submissionId = modal.dataset.submissionId;
        const submission = contactSubmissions.find(s => s.id === submissionId);

        if (!submission) {
            showToast('Contact submission not found', 'danger');
            return;
        }

        const subject = document.getElementById('responseSubject').value.trim();
        const message = document.getElementById('responseMessage').value.trim();
        const markResolved = document.getElementById('markResolvedAfterResponse').checked;

        if (!subject || !message) {
            showToast('Please fill in both subject and message', 'warning');
            return;
        }

        // Disable send button
        const sendButton = document.getElementById('sendContactResponse');
        const originalText = sendButton.innerHTML;
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sending...';

        // Prepare email data
        const emailData = {
            to_email: submission.email,
            to_name: submission.name,
            subject: subject,
            html_content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #333; margin: 0; font-size: 24px;">lowrybunks</h1>
                            <p style="color: #666; margin: 5px 0 0 0;">Attendance Management System</p>
                        </div>

                        <h2 style="color: #333; margin-bottom: 20px;">Response to Your Inquiry</h2>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Dear ${submission.name},
                        </p>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Thank you for contacting us. Here's our response to your inquiry:
                        </p>

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                        </div>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            If you have any further questions, please don't hesitate to contact us again.
                        </p>

                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 14px; margin: 0;">
                                Best regards,<br>
                                The lowrybunks Team
                            </p>
                            <p style="color: #888; font-size: 14px; margin: 10px 0 0 0;">
                                © 2025 CodeCraft. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            `,
            from_name: 'lowrybunks Team',
            from_email: 'website.po45@gmail.com'
        };

        // Send email response using Resend integration
        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: emailData.to_email,
                    name: emailData.to_name,
                    type: 'hello',
                    subject: emailData.subject
                })
            });

            if (!response.ok) {
                throw new Error(`Email service failed: HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('Response email sent successfully:', result);
        } catch (error) {
            console.error('Failed to send response email:', error);
            throw new Error('Failed to send response email');
        }

        // Update submission status
        const newStatus = markResolved ? 'resolved' : 'pending';
        await updateContactSubmissionStatus(submissionId, newStatus);

        // Log the response
        await db.collection('contactSubmissions').doc(submissionId).update({
            responses: firebase.firestore.FieldValue.arrayUnion({
                subject: subject,
                message: message,
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                sentBy: currentUser.email
            })
        });

        // Close modal and show success
        const modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();

        showToast('Response sent successfully', 'success');

    } catch (error) {
        console.error('Error sending contact response:', error);
        showToast('Error sending response: ' + error.message, 'danger');
    } finally {
        // Re-enable send button
        const sendButton = document.getElementById('sendContactResponse');
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Send Response';
    }
}

// Initialize contact submissions event listeners
function initializeContactSubmissionsEventListeners() {
    // Filter event listeners
    const statusFilter = document.getElementById('statusFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const contactSearch = document.getElementById('contactSearch');
    const clearFilters = document.getElementById('clearContactFilters');
    const refreshButton = document.getElementById('refreshContactSubmissions');

    if (statusFilter) {
        statusFilter.addEventListener('change', applyContactFilters);
    }

    if (subjectFilter) {
        subjectFilter.addEventListener('change', applyContactFilters);
    }

    if (contactSearch) {
        contactSearch.addEventListener('input', debounce(applyContactFilters, 300));
    }

    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            if (statusFilter) statusFilter.value = '';
            if (subjectFilter) subjectFilter.value = '';
            if (contactSearch) contactSearch.value = '';
            applyContactFilters();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener('click', loadContactSubmissions);
    }

    // Modal event listeners
    const saveChangesButton = document.getElementById('saveContactChanges');
    const sendResponseButton = document.getElementById('sendContactResponse');
    const markResolvedButton = document.getElementById('markAsResolved');
    const respondButton = document.getElementById('respondToContact');

    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', async () => {
            try {
                const modal = document.getElementById('contactSubmissionModal');
                const submissionId = modal.dataset.submissionId;
                const newStatus = document.getElementById('modalContactStatus').value;

                await updateContactSubmissionStatus(submissionId, newStatus);

                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance.hide();

                showToast('Contact submission updated successfully', 'success');
            } catch (error) {
                console.error('Error saving contact changes:', error);
                showToast('Error saving changes', 'danger');
            }
        });
    }

    if (sendResponseButton) {
        sendResponseButton.addEventListener('click', sendContactResponse);
    }

    if (markResolvedButton) {
        markResolvedButton.addEventListener('click', async () => {
            try {
                const modal = document.getElementById('contactSubmissionModal');
                const submissionId = modal.dataset.submissionId;

                await updateContactSubmissionStatus(submissionId, 'resolved');

                const modalInstance = bootstrap.Modal.getInstance(modal);
                modalInstance.hide();

                showToast('Contact submission marked as resolved', 'success');
            } catch (error) {
                console.error('Error marking as resolved:', error);
                showToast('Error marking as resolved', 'danger');
            }
        });
    }

    if (respondButton) {
        respondButton.addEventListener('click', () => {
            const modal = document.getElementById('contactSubmissionModal');
            const submissionId = modal.dataset.submissionId;

            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();

            setTimeout(() => {
                respondToContactSubmission(submissionId);
            }, 300);
        });
    }
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Email Testing Functions ---

// Initialize email testing event listeners
function initializeEmailTestingEventListeners() {
    console.log("Initializing email testing event listeners...");

    // Test welcome email button
    const testWelcomeEmailBtn = document.getElementById('testWelcomeEmailBtn');
    const sendTestWelcomeEmailBtn = document.getElementById('sendTestWelcomeEmailBtn');

    if (testWelcomeEmailBtn) {
        testWelcomeEmailBtn.addEventListener('click', showTestWelcomeEmailForm);
    }

    if (sendTestWelcomeEmailBtn) {
        sendTestWelcomeEmailBtn.addEventListener('click', sendTestWelcomeEmail);
    }

    // Check email service status button
    const checkStatusBtn = document.getElementById('checkEmailjsStatusBtn');
    if (checkStatusBtn) {
        checkStatusBtn.addEventListener('click', checkEmailServiceStatus);
    }

    // View email logs button
    const viewLogsBtn = document.getElementById('viewEmailjsLogsBtn');
    if (viewLogsBtn) {
        viewLogsBtn.addEventListener('click', viewEmailLogs);
    }

    // Test contact email button
    const testContactEmailBtn = document.getElementById('testContactEmailBtn');
    if (testContactEmailBtn) {
        testContactEmailBtn.addEventListener('click', sendTestContactEmail);
    }

    // Test admin notification button
    const testAdminNotificationBtn = document.getElementById('testAdminNotificationBtn');
    if (testAdminNotificationBtn) {
        testAdminNotificationBtn.addEventListener('click', sendTestAdminNotification);
    }
}

function showTestWelcomeEmailForm() {
    // Switch to email system tab if not already active
    const emailTab = document.getElementById('email-system-tab');
    if (emailTab) {
        emailTab.click();
    }

    // Focus on email input
    const emailInput = document.getElementById('testWelcomeEmailAddress');
    if (emailInput) {
        emailInput.focus();
    }
}

async function sendTestWelcomeEmail() {
    const emailInput = document.getElementById('testWelcomeEmailAddress');
    const nameInput = document.getElementById('testWelcomeUserName');
    const sendBtn = document.getElementById('sendTestWelcomeEmailBtn');

    if (!emailInput || !nameInput || !sendBtn) return;

    const email = emailInput.value.trim();
    const name = nameInput.value.trim() || 'Test User';
    const originalText = sendBtn.innerHTML;

    if (!email) {
        showToast('Please enter an email address', 'warning');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'danger');
        return;
    }

    // Show loading state
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sending...';

    try {
        // Use new Resend integration
        const response = await fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                name: name,
                type: 'welcome'
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Test welcome email sent successfully!', 'success');
            loadWelcomeEmailStatistics(); // Refresh stats
        } else {
            showToast(`Failed to send test welcome email: ${result.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error sending test welcome email:', error);
        showToast('Error sending test welcome email', 'danger');
    } finally {
        // Reset button state
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
    }
}

async function sendTestContactEmail() {
    const email = 'rahulhitwo@gmail.com'; // Admin email for testing
    const name = 'Test User';

    try {
        showToast('Sending test contact email...', 'info');

        const response = await fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                name: name,
                type: 'contact'
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Test contact email sent successfully!', 'success');
        } else {
            showToast(`Failed to send test contact email: ${result.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error sending test contact email:', error);
        showToast('Error sending test contact email', 'danger');
    }
}

async function sendTestAdminNotification() {
    const email = 'rahulhitwo@gmail.com'; // Admin email
    const name = 'Admin';

    try {
        showToast('Sending test admin notification...', 'info');

        const response = await fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                name: name,
                type: 'hello',
                subject: 'Test Admin Notification - Email System Working'
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Test admin notification sent successfully!', 'success');
        } else {
            showToast(`Failed to send test admin notification: ${result.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error sending test admin notification:', error);
        showToast('Error sending test admin notification', 'danger');
    }
}

async function checkEmailServiceStatus() {
    try {
        showToast('Checking email service status...', 'info');

        const response = await fetch('/health');
        const result = await response.json();

        if (response.ok && result.status === 'OK') {
            showToast('✅ Email service is running and healthy!', 'success');

            // Update status indicator if it exists
            const statusIndicator = document.getElementById('emailServiceStatus');
            if (statusIndicator) {
                statusIndicator.innerHTML = '<span class="badge bg-success">Online</span>';
            }
        } else {
            showToast('⚠️ Email service status check failed', 'warning');
        }
    } catch (error) {
        console.error('Error checking email service status:', error);
        showToast('❌ Email service is not responding', 'danger');

        // Update status indicator if it exists
        const statusIndicator = document.getElementById('emailServiceStatus');
        if (statusIndicator) {
            statusIndicator.innerHTML = '<span class="badge bg-danger">Offline</span>';
        }
    }
}

async function viewEmailLogs() {
    try {
        showToast('Loading email logs...', 'info');

        // For now, show a simple modal with recent email activity
        // In a full implementation, this would fetch actual email logs
        const modalTitle = document.querySelector('#emailLogsModal .modal-title');
        const modalBody = document.querySelector('#emailLogsModal .modal-body');

        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-envelope me-2"></i>Email System Logs';
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div class="alert alert-info">
                    <h6>Email System Status</h6>
                    <p>The email system is using Resend integration and is functioning properly.</p>
                    <ul>
                        <li>Service: Resend API</li>
                        <li>Status: Active</li>
                        <li>Available Templates: Welcome, Contact, Hello</li>
                        <li>Last Health Check: ${new Date().toLocaleString()}</li>
                    </ul>
                </div>
                <div class="mt-3">
                    <h6>Quick Actions</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" onclick="sendTestWelcomeEmail()">
                            <i class="fas fa-paper-plane me-1"></i>Send Test Welcome Email
                        </button>
                        <button class="btn btn-outline-info" onclick="sendTestContactEmail()">
                            <i class="fas fa-envelope me-1"></i>Send Test Contact Email
                        </button>
                        <button class="btn btn-outline-secondary" onclick="sendTestAdminNotification()">
                            <i class="fas fa-bell me-1"></i>Send Test Admin Notification
                        </button>
                    </div>
                </div>
            `;
        }

        // Show the modal (create it if it doesn't exist)
        let modal = document.getElementById('emailLogsModal');
        if (!modal) {
            // Create modal if it doesn't exist
            const modalHTML = `
                <div class="modal fade" id="emailLogsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Email Logs</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('emailLogsModal');
        }

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

    } catch (error) {
        console.error('Error viewing email logs:', error);
        showToast('Error loading email logs', 'danger');
    }
}

function loadWelcomeEmailStatistics() {
    // Placeholder function for loading email statistics
    // In a full implementation, this would fetch actual email statistics
    console.log('Loading welcome email statistics...');

    const statsElement = document.getElementById('welcomeEmailStats');
    if (statsElement) {
        statsElement.innerHTML = `
            <div class="row text-center">
                <div class="col-4">
                    <div class="border-end">
                        <h6 class="text-success">Sent Today</h6>
                        <h4>-</h4>
                    </div>
                </div>
                <div class="col-4">
                    <div class="border-end">
                        <h6 class="text-info">This Week</h6>
                        <h4>-</h4>
                    </div>
                </div>
                <div class="col-4">
                    <h6 class="text-primary">Total</h6>
                    <h4>-</h4>
                </div>
            </div>
        `;
    }
}