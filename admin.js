// This file will contain all the JavaScript for the admin panel.

// Import the functions you need from the SDKs you need
// Renamed to avoid clash with local `initializeApp` below
import { initializeApp as initFirebaseApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, serverTimestamp, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDatabase, ref, set as rtdbSet, onValue, off } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBl4gC04HoBGzttBrNtVYu0-xWCzI9qYc0",
    authDomain: "attendance-a9a19.firebaseapp.com",
    projectId: "attendance-a9a19",
    storageBucket: "attendance-a9a19.appspot.com",
    messagingSenderId: "1055787262218",
    appId: "1:1055787262218:web:c0c9c33d771456888d5af3",
    measurementId: "G-3XPB4VLFYH"
};

// Initialize Firebase
const app = initFirebaseApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// --- Global Variables ---
let currentUser;
let userProfile = {};
let attendanceChart = null;
let reportsChart = null;

// --- App Initialization ---
function initializeApp() {
    console.log("Admin Panel Initializing...");
    showLoading(true);

    // Bind event listeners
    document.getElementById('logoutBtn').addEventListener('click', signOutUser);
    document.getElementById('add-subject-btn').addEventListener('click', addSubject);
    // ... add other top-level event listeners here ...

    // Start authentication check
    onAuthStateChanged(auth, user => {
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

    // Enable offline persistence
    enableIndexedDbPersistence(db)
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
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().isAdmin) {
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
    firebaseSignOut(auth).then(() => {
        console.log('User signed out successfully.');
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Sign out error:', error);
        showErrorPopup("Sign Out Failed", `An error occurred while signing out: ${error.message}`);
    });
}

// --- Feature-specific Functions (Users, Subjects, Attendance etc.) ---

async function loadDashboardStats() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const subjectsSnapshot = await getDocs(collection(db, "subjects"));
        const attendanceSnapshot = await getDocs(collection(db, "attendanceRecords"));
        
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
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    try {
        const q = query(collection(db, "users"), orderBy("joinDate", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No users found.</td></tr>';
            return;
        }
        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name || 'N/A'}</td>
                <td>${user.email}</td>
                <td>${user.studentId || 'N/A'}</td>
                <td>${user.joinDate ? new Date(user.joinDate.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading recent users:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}


async function loadRecentAttendance() {
    const tbody = document.getElementById('recent-attendance-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    try {
        const q = query(collection(db, "attendanceRecords"), orderBy("timestamp", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = '';
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent attendance.</td></tr>';
            return;
        }
        querySnapshot.forEach(docSnap => {
            const record = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.userName || 'N/A'}</td>
                <td>${record.subjectName || 'N/A'}</td>
                <td>${record.status}</td>
                <td>${record.timestamp ? new Date(record.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td>
                <td><span class="badge bg-${record.verified ? 'success' : 'warning'}">${record.verified ? 'Verified' : 'Pending'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading recent attendance:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function loadSubjects() {
    const container = document.getElementById('subjects-list');
    container.innerHTML = '<div class="text-center">Loading subjects...</div>';
    try {
        const querySnapshot = await getDocs(collection(db, "subjects"));
        container.innerHTML = '';
        if (querySnapshot.empty) {
            container.innerHTML = '<p>No subjects found. Add one using the form above.</p>';
            return;
        }
        querySnapshot.forEach(docSnap => {
            const subject = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-group-item d-flex justify-content-between align-items-center';
            div.innerHTML = `
                <span>
                    <strong>${subject.name}</strong> (${subject.code})
                    <br>
                    <small class="text-muted">Professor: ${subject.professor}</small>
                </span>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSubject('${docSnap.id}')"><i class="fas fa-trash"></i></button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading subjects:", error);
        container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

async function addSubject() {
    const name = document.getElementById('subject-name').value;
    const code = document.getElementById('subject-code').value;
    const professor = document.getElementById('subject-professor').value;

    if (!name || !code || !professor) {
        showToast("All fields are required.", "warning");
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "subjects"), { name, code, professor, createdBy: currentUser.uid, createdAt: serverTimestamp() });
        showToast("Subject added successfully!", "success");
        document.getElementById('add-subject-form').reset();
        loadSubjects(); // Reload the list
    } catch (error) {
        console.error("Error adding subject: ", error);
        showErrorPopup("Failed to Add Subject", error.message);
    }
}

async function deleteSubject(subjectId) {
    if (!confirm("Are you sure you want to delete this subject? This action cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, "subjects", subjectId));
        showToast("Subject deleted successfully.", "success");
        loadSubjects();
    } catch (error) {
        console.error("Error deleting subject: ", error);
        showErrorPopup("Failed to Delete Subject", error.message);
    }
}
window.deleteSubject = deleteSubject;


async function loadUserLogs() {
    const tbody = document.getElementById('user-logs-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading logs...</td></tr>';
    try {
        const q = query(collection(db, "userLogs"), orderBy("timestamp", "desc"), limit(50));
        const snapshot = await getDocs(q);
        tbody.innerHTML = '';
        if(snapshot.empty) {
             tbody.innerHTML = '<tr><td colspan="5" class="text-center">No user logs found.</td></tr>';
             return;
        }
        snapshot.forEach(doc => {
            const log = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td>
                <td>${log.userName || 'N/A'}</td>
                <td>${log.userEmail || 'N/A'}</td>
                <td>${log.activity || 'N/A'}</td>
                <td>${log.page || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading user logs:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function loadSystemHealth() {
    const statusDiv = document.getElementById('system-health-status');
    statusDiv.innerHTML = '<p>Checking system health...</p>';
    try {
        await getDoc(doc(db, "health-check", "probe"));
        statusDiv.innerHTML = '<p class="text-success"><i class="fas fa-check-circle"></i> Firestore connection is nominal.</p>';
    } catch (error) {
         if(error.code === 'permission-denied') {
            statusDiv.innerHTML = '<p class="text-success"><i class="fas fa-check-circle"></i> Firestore connection is nominal (permission-denied response is expected).</p>';
         } else {
            console.error("System health check failed:", error);
            statusDiv.innerHTML = `<p class="text-danger"><i class="fas fa-exclamation-triangle"></i> Firestore connection failed: ${error.message}</p>`;
         }
    }
}


// --- Initialize the App ---
document.addEventListener('DOMContentLoaded', initializeApp);