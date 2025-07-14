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
    
    // Set up event listeners for user table rows
    setupUserTableEventListeners();
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

    auth.signOut().then(() => {
        console.log('User signed out successfully from admin panel.');
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
        await db.collection("subjects").doc(subjectId).delete();
        showToast('Subject deleted successfully', 'success');
        loadSubjects();
    } catch (error) {
        console.error("Error deleting subject:", error);
        showToast('Failed to delete subject: ' + error.message, 'danger');
    }
}

async function loadUserLogs() {
    // Implementation for loading user logs
    console.log("Loading user logs...");
    // This function would typically load user activity logs from a database
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