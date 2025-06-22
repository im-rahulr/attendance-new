// Firebase will be loaded via compat scripts in HTML
// No imports needed for compat API

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl4gC04HoBGzttBrNtVYu0-xWCzI9qYc0",
  authDomain: "attendance-a9a19.firebaseapp.com",
  projectId: "attendance-a9a19",
  storageBucket: "attendance-a9a19.appspot.com",
  messagingSenderId: "1055787262218",
  appId: "1:1055787262218:web:c0c9c33d771456888d5af3",
  measurementId: "G-3XPB4VLFYH"
};

// Initialize Firebase (will be set after Firebase compat loads)
let auth = null;
let db = null;

let currentUser = null;
let attendanceChartInstance = null;
let userAttendanceChartInstance = null;
const adminEmails = ["admin@admin.com"];

// For development purposes - allow any email to be admin in localhost
const isLocalDevelopment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("192.168.");

if (isLocalDevelopment) {
    console.log("Running in development mode - admin access is less restrictive");
}

/* -------------------------------------------------------------
   ⚠️  Global error & promise-rejection handlers
------------------------------------------------------------- */
function showGlobalError(message, details = "") {
    const errBox = document.getElementById("firebase-error");
    if (!errBox) return;
    document.getElementById("firebase-error-message").textContent = String(message);
    document.getElementById("firebase-error-details").textContent = String(details);
    errBox.style.display = "block";
}

// Catch uncaught JS errors
window.addEventListener("error", (evt) => {
    showGlobalError(evt.message || "Unexpected error", evt.error?.stack || "No stack available");
});

// Catch unhandled promise rejections
window.addEventListener("unhandledrejection", (evt) => {
    const reason = evt.reason || {};
    showGlobalError(reason.message || "Unhandled promise rejection", reason.stack || JSON.stringify(reason));
});

/* -------------------------------------------------------------
   Loading-overlay helpers removed - no longer needed
------------------------------------------------------------- */
function showLoadingOverlay(message = "Loading…") {
    // Loading overlay removed - function kept for compatibility
    console.log("Loading:", message);
}

function hideLoadingOverlay() {
    // Loading overlay removed - function kept for compatibility
    console.log("Loading complete");
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.adminScriptLoaded) return;
    window.adminScriptLoaded = true;

    // Wait for Firebase to be initialized before setting up auth listeners
    const waitForFirebase = () => {
        if (!auth || !db) {
            console.log("Waiting for Firebase to initialize...");
            setTimeout(waitForFirebase, 100);
            return;
        }

        console.log("Firebase is ready, setting up admin panel...");
        setupAdminPanel();
    };

    waitForFirebase();
});

function setupAdminPanel() {
    console.log("Setting up admin panel...");

    // Check if we're on the admin page
    if (!document.getElementById('adminLoginContainer') && !document.getElementById('adminDashboard')) {
        console.log("Not on admin page, skipping admin panel setup");
        return;
    }

    // Enable offline persistence for Firestore
    if (db) {
        db.enablePersistence()
          .catch((err) => {
          console.error("Persistence error:", err.code);
          if (err.code == 'failed-precondition') {
              console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
          } else if (err.code == 'unimplemented') {
              console.warn("The current browser does not support all of the features required to enable persistence");
          }
        });
    }

    // Auth state change listener
    if (auth) {
        auth.onAuthStateChanged(function(user) {
        const adminLoginContainer = document.getElementById('adminLoginContainer');
        const adminDashboard = document.getElementById('adminDashboard');

        // Check if required elements exist
        if (!adminLoginContainer || !adminDashboard) {
            console.error("Required admin panel elements not found in DOM");
            showGlobalError("Admin panel elements missing", "The admin panel HTML elements are not properly loaded.");
            return;
        }

        if (user) {
            currentUser = user;
            // Check if user is admin
            if (checkAdmin(user.email)) {
                console.log("Admin authenticated:", user.email);
                adminLoginContainer.style.display = 'none';
                adminDashboard.style.display = 'block';

                // Load data for the dashboard
                try {
                    loadUserData();
                    loadSubjects();
                    loadUserLogs();
                    loadDeletedReports();
                    loadAttendanceFormData();
                    loadRecentAttendance();
                    loadDashboardStats();
                    loadNotifications(); // Load notifications
                } catch (e) {
                    console.error("Error loading initial data:", e);
                    showToast(`Critical Error: ${e.message}`, 'danger');
                    document.getElementById('adminDashboard').innerHTML = `
                        <div class="alert alert-danger">
                            <h4>A critical error occurred</h4>
                            <p>Could not load admin dashboard components. Check the browser console for details.</p>
                            <pre>${e.stack}</pre>
                        </div>
                    `;
                }

                // Add listener for save subject changes button
                const saveSubjectBtn = document.getElementById('saveSubjectChanges');
                if (saveSubjectBtn) {
                    saveSubjectBtn.addEventListener('click', updateSubject);
                }

                // Add listener for save attendance changes button
                const saveAttendanceBtn = document.getElementById('saveAttendanceChanges');
                if (saveAttendanceBtn) {
                    saveAttendanceBtn.addEventListener('click', updateAttendanceRecord);
                }

                // Add listener for add attendance button
                const addAttendanceBtn = document.getElementById('addAttendanceBtn');
                if (addAttendanceBtn) {
                    addAttendanceBtn.addEventListener('click', addManualAttendance);
                }

                // Add listener for Excel export buttons
                const exportExcelBtn = document.getElementById('exportExcelBtn');
                if (exportExcelBtn) {
                    exportExcelBtn.addEventListener('click', exportUserData);
                }

                const exportLogsBtn = document.getElementById('exportLogsBtn');
                if (exportLogsBtn) {
                    exportLogsBtn.addEventListener('click', exportUserLogs);
                }

                const exportDeletedBtn = document.getElementById('exportDeletedBtn');
                if (exportDeletedBtn) {
                    exportDeletedBtn.addEventListener('click', exportDeletedReports);
                }

                // Add listeners for refresh buttons
                const refreshLogsBtn = document.getElementById('refreshLogsBtn');
                if (refreshLogsBtn) {
                    refreshLogsBtn.addEventListener('click', () => loadUserLogs());
                }

                const refreshDeletedBtn = document.getElementById('refreshDeletedBtn');
                if (refreshDeletedBtn) {
                    refreshDeletedBtn.addEventListener('click', loadDeletedReports);
                }

                const refreshNotificationsBtn = document.getElementById('refreshNotificationsBtn');
                if (refreshNotificationsBtn) {
                    refreshNotificationsBtn.addEventListener('click', loadNotifications);
                }

                // Add listener for clear logs button
                const clearLogsBtn = document.getElementById('clearLogsBtn');
                if (clearLogsBtn) {
                    clearLogsBtn.addEventListener('click', clearUserLogs);
                }

                // Add listener for search logs button
                const searchLogsBtn = document.getElementById('searchLogsBtn');
                if (searchLogsBtn) {
                    searchLogsBtn.addEventListener('click', () => {
                        const searchTerm = document.getElementById('logSearchInput').value;
                        const filterType = document.getElementById('logFilterSelect').value;
                        loadUserLogs(searchTerm, filterType);
                    });
                }

                // Add listener for log search input (real-time search with debounce)
                const logSearchInput = document.getElementById('logSearchInput');
                if (logSearchInput) {
                    let searchTimeout;
                    logSearchInput.addEventListener('input', () => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            const searchTerm = logSearchInput.value;
                            const filterType = document.getElementById('logFilterSelect').value;
                            loadUserLogs(searchTerm, filterType);
                        }, 500); // 500ms debounce
                    });

                    // Also keep Enter key functionality
                    logSearchInput.addEventListener('keyup', (event) => {
                        if (event.key === 'Enter') {
                            clearTimeout(searchTimeout);
                            const searchTerm = logSearchInput.value;
                            const filterType = document.getElementById('logFilterSelect').value;
                            loadUserLogs(searchTerm, filterType);
                        }
                    });
                }

                // Add listener for log filter select (filter changes)
                const logFilterSelect = document.getElementById('logFilterSelect');
                if (logFilterSelect) {
                    logFilterSelect.addEventListener('change', () => {
                        const searchTerm = document.getElementById('logSearchInput').value;
                        const filterType = logFilterSelect.value;
                        loadUserLogs(searchTerm, filterType);
                    });
                }

                // Add listener for send notification button
                const sendNotificationBtn = document.getElementById('send-notification-btn');
                if (sendNotificationBtn) {
                    sendNotificationBtn.addEventListener('click', sendNotification);
                }

                // Add listener for send notification button in the notifications tab
                const sendNotificationTabBtn = document.getElementById('send-notification-tab-btn');
                if (sendNotificationTabBtn) {
                    sendNotificationTabBtn.addEventListener('click', sendNotificationFromTab);
                }

                // Add listener for delete all notifications button
                const deleteAllNotificationsBtn = document.getElementById('deleteAllNotificationsBtn');
                if (deleteAllNotificationsBtn) {
                    deleteAllNotificationsBtn.addEventListener('click', deleteAllNotifications);
                }
            } else {
                console.log("Non-admin user:", user.email);
                adminLoginContainer.style.display = 'block';
                adminDashboard.style.display = 'none';
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginError').textContent = 'You do not have admin privileges.';
            }
        } else {
            console.log("No user authenticated");
            adminLoginContainer.style.display = 'block';
            adminDashboard.style.display = 'none';
        }
        });
    }

    // Admin login button
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (!adminLoginBtn) {
        console.error("Admin login button not found in DOM");
        return;
    }

    adminLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        document.getElementById('loginError').textContent = 'Please enter email and password';
        document.getElementById('loginError').style.display = 'block';
        return;
    }

    adminLoginBtn.disabled = true;
    adminLoginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

        // Check if Firebase auth functions are available
        if (typeof firebase === 'undefined' || !firebase.auth) {
            document.getElementById('loginError').textContent = 'Firebase authentication is not available. Please refresh the page.';
            document.getElementById('loginError').style.display = 'block';
            adminLoginBtn.disabled = false;
            adminLoginBtn.textContent = 'Login';
            return;
        }

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                if (!checkAdmin(userCredential.user.email)) {
                    firebase.auth().signOut();
                    document.getElementById('loginError').textContent = 'Access denied. You need admin privileges.';
                    document.getElementById('loginError').style.display = 'block';
                } else {
                document.getElementById('loginError').style.display = 'none';
                }
            })
            .catch(error => {
                if (error.code === 'auth/user-not-found' && isLocalDevelopment) {
                    console.log("LOCAL DEV: Creating admin account for development");
                    firebase.auth().createUserWithEmailAndPassword(email, password)
                        .then(userCredential => {
                            console.log("LOCAL DEV: Admin account created");
                            document.getElementById('loginError').style.display = 'none';

                            // Set custom display name & add to users collection
                            return Promise.all([
                                userCredential.user.updateProfile({ displayName: "Admin User" }),
                                db.collection('users').doc(userCredential.user.uid).set({
                                name: "Admin User",
                                email: email,
                                isAdmin: true,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                })
                            ]);
                        })
                        .catch(createError => {
                            document.getElementById('loginError').textContent = `Error creating admin account: ${createError.message}`;
                            document.getElementById('loginError').style.display = 'block';
                        });
                } else {
                    document.getElementById('loginError').textContent = error.message;
                    document.getElementById('loginError').style.display = 'block';
                }
            })
            .finally(() => {
                adminLoginBtn.disabled = false;
                adminLoginBtn.textContent = 'Login';
            });
});

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (firebase && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    showToast('Logged out successfully', 'info');
                });
            }
        });
    }

    // Check if running on Netlify
    checkNetlifyEnvironment();
}

// Export user data to Excel
function exportUserData() {
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Exporting...';
    }

    showLoadingOverlay("Preparing user data for export...");

    db.collection('users').get()
        .then(async snapshot => {
            const userData = [];

            // Process each user document
            for (const doc of snapshot.docs) {
                try {
                    const processedUser = await processUserForExport(doc);
                    userData.push(processedUser);
                } catch (error) {
                    console.error("Error processing user:", doc.id, error);
                    // Add a basic entry for failed users
                    const basicData = doc.data() || {};
                    userData.push({
                        'User ID': doc.id,
                        'Name': basicData.name || 'Unknown',
                        'Email': basicData.email || 'No email',
                        'Error': 'Failed to process user data'
                    });
                }
            }

            if (userData.length === 0) {
                throw new Error('No user data to export');
            }

            // Export to Excel
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            exportToExcel(userData, `user_data_${dateString}.xlsx`, 'User Data');

            showToast('User data exported successfully!', 'success');
        })
        .catch(error => {
            console.error("Error exporting user data:", error);
            showToast('Failed to export user data: ' + error.message, 'danger');
        })
        .finally(() => {
            hideLoadingOverlay();
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-file-excel me-1"></i> Export to Excel';
            }
        });
}

// Export to Excel utility function
function exportToExcel(data, filename, sheetName = 'Sheet1') {
    try {
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        if (data.length === 0) {
            throw new Error('No data to export');
        }

        // Get headers from the first row
        const headers = Object.keys(data[0]);

        // Add headers
        worksheet.addRow(headers);

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        data.forEach(row => {
            const values = headers.map(header => row[header] || '');
            worksheet.addRow(values);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength + 2, 50); // Max width of 50
        });

        // Generate Excel file and download
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            saveAs(blob, filename);
        });

    } catch (error) {
        console.error("Error in exportToExcel:", error);
        throw error;
    }
}

// Helper function to process user data for export
async function processUserForExport(doc) {
    try {
        const userData = doc.data() || {};

        // Basic user info
        const result = {
            'User ID': doc.id,
            'Name': userData.name || 'Unknown',
            'Email': userData.email || 'No email',
            'Total Present': 0,
            'Total Absent': 0,
            'Attendance (%)': 0,
            'Last Updated': 'Never'
        };

        // Process last updated
        if (userData.lastUpdated) {
            try {
                if (typeof userData.lastUpdated.toDate === 'function') {
                    result['Last Updated'] = userData.lastUpdated.toDate().toLocaleString();
                } else {
                    result['Last Updated'] = String(userData.lastUpdated);
                }
            } catch (e) {
                console.error("Error formatting date:", e);
            }
        }

        // Process attendance data
        let totalPresent = 0;
        let totalAbsent = 0;

        // Fetch all subjects from the subjects collection first
        try {
            // Get all subjects from the subjects collection
            const subjectsSnapshot = await db.collection('subjects').get();
            const allSubjects = new Set();

            // Add all active subjects from the subjects collection
            subjectsSnapshot.forEach(subjectDoc => {
                const subjectData = subjectDoc.data();
                if (subjectData && subjectData.name) {
                    allSubjects.add(subjectData.name);
                }
            });

            // Also add any subjects from user's attendance data that might not be in the subjects collection
            if (userData.attendanceData && userData.attendanceData.subjects) {
                Object.keys(userData.attendanceData.subjects).forEach(subjectName => {
                    if (subjectName) {
                        allSubjects.add(subjectName);
                    }
                });
            }

            // Process each subject
            if (userData.attendanceData && userData.attendanceData.subjects) {
                const subjects = userData.attendanceData.subjects;

                // Process all subjects (both from subjects collection and user data)
                allSubjects.forEach(subjectName => {
                    // Check if user has this subject data
                    const subjectData = subjects[subjectName] || { present: 0, absent: 0 };
                    const present = subjectData.present || 0;
                    const absent = subjectData.absent || 0;

                    totalPresent += present;
                    totalAbsent += absent;

                    // Add subject details
                    result[`${subjectName} (Present)`] = present;
                    result[`${subjectName} (Absent)`] = absent;

                    // Calculate percentage
                    const total = present + absent;
                    result[`${subjectName} (%)`] = total > 0 ? Math.round((present / total) * 100) : 0;

                    // Add last session info if available
                    if (subjectData.sessions && Array.isArray(subjectData.sessions) && subjectData.sessions.length > 0) {
                        try {
                            const lastSession = subjectData.sessions[subjectData.sessions.length - 1];
                            if (lastSession && lastSession.date) {
                                result[`${subjectName} (Last Session)`] = new Date(lastSession.date).toLocaleString();
                            } else {
                                result[`${subjectName} (Last Session)`] = 'None';
                            }
                        } catch (e) {
                            result[`${subjectName} (Last Session)`] = 'Error';
                        }
                    } else {
                        result[`${subjectName} (Last Session)`] = 'None';
                    }
                });
            }
        } catch (error) {
            console.error("Error processing subjects:", error);
        }

        // Calculate overall attendance percentage
        const totalClasses = totalPresent + totalAbsent;
        result['Total Present'] = totalPresent;
        result['Total Absent'] = totalAbsent;
        result['Attendance (%)'] = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

        return result;
    } catch (error) {
        console.error("Error in processUserForExport:", error);
        throw error;
    }
}

// Export user logs to Excel
function exportUserLogs() {
    const exportBtn = document.getElementById('exportLogsBtn');
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Exporting...';
    }

    db.collection('userLogs').orderBy('timestamp', 'desc').get().then(snapshot => {
            const logsData = [];

            snapshot.forEach(doc => {
                const logData = doc.data();

                let timestamp = 'Unknown';
                if (logData.timestamp) {
                    const date = logData.timestamp.toDate();
                    timestamp = date.toLocaleString();
                }

                // Format log data for Excel with more details
                const logExcelData = {
                    'Log ID': doc.id,
                    'User ID': logData.userId || 'Unknown',
                    'Name': logData.userName || 'Unknown',
                    'Email': logData.userEmail || 'No email',
                    'Activity': logData.activity || 'Unknown',
                    'Timestamp': timestamp,
                    'Date': logData.timestamp ? logData.timestamp.toDate().toLocaleDateString() : 'Unknown',
                    'Time': logData.timestamp ? logData.timestamp.toDate().toLocaleTimeString() : 'Unknown',
                    'IP Address': logData.ipAddress || 'Unknown',
                    'Page': logData.page || 'Unknown',
                    'Browser': logData.browser || 'Unknown',
                    'OS': logData.os || 'Unknown',
                    'Device': logData.device || 'Unknown'
                };

                // Add any additional data if available
                if (logData.additionalData) {
                    if (typeof logData.additionalData === 'object') {
                        Object.entries(logData.additionalData).forEach(([key, value]) => {
                            logExcelData[`Additional_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
                        });
                    } else {
                        logExcelData['Additional Data'] = String(logData.additionalData);
                    }
                }

                logsData.push(logExcelData);
            });

            // Export to Excel
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];
            exportToExcel(logsData, `user_logs_${dateString}.xlsx`, 'User Logs');

            showToast('User logs exported successfully!', 'success');
        })
        .catch(error => {
            console.error("Error exporting user logs:", error);
            showToast('Failed to export user logs: ' + error.message, 'danger');
        })
        .finally(() => {
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-file-excel me-1"></i> Export Logs';
            }
        });
}

// Export deleted reports to Excel
function exportDeletedReports() {
    const exportBtn = document.getElementById('exportDeletedBtn');
    if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Exporting...';
    }

    db.collection('deletedRecords').orderBy('deletedAt', 'desc').get()
        .then(snapshot => {
            const deletedData = [];

            if (snapshot.empty) {
                throw new Error('No deleted records found');
            }

            snapshot.forEach(doc => {
                const recordData = doc.data();

                let deletedAt = 'Unknown';
                if (recordData.deletedAt) {
                    try {
                        const date = recordData.deletedAt.toDate();
                        deletedAt = date.toLocaleString();
                    } catch (error) {
                        console.error("Error formatting deletedAt date:", error);
                        deletedAt = 'Invalid Date';
                    }
                }

                // Format deleted record data for Excel with more details
                const deletedExcelData = {
                    'Record ID': doc.id,
                    'Item Type': recordData.itemType || 'Unknown',
                    'Original ID': recordData.originalId || 'Unknown',
                    'Deleted By': recordData.deletedByName || 'Unknown',
                    'Deleted By Email': recordData.deletedByEmail || 'Unknown',
                    'Deleted At': deletedAt,
                    'Date': recordData.deletedAt ? recordData.deletedAt.toDate().toLocaleDateString() : 'Unknown',
                    'Time': recordData.deletedAt ? recordData.deletedAt.toDate().toLocaleTimeString() : 'Unknown'
                };

                // Add item data details
                if (recordData.itemData) {
                    if (typeof recordData.itemData === 'object') {
                        // For each property in itemData, add it as a column
                        Object.entries(recordData.itemData).forEach(([key, value]) => {
                            // Skip complex objects and arrays, or stringify them
                            if (typeof value !== 'object' || value === null) {
                                deletedExcelData[`Item_${key}`] = value;
                            } else {
                                deletedExcelData[`Item_${key}`] = JSON.stringify(value);
                            }
                        });
                    } else {
                        deletedExcelData['Item Data'] = String(recordData.itemData);
                    }
                }

                deletedData.push(deletedExcelData);
            });

            if (deletedData.length === 0) {
                throw new Error('No deleted records to export');
            }

            // Export to Excel
            const now = new Date();
            const dateString = now.toISOString().split('T')[0];

            try {
                exportToExcel(deletedData, `deleted_records_${dateString}.xlsx`, 'Deleted Records');
                showToast('Deleted records exported successfully!', 'success');
            } catch (error) {
                console.error("Error in Excel export:", error);
                showToast('Error exporting to Excel: ' + error.message, 'danger');
            }
        })
        .catch(error => {
            console.error("Error exporting deleted records:", error);
            showToast('Failed to export deleted records: ' + error.message, 'danger');
        })
        .finally(() => {
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-file-excel me-1"></i> Export Data';
            }
        });
}

// Load user data from Firestore
function loadUserData() {
    if (!checkFirebase()) return;
    console.log("Loading user data for admin panel");
    const usersTableBody = document.getElementById('usersTableBody');
    showLoadingOverlay("Loading user data...");

    db.collection('users').get()
        .then(snapshot => {
            hideLoadingOverlay();
            const userData = [];
            snapshot.forEach(doc => {
                const user = doc.data();
                userData.push({
                    id: doc.id,
                    name: user.name || 'Unknown',
                    email: user.email || 'No email',
                    lastLogin: user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleString() : 'Never',
                    attendanceData: user.attendanceData || { subjects: {} }
                });
            });
            updateUserTable(userData);
            updateDashboardChart(userData);
            updateDashboardStats(userData);
        })
        .catch(error => {
            hideLoadingOverlay();
            console.error("Error loading user data:", error);
            showToast(`Error loading users: ${error.message}`, 'danger');
            if (usersTableBody) {
                usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        });
}

// Load subjects
function loadSubjects() {
    if (!checkFirebase()) return;
    console.log("Loading subjects...");
    const subjectTableBody = document.getElementById('subjectTableBody');
    showLoadingOverlay("Loading subjects...");

    db.collection('subjects').get()
        .then(snapshot => {
            hideLoadingOverlay();
            const subjectsData = [];
            snapshot.forEach(doc => {
                const subject = doc.data();
                subjectsData.push({
                    id: doc.id,
                    name: subject.name || 'Unnamed Subject',
                    classOrder: subject.classOrder || 0,
                    classDays: subject.classDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                });
            });
            updateSubjectsTable(subjectsData);
            updateSubjectsStats(subjectsData);
        })
        .catch(error => {
            hideLoadingOverlay();
            console.error("Error loading subjects:", error);
            showToast(`Error loading subjects: ${error.message}`, 'danger');
            if (subjectTableBody) {
                subjectTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        });
}

// Load user logs
function loadUserLogs(searchTerm = '', filterType = 'all') {
    if (!checkFirebase()) return;
    console.log(`Loading user logs (Search: "${searchTerm}", Filter: "${filterType}")`);
    const userLogsBody = document.getElementById('userLogsBody');
    if (!userLogsBody) return;

    showLoadingOverlay("Loading user logs...");
    db.collection('userLogs').orderBy('timestamp', 'desc').limit(100).get()
        .then(snapshot => {
            hideLoadingOverlay();
            userLogsBody.innerHTML = '';

            if (snapshot.empty) {
                userLogsBody.innerHTML = '<tr><td colspan="6" class="text-center">No user logs found.</td></tr>';
                return;
            }

            let filteredLogs = [];
            snapshot.forEach(doc => {
                const logData = doc.data();

                // Apply search filter
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch =
                        (logData.userName && logData.userName.toLowerCase().includes(searchLower)) ||
                        (logData.userEmail && logData.userEmail.toLowerCase().includes(searchLower)) ||
                        (logData.activity && logData.activity.toLowerCase().includes(searchLower)) ||
                        (logData.page && logData.page.toLowerCase().includes(searchLower));

                    if (!matchesSearch) return;
                }

                // Apply type filter
                if (filterType !== 'all') {
                    if (filterType === 'login' && !logData.activity.toLowerCase().includes('login') && !logData.activity.toLowerCase().includes('logout')) return;
                    if (filterType === 'attendance' && !logData.activity.toLowerCase().includes('attendance')) return;
                    if (filterType === 'view' && !logData.activity.toLowerCase().includes('view') && !logData.activity.toLowerCase().includes('page')) return;
                }

                filteredLogs.push({ id: doc.id, data: logData });
            });

            if (filteredLogs.length === 0) {
                userLogsBody.innerHTML = '<tr><td colspan="6" class="text-center">No logs match your search criteria.</td></tr>';
                return;
            }

            filteredLogs.forEach(log => {
                const logData = log.data;
                const row = document.createElement('tr');

                let timestamp = 'Unknown';
                if (logData.timestamp) {
                    try {
                        timestamp = logData.timestamp.toDate().toLocaleString();
                    } catch (e) {
                        timestamp = 'Invalid date';
                    }
                }

                row.innerHTML = `
                    <td>${logData.userName || 'Unknown'}</td>
                    <td>${logData.userEmail || 'No email'}</td>
                    <td>${logData.activity || 'Unknown'}</td>
                    <td>${timestamp}</td>
                    <td>${logData.ipAddress || 'Unknown'}</td>
                    <td>${logData.device || 'Unknown'}</td>
                `;

                // Add click handler to show details
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => showActivityDetails(log.id, logData));

                userLogsBody.appendChild(row);
            });
        })
        .catch(error => {
            hideLoadingOverlay();
            console.error("Error loading user logs:", error);
            showToast(`Error loading logs: ${error.message}`, 'danger');
            if (userLogsBody) {
                userLogsBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
            if (error.code === 'not-found' || error.message.includes("No document to update")) {
                 createUserLogsCollection();
            }
        });
}

// Load deleted reports
function loadDeletedReports() {
    if (!checkFirebase()) return;
    console.log("Loading deleted reports...");
    const deletedTableBody = document.getElementById('deletedReportsTableBody');
    if (!deletedTableBody) return;

    const deletedSpinner = document.getElementById('deletedSpinner');
    if (deletedSpinner) deletedSpinner.style.display = 'block';

    db.collection('deletedRecords').orderBy('deletedAt', 'desc').get()
        .then(snapshot => {
            if (deletedSpinner) deletedSpinner.style.display = 'none';
            deletedTableBody.innerHTML = '';

            if (snapshot.empty) {
                deletedTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No deleted records found.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const record = doc.data();
                const row = document.createElement('tr');

                let deletedAt = 'Unknown';
                if (record.deletedAt) {
                    try {
                        deletedAt = record.deletedAt.toDate().toLocaleString();
                    } catch (e) {
                        deletedAt = 'Invalid date';
                    }
                }

                // Create a summary of the item data
                let itemSummary = 'No details';
                if (record.itemData) {
                    if (record.itemType === 'subject') {
                        itemSummary = record.itemData.name || 'Unknown Subject';
                    } else if (record.itemType === 'manualAttendance') {
                        itemSummary = `${record.itemData.userName || 'Unknown'} - ${record.itemData.subjectName || 'Unknown'}`;
                    } else {
                        itemSummary = JSON.stringify(record.itemData).substring(0, 50) + '...';
                    }
                }

                row.innerHTML = `
                    <td>${record.itemType || 'Unknown'}</td>
                    <td>${record.originalId || 'Unknown'}</td>
                    <td>${itemSummary}</td>
                    <td>${record.deletedByName || record.deletedBy || 'Unknown'}</td>
                    <td>${deletedAt}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="showDeletedItemDetails('${doc.id}', ${JSON.stringify(record).replace(/"/g, '&quot;')})">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                `;
                deletedTableBody.appendChild(row);
            });
        })
        .catch(error => {
            if (deletedSpinner) deletedSpinner.style.display = 'none';
            console.error("Error loading deleted reports:", error);
            showToast(`Error loading deleted reports: ${error.message}`, 'danger');
            if (deletedTableBody) {
                deletedTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        });
}

// Create user logs collection if it doesn't exist
function createUserLogsCollection() {
    if (!currentUser) {
        showToast('Authentication error. Please reload the page.', 'danger');
        return;
    }

    showToast('Creating user logs collection...', 'info');
    db.collection('userLogs').doc('initial').set({
        userId: 'system',
        userName: 'System',
        userEmail: 'system@example.com',
        activity: 'User logs collection created',
        page: 'Admin Panel',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ipAddress: 'N/A',
        device: 'Admin Panel',
        browser: 'Admin Browser',
        os: 'Admin OS'
    })
    .then(() => {
        showToast('User logs collection created successfully!', 'success');
        loadUserLogs();
    })
    .catch(error => {
        showToast('Error creating user logs collection: ' + error.message, 'danger');
        console.error("Error creating user logs collection:", error);
    });
}

// Clear user logs
function clearUserLogs() {
    if (!confirm('Are you sure you want to clear ALL user logs? This action cannot be undone.')) {
        return;
    }

    const clearBtn = document.getElementById('clearLogsBtn');
    if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Clearing...';
    }

    db.collection('userLogs').get()
        .then(snapshot => {
            if (snapshot.empty) {
                showToast('No logs to clear', 'info');
                return Promise.resolve();
            }

            const batch = db.batch();
            snapshot.forEach(doc => {
                // Skip the initial doc
                if (doc.id !== 'initial') {
                    batch.delete(doc.ref);
                }
            });

            return batch.commit();
        })
        .then(() => {
            showToast('User logs cleared successfully', 'success');
            loadUserLogs();
        })
        .catch(error => {
            console.error("Error clearing user logs:", error);
            showToast('Error clearing logs: ' + error.message, 'danger');
        })
        .finally(() => {
            if (clearBtn) {
                clearBtn.disabled = false;
                clearBtn.innerHTML = '<i class="fas fa-trash me-1"></i>Clear Logs';
            }
        });
}

// Create initial user data function
function createInitialUserData() {
    console.log("Attempting to create initial user data...");

    // First check if the current user is admin
    if (!currentUser || !checkAdmin(currentUser.email)) {
        console.error("Cannot create initial data: not authenticated as admin");
        return;
    }

    setDoc(doc(db, 'users', 'initial'), {
        name: 'Initial User',
        email: 'initial@example.com',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        attendanceData: {
            subjects: {}
        },
        lastUpdated: serverTimestamp()
    })
    .then(() => {
        console.log("Initial user created successfully");
        showToast('Initial user created. You should now be able to see data.', 'success');
        loadUserData(); // Try loading data again
    })
    .catch(error => {
        console.error("Error creating initial user:", error);
        showToast('Error creating initial user: ' + error.message, 'danger');
    });
}

// Sample data creation function
function createSampleUserData() {
    console.log("Creating sample user data...");
    showToast('Creating sample data...', 'info');

    const sampleUsers = [
        {
            name: 'John Doe',
            email: 'john@example.com',
            attendanceData: {
                subjects: {
                    'Computer Science': {
                        present: 15,
                        absent: 2
                    },
                    'Mathematics': {
                        present: 12,
                        absent: 5
                    }
                }
            }
        },
        {
            name: 'Jane Smith',
            email: 'jane@example.com',
            attendanceData: {
                subjects: {
                    'Computer Science': {
                        present: 14,
                        absent: 3
                    },
                    'Mathematics': {
                        present: 16,
                        absent: 1
                    }
                }
            }
        }
    ];

    const batch = db.batch();

    sampleUsers.forEach((user, index) => {
        const userRef = doc(db, 'users', `sample_user_${index}`);
        batch.set(userRef, {
            ...user,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        });
    });

    batch.commit()
        .then(() => {
            console.log("Sample data created");
            showToast('Sample data created successfully!', 'success');
            loadUserData();
        })
        .catch(error => {
            console.error("Error creating sample data:", error);
            showToast('Error creating sample data: ' + error.message, 'danger');
        });
}

// Update user table with data
function updateUserTable(userData) {
    const tableBody = document.querySelector('#adminTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (userData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found.</td></tr>';
        return;
    }

    userData.forEach((user, index) => {
        // Calculate attendance percentage
        let totalPresent = 0;
        let totalAbsent = 0;

        if (user.attendanceData && user.attendanceData.subjects) {
            Object.values(user.attendanceData.subjects).forEach(subject => {
                totalPresent += subject.present || 0;
                totalAbsent += subject.absent || 0;
            });
        }

        const totalClasses = totalPresent + totalAbsent;
        const attendancePercent = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

        // Store attendance percentage for chart
        user.attendancePercent = attendancePercent;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>
                <span class="badge ${attendancePercent >= 75 ? 'bg-success' : attendancePercent >= 50 ? 'bg-warning' : 'bg-danger'}">
                    ${attendancePercent}%
                </span>
            </td>
            <td>${user.lastLogin || 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="showUserDetails(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Show the table container
    const tableContainer = document.getElementById('adminTableContainer');
    const spinner = document.getElementById('spinner');
    if (tableContainer) tableContainer.style.display = 'block';
    if (spinner) spinner.style.display = 'none';
}

// Update subjects table
function updateSubjectsTable(subjectsData) {
    const subjectsList = document.getElementById('subjectsList');
    if (!subjectsList) return;

    subjectsList.innerHTML = '';

    if (subjectsData.length === 0) {
        subjectsList.innerHTML = '<li class="list-group-item text-center">No subjects found.</li>';
        return;
    }

    // Sort subjects by class order
    subjectsData.sort((a, b) => (a.classOrder || 0) - (b.classOrder || 0));

    subjectsData.forEach(subject => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

        const classDaysText = Array.isArray(subject.classDays) ? subject.classDays.join(', ') : 'No days set';

        listItem.innerHTML = `
            <div>
                <h6 class="mb-1">${subject.name}</h6>
                <small class="text-muted">Days: ${classDaysText}</small>
                ${subject.classOrder ? `<br><small class="text-muted">Order: ${subject.classOrder}</small>` : ''}
            </div>
            <div>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="editSubject('${subject.id}', ${JSON.stringify(subject).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSubject('${subject.id}', '${subject.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        subjectsList.appendChild(listItem);
    });
}

// Load attendance form data (populate dropdowns)
function loadAttendanceFormData() {
    // Load users for attendance form
    const userSelect = document.getElementById('attendanceUserSelect');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">Loading users...</option>';

        db.collection('users').get()
            .then(snapshot => {
                userSelect.innerHTML = '<option value="">Select a user</option>';
                snapshot.forEach(doc => {
                    const user = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${user.name || 'Unknown'} (${user.email || 'No email'})`;
                    userSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error("Error loading users for attendance form:", error);
                userSelect.innerHTML = '<option value="">Error loading users</option>';
            });
    }

    // Load subjects for attendance form
    const subjectSelect = document.getElementById('attendanceSubjectSelect');
    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Loading subjects...</option>';

        db.collection('subjects').get()
            .then(snapshot => {
                subjectSelect.innerHTML = '<option value="">Select a subject</option>';
                snapshot.forEach(doc => {
                    const subject = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = subject.name || 'Unknown Subject';
                    subjectSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error("Error loading subjects for attendance form:", error);
                subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
            });
    }

    // Set today's date as default
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

// Load recent attendance records
function loadRecentAttendance() {
    if (!checkFirebase()) return;
    console.log("Loading recent attendance...");

    const attendanceTableBody = document.getElementById('recentAttendanceBody');
    if (!attendanceTableBody) return;

    // Loading overlay removed

    db.collection('manualAttendance').orderBy('createdAt', 'desc').limit(20).get()
        .then(snapshot => {
            // Loading overlay removed
            attendanceTableBody.innerHTML = '';

            if (snapshot.empty) {
                attendanceTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance records found.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const record = doc.data();
                const row = document.createElement('tr');

                let createdAt = 'Unknown';
                if (record.createdAt) {
                    try {
                        createdAt = record.createdAt.toDate().toLocaleString();
                    } catch (e) {
                        createdAt = 'Invalid date';
                    }
                }

                row.innerHTML = `
                    <td>${record.userName || 'Unknown'}</td>
                    <td>${record.subjectName || 'Unknown'}</td>
                    <td>${record.date || 'Unknown'}</td>
                    <td>
                        <span class="badge ${record.status === 'present' ? 'bg-success' : 'bg-danger'}">
                            ${record.status || 'Unknown'}
                        </span>
                    </td>
                    <td>${createdAt}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="editAttendanceRecord('${doc.id}', ${JSON.stringify(record).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendanceRecord('${doc.id}', ${JSON.stringify(record).replace(/"/g, '&quot;')})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                attendanceTableBody.appendChild(row);
            });
        })
        .catch(error => {
            // Loading overlay removed
            console.error("Error loading recent attendance:", error);
            attendanceTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;

            // If collection doesn't exist, create it
            if (error.code === 'not-found' || error.message.includes("No document to update")) {
                createManualAttendanceCollection();
            }
        });
}

// Load dashboard stats
function loadDashboardStats() {
    if (!checkFirebase()) return;
    console.log("Loading dashboard stats...");

    Promise.all([
        db.collection('users').get(),
        db.collection('subjects').get(),
        db.collection('manualAttendance').get()
    ])
    .then(([usersSnapshot, subjectsSnapshot, attendanceSnapshot]) => {
        // Update total users
        const totalUsersElement = document.getElementById('totalUsersStat');
        if (totalUsersElement) {
            totalUsersElement.textContent = usersSnapshot.size;
        }

        // Update total subjects
        const totalSubjectsElement = document.getElementById('totalSubjectsStat');
        if (totalSubjectsElement) {
            totalSubjectsElement.textContent = subjectsSnapshot.size;
        }

        // Calculate average attendance from user data
        let totalAttendancePercent = 0;
        let usersWithAttendance = 0;

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.attendanceData && user.attendanceData.subjects) {
                let totalPresent = 0;
                let totalAbsent = 0;

                Object.values(user.attendanceData.subjects).forEach(subject => {
                    totalPresent += subject.present || 0;
                    totalAbsent += subject.absent || 0;
                });

                const totalClasses = totalPresent + totalAbsent;
                if (totalClasses > 0) {
                    const attendancePercent = Math.round((totalPresent / totalClasses) * 100);
                    totalAttendancePercent += attendancePercent;
                    usersWithAttendance++;
                }
            }
        });

        const avgAttendance = usersWithAttendance > 0 ? Math.round(totalAttendancePercent / usersWithAttendance) : 0;
        const avgAttendanceElement = document.getElementById('avgAttendanceStat');
        if (avgAttendanceElement) {
            avgAttendanceElement.textContent = `${avgAttendance}%`;
        }
    })
    .catch(error => {
        console.error("Error loading dashboard stats:", error);
        showToast(`Error loading dashboard stats: ${error.message}`, 'danger');
    });
}

// Update subjects stats
function updateSubjectsStats(subjectsData) {
    const totalSubjectsElement = document.getElementById('totalSubjectsStat');
    if (totalSubjectsElement) {
        totalSubjectsElement.textContent = subjectsData.length;
    }
}

// Update dashboard stats
function updateDashboardStats(userData) {
    // Update total users stat
    const totalUsersElement = document.getElementById('totalUsersStat');
    if (totalUsersElement) {
        totalUsersElement.textContent = userData.length;
    }

    // Calculate average attendance
    let totalAttendancePercent = 0;
    let usersWithAttendance = 0;

    userData.forEach(user => {
        if (user.attendancePercent > 0) {
            totalAttendancePercent += user.attendancePercent;
            usersWithAttendance++;
        }
    });

    const avgAttendance = usersWithAttendance > 0 ? Math.round(totalAttendancePercent / usersWithAttendance) : 0;
    const avgAttendanceElement = document.getElementById('avgAttendanceStat');
    if (avgAttendanceElement) {
        avgAttendanceElement.textContent = `${avgAttendance}%`;
    }
}

// Show user details in modal
function showUserDetails(user) {
    document.getElementById('modalUserName').textContent = user.name;
    document.getElementById('modalUserEmail').textContent = user.email;

    const subjectsTbody = document.getElementById('modalUserSubjects');
    subjectsTbody.innerHTML = '';
    const subjects = user.attendanceData?.subjects || {};
    const labels = [];
    const presentData = [];

    if(Object.keys(subjects).length > 0) {
        for(const subjectName in subjects) {
            const subject = subjects[subjectName];
            const total = (subject.present || 0) + (subject.absent || 0);
            subjectsTbody.innerHTML += `
                <tr>
                    <td>${subjectName}</td>
                    <td>${subject.present || 0}</td>
                    <td>${subject.absent || 0}</td>
                    <td>${total}</td>
                </tr>
            `;
            labels.push(subjectName);
            presentData.push(subject.present || 0);
        }
    } else {
        subjectsTbody.innerHTML = '<tr><td colspan="4" class="text-center">No attendance data available.</td></tr>';
    }

    updateUserAttendanceChart(labels, presentData);

    const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
    modal.show();
}

// Create sample subjects function
function createSampleSubjects() {
    console.log("Creating sample subjects...");
    showToast('Creating sample subjects...', 'info');

    const sampleSubjects = [
        {
            name: 'Computer Science',
            classDays: ['Monday', 'Wednesday', 'Friday'],
            classOrder: 1
        },
        {
            name: 'Mathematics',
            classDays: ['Tuesday', 'Thursday'],
            classOrder: 2
        },
        {
            name: 'Physics',
            classDays: ['Monday', 'Thursday'],
            classOrder: 3
        }
    ];

    const batch = db.batch();

    sampleSubjects.forEach((subject, index) => {
        const subjectRef = doc(db, 'subjects', `sample_subject_${index}`);
        batch.set(subjectRef, {
            ...subject,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        });
    });

    batch.commit()
        .then(() => {
            console.log("Sample subjects created");
            showToast('Sample subjects created successfully!', 'success');
            loadSubjects();
        })
        .catch(error => {
            console.error("Error creating sample subjects:", error);
            showToast('Error creating sample subjects: ' + error.message, 'danger');
        });
}

// Add subject
function addSubject() {
    const subjectNameInput = document.getElementById('subjectName');
    const name = subjectNameInput.value.trim();
    if(!name) {
        showToast('Please enter a subject name.', 'warning');
        return;
    }

    // Get all selected days
    const selectedDays = [];
    document.querySelectorAll('.class-day-checkbox:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
    });

    if(selectedDays.length === 0) {
        showToast('Please select at least one class day.', 'warning');
        return;
    }

    // Get class order
    const classOrder = parseInt(document.getElementById('classOrder').value) || null;

    const addBtn = document.getElementById('addSubjectBtn');
    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

    // Check if we have the current user
    if (!currentUser) {
        showToast('Authentication error. Please reload the page.', 'danger');
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Add Subject';
        return;
    }

    db.collection('subjects').add({
        name: name,
        classDays: selectedDays,
        classOrder: classOrder,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showToast('Subject added successfully!', 'success');
        subjectNameInput.value = '';
        document.getElementById('classOrder').value = '';
        // Clear checkbox selections
        document.querySelectorAll('.class-day-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        loadSubjects();
    })
    .catch(error => {
        console.error("Error adding subject: ", error);

        // If permission denied, try to create the collection first
        if (error.code === 'permission-denied') {
            setDoc(doc(db, 'subjects', 'initial'), {
                createdBy: currentUser.uid,
                createdAt: serverTimestamp(),
                name: 'Initial Subject',
                classDays: ['Monday'],
                classOrder: 1
            })
            .then(() => {
                // Now try to add the actual subject
                return db.collection('subjects').add({
                    name: name,
                    classDays: selectedDays,
                    classOrder: classOrder,
                    createdBy: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                showToast('Subject added successfully!', 'success');
                subjectNameInput.value = '';
                document.getElementById('classOrder').value = '';
                // Clear checkbox selections
                document.querySelectorAll('.class-day-checkbox').forEach(checkbox => {
                    checkbox.checked = false;
                });
                loadSubjects();
            })
            .catch(innerError => {
                showToast('Error adding subject: ' + innerError.message, 'danger');
                console.error("Error in second attempt:", innerError);
            });
        } else {
            showToast('Error adding subject: ' + error.message, 'danger');
        }
    })
    .finally(() => {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Add Subject';
    });
}

// Delete subject
function deleteSubject(id, name) {
    if (!confirm(`Are you sure you want to delete the subject "${name}"? This action will remove it from all user reports as well.`)) {
        return;
    }

    showLoadingOverlay(`Deleting subject "${name}"...`);

    // First, backup the subject data
    db.collection('subjects').doc(id).get()
        .then(doc => {
            if (doc.exists()) {
                const subjectData = doc.data();

                // Store in deletedRecords collection
                return db.collection('deletedRecords').add({
                    type: 'subject',
                    data: subjectData,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deletedBy: auth.currentUser ? auth.currentUser.email : 'unknown'
                });
            }
            return Promise.resolve();
        })
        .then(() => {
            // Find all users that have this subject in their attendance data
            return db.collection('users').get();
        })
        .then(usersSnapshot => {
            // Batch operation for users cleanup
            const batch = db.batch();
            let usersUpdated = 0;

            usersSnapshot.forEach(userDoc => {
                const userData = userDoc.data();

                // Check if user has attendance data and this specific subject
                if (userData.attendanceData &&
                    userData.attendanceData.subjects &&
                    userData.attendanceData.subjects[name]) {

                    // Create a new subjects object without the deleted subject
                    const updatedSubjects = {};
                    Object.keys(userData.attendanceData.subjects).forEach(subject => {
                        if (subject !== name) {
                            updatedSubjects[subject] = userData.attendanceData.subjects[subject];
                        }
                    });

                    // Update user's today's classes if needed
                    let updatedTodaysClasses = userData.attendanceData.todaysClasses || [];
                    if (Array.isArray(updatedTodaysClasses)) {
                        updatedTodaysClasses = updatedTodaysClasses.filter(cls => cls.subject !== name);
                    }

                    // Update user document
                    const userRef = doc(db, 'users', userDoc.id);
                    batch.update(userRef, {
                        'attendanceData.subjects': updatedSubjects,
                        'attendanceData.todaysClasses': updatedTodaysClasses,
                        lastUpdated: serverTimestamp()
                    });

                    usersUpdated++;
                }
            });

            // Commit batch update
            return batch.commit().then(() => {
                return { usersUpdated };
            });
        })
        .then(result => {
            // Now delete the subject
            return db.collection('subjects').doc(id).delete()
                .then(() => result);
        })
        .then(result => {
            hideLoadingOverlay();
            showToast(`Subject "${name}" deleted successfully. Updated ${result.usersUpdated} user records.`, 'success');
            loadSubjects();
        })
        .catch(error => {
            hideLoadingOverlay();
            showToast('Error deleting subject: ' + error.message, 'danger');
            console.error("Error deleting subject:", error);
        });
}

// Update Dashboard Chart
function updateDashboardChart(users) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    const fallback = document.getElementById('attendanceChartFallback');
    // Filter out users with no attendance data
    const usersWithData = users.filter(u => u.attendancePercent > 0);
    if (attendanceChartInstance) attendanceChartInstance.destroy();
    if (usersWithData.length === 0) {
        fallback.style.display = '';
        return;
    } else {
        fallback.style.display = 'none';
    }
    attendanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: usersWithData.map(u => u.name),
            datasets: [{
                label: 'Attendance %',
                data: usersWithData.map(u => u.attendancePercent),
                backgroundColor: 'rgba(74, 21, 75, 0.8)',
                borderRadius: 8,
                maxBarThickness: 48
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#7b7b93', font: { weight: 600 } }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#f3e6f7' },
                    ticks: { color: '#7b7b93', font: { weight: 600 }, stepSize: 20 }
                }
            }
        }
    });
}

function updateUserAttendanceChart(labels, data) {
    const ctx = document.getElementById('userAttendanceChart').getContext('2d');

    // If no data, show a message
    if (labels.length === 0 || data.every(val => val === 0)) {
        if (userAttendanceChartInstance) {
            userAttendanceChartInstance.destroy();
            userAttendanceChartInstance = null;
        }

        // Display a message in the chart area
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No attendance data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    if (userAttendanceChartInstance) {
        userAttendanceChartInstance.destroy();
    }

    userAttendanceChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Present Days',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)'
                ],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Edit subject
function editSubject(id, subject) {
    // Populate the edit form with subject data
    document.getElementById('editSubjectId').value = id;
    document.getElementById('editSubjectName').value = subject.name || '';

    // Set class order if available
    document.getElementById('editClassOrder').value = subject.classOrder || '';

    // Reset all checkboxes first
    document.querySelectorAll('.edit-class-day-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Check the days that this subject is taught
    if (subject.classDays && Array.isArray(subject.classDays)) {
        subject.classDays.forEach(day => {
            const checkbox = document.getElementById('edit' + day);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editSubjectModal'));
    modal.show();
}

// Update subject changes
function updateSubject() {
    const id = document.getElementById('editSubjectId').value;
    const name = document.getElementById('editSubjectName').value.trim();

    if (!name) {
        showToast('Please enter a subject name.', 'warning');
        return;
    }

    // Get all selected days
    const selectedDays = [];
    document.querySelectorAll('.edit-class-day-checkbox:checked').forEach(checkbox => {
        selectedDays.push(checkbox.value);
    });

    if (selectedDays.length === 0) {
        showToast('Please select at least one class day.', 'warning');
        return;
    }

    // Get class order
    const classOrder = parseInt(document.getElementById('editClassOrder').value) || null;

    const saveBtn = document.getElementById('saveSubjectChanges');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    db.collection('subjects').doc(id).update({
        name: name,
        classDays: selectedDays,
        classOrder: classOrder,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('editSubjectModal')).hide();
        showToast('Subject updated successfully!', 'success');
        loadSubjects();
    })
    .catch(error => {
        console.error("Error updating subject:", error);
        showToast('Error updating subject: ' + error.message, 'danger');
    })
    .finally(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes';
    });
}

// Edit attendance record
function editAttendanceRecord(recordId, recordData) {
    // Populate the edit form with record data
    document.getElementById('editAttendanceId').value = recordId;
    document.getElementById('editAttendanceUser').value = recordData.userName;
    document.getElementById('editAttendanceSubject').value = recordData.subjectName;
    document.getElementById('editAttendanceDate').value = recordData.date;
    document.getElementById('editAttendanceNotes').value = recordData.notes || '';

    // Set status radio button
    if (recordData.status === 'present') {
        document.getElementById('editStatusPresent').checked = true;
    } else {
        document.getElementById('editStatusAbsent').checked = true;
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editAttendanceModal'));
    modal.show();
}

// Update attendance record
function updateAttendanceRecord() {
    const recordId = document.getElementById('editAttendanceId').value;
    const date = document.getElementById('editAttendanceDate').value;
    const status = document.querySelector('input[name="editAttendanceStatus"]:checked').value;
    const notes = document.getElementById('editAttendanceNotes').value.trim();

    if (!date) {
        showToast('Please select a date.', 'warning');
        return;
    }

    const saveBtn = document.getElementById('saveAttendanceChanges');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    // First get the original record to check if status has changed
    db.collection('manualAttendance').doc(recordId).get()
        .then(doc => {
            const originalData = doc.data();
            const statusChanged = originalData.status !== status;
            const userId = originalData.userId;
            const subjectName = originalData.subjectName;

            // Update the attendance record
            return db.collection('manualAttendance').doc(recordId).update({
                date: date,
                status: status,
                notes: notes,
                updatedById: currentUser.uid,
                updatedByName: 'Admin',
                updatedByEmail: currentUser.email,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => ({ statusChanged, userId, subjectName, originalStatus: originalData.status }));
        })
        .then(({ statusChanged, userId, subjectName, originalStatus }) => {
            // If status changed, update the user's attendance data
            if (statusChanged && userId && subjectName) {
                return db.collection('users').doc(userId).get().then(doc => {
                    const userData = doc.data() || {};
                    const attendanceData = userData.attendanceData || { subjects: {} };

                    // Initialize subject data if it doesn't exist
                    if (!attendanceData.subjects[subjectName]) {
                        attendanceData.subjects[subjectName] = { present: 0, absent: 0 };
                    }

                    // Decrement the original status count
                    if (originalStatus === 'present') {
                        attendanceData.subjects[subjectName].present = Math.max(0, (attendanceData.subjects[subjectName].present || 0) - 1);
                    } else {
                        attendanceData.subjects[subjectName].absent = Math.max(0, (attendanceData.subjects[subjectName].absent || 0) - 1);
                    }

                    // Increment the new status count
                    if (status === 'present') {
                        attendanceData.subjects[subjectName].present += 1;
                    } else {
                        attendanceData.subjects[subjectName].absent += 1;
                    }

                    // Update the user document with the new attendance data
                    return db.collection('users').doc(userId).update({
                        attendanceData: attendanceData,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            }
            return Promise.resolve();
        })
        .then(() => {
            bootstrap.Modal.getInstance(document.getElementById('editAttendanceModal')).hide();
            showToast('Attendance record updated successfully!', 'success');
            loadRecentAttendance();

            // Also refresh user data to update stats
            loadUserData();
        })
        .catch(error => {
            console.error("Error updating attendance:", error);
            showToast('Error updating attendance: ' + error.message, 'danger');
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes';
        });
}

// Delete attendance record
function deleteAttendanceRecord(recordId, recordData) {
    if (!confirm(`Are you sure you want to delete this attendance record for ${recordData.userName}?`)) {
        return;
    }

    // First, save the record to the deleted records collection
    db.collection('deletedRecords').add({
        itemType: 'manualAttendance',
        originalId: recordId,
        itemData: recordData,
        deletedById: currentUser.uid,
        deletedByName: 'Admin',
        deletedByEmail: currentUser.email,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Now delete the record
        return db.collection('manualAttendance').doc(recordId).delete();
    })
    .then(() => {
        // Update the user's attendance data
        return db.collection('users').doc(recordData.userId).get().then(doc => {
            const userData = doc.data() || {};
            const attendanceData = userData.attendanceData || { subjects: {} };

            // Initialize subject data if it doesn't exist
            if (!attendanceData.subjects[recordData.subjectName]) {
                attendanceData.subjects[recordData.subjectName] = { present: 0, absent: 0 };
            }

            // Decrement the status count
            if (recordData.status === 'present') {
                attendanceData.subjects[recordData.subjectName].present = Math.max(0, (attendanceData.subjects[recordData.subjectName].present || 0) - 1);
            } else {
                attendanceData.subjects[recordData.subjectName].absent = Math.max(0, (attendanceData.subjects[recordData.subjectName].absent || 0) - 1);
            }

            // Update the user document with the new attendance data
            return db.collection('users').doc(recordData.userId).update({
                attendanceData: attendanceData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    })
    .then(() => {
        showToast('Attendance record deleted successfully!', 'success');
        loadRecentAttendance();

        // Also refresh user data to update stats
        loadUserData();
    })
    .catch(error => {
        console.error("Error deleting attendance:", error);
        showToast('Error deleting attendance: ' + error.message, 'danger');
    });
}

// Toast notifications
function showToast(msg, type = 'primary') {
    const toast = document.getElementById('adminToast');
    const toastBody = document.getElementById('toastBody');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toastBody.textContent = msg;
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Check if user is admin
function checkAdmin(email) {
    // Debug info
    console.log("Checking admin status for:", email);
    console.log("Is local development:", isLocalDevelopment);

    // In development mode, allow any email with @admin.com to be admin
    if (isLocalDevelopment && email && email.endsWith('@admin.com')) {
        console.log("Development environment: granting admin access to", email);
        return true; // Allow any @admin.com email to be admin in development
    }

    // For 127.0.0.1 or localhost, also bypass for testing
    if ((window.location.hostname === '127.0.0.1' ||
         window.location.hostname === 'localhost' ||
         window.location.hostname.includes('192.168')) &&
        email) {
        console.log("Local testing: granting admin access to", email);
        return true;
    }

    // In production, check against the admin email list
    const isAdmin = adminEmails.includes(email);
    console.log("Production check:", email, "is admin:", isAdmin);
    return isAdmin;
}

// Check if running on Netlify and show Firebase rules information
function checkNetlifyEnvironment() {
    console.log("Checking if running on Netlify...");

    // Check if we're on Netlify by looking at the hostname
    const isNetlify = window.location.hostname.includes('netlify.app') ||
                      window.location.hostname.includes('netlify.com');

    // Check for potential CORS issues
    checkCorsIssues();

    if (isNetlify) {
        console.log("Running on Netlify domain:", window.location.hostname);

        // Create a dismissible warning at the top of the page
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning alert-dismissible fade show mx-3 mt-3';
        warningDiv.innerHTML = `
            <strong>Netlify Deployment Notice:</strong>
            If you're seeing this message and data is not loading, you need to update your Firebase Security Rules.
            Add the domain <code>${window.location.hostname}</code> to your authorized domains in Firebase console.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <div class="mt-2">
                <button class="btn btn-sm btn-info" id="showFirebaseRulesBtn">Show Firebase Rules Tips</button>
            </div>
        `;

        // Insert the warning at the top of the body
        document.body.insertBefore(warningDiv, document.body.firstChild);

        // Add event listener to the button
        document.getElementById('showFirebaseRulesBtn').addEventListener('click', showFirebaseRulesTips);
    }
}

// Show Firebase rules tips
function showFirebaseRulesTips() {
    // Create modal if it doesn't exist
    if (!document.getElementById('rulesModal')) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'rulesModal';
        modalDiv.setAttribute('tabindex', '-1');
        modalDiv.setAttribute('aria-labelledby', 'rulesModalLabel');
        modalDiv.setAttribute('aria-hidden', 'true');

        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="rulesModalLabel">Firebase Rules for Netlify Deployment</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>To ensure all features work correctly, especially on a live server like Netlify, you need to configure your Firebase Security Rules.</p>

                        <h6 class="mt-3">Step 1: Add Netlify domain to Firebase Authentication</h6>
                        <ol>
                            <li>Go to the <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a>.</li>
                            <li>Select your project.</li>
                            <li>Go to <strong>Authentication → Settings → Authorized Domains</strong>.</li>
                            <li>Click <strong>Add domain</strong> and enter: <code>${window.location.hostname}</code></li>
                        </ol>

                        <h6 class="mt-3">Step 2: Update Firestore Security Rules</h6>
                        <p>Go to <strong>Firestore Database → Rules</strong> and replace the entire content with the following rules. These rules ensure that only admins can manage data, while users can read what they need.</p>
                        <div class="alert alert-warning"><strong>Important:</strong> Replace <code>'admin@admin.com'</code> in the rules with your actual admin email address.</div>
                        <pre class="bg-light p-3 border rounded"><code>rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check for admin role
    function isAdmin() {
      return request.auth != null && request.auth.token.email in ['admin@admin.com'];
    }

    // Rule for user data: users can manage their own data. Admins can manage any user's data.
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId || isAdmin();
    }

    // Rule for subjects: any authenticated user can read, only admins can write.
    match /subjects/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Rule for notifications: any authenticated user can read, only admins can manage.
    match /notifications/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isAdmin();
    }

    // Rules for admin-only collections
    match /userLogs/{docId} {
        allow read, write: if isAdmin();
    }
    match /deletedRecords/{docId} {
        allow read, write: if isAdmin();
    }
    match /manualAttendance/{docId} {
        allow read, write: if isAdmin();
    }
  }
}</code></pre>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }

    // Show the modal
    const rulesModal = new bootstrap.Modal(document.getElementById('rulesModal'));
    rulesModal.show();
}

// Check for potential CORS issues
function checkCorsIssues() {
    // Make a simple test request to Firestore
    console.log("Testing Firestore connectivity...");
    db.collection('subjects').doc('initial').get()
        .then(() => {
            console.log("✅ Firestore connection successful");
        })
        .catch(error => {
            console.error("❌ Firestore connection error:", error);

            // Check if it's a CORS error
            if (error.code === 'permission-denied' || error.name === 'FirebaseError') {
                console.warn("This may be a Firebase rules or CORS issue");

                // Create a toast notification
                showToast('Firebase connectivity issue detected. Check console for details.', 'warning');
            }
        });
}

// Create manual attendance collection if it doesn't exist
function createManualAttendanceCollection() {
    if (!currentUser) {
        showToast('Authentication error. Please reload the page.', 'danger');
        return;
    }

    showToast('Creating manual attendance collection...', 'info');
    setDoc(doc(db, 'manualAttendance', 'initial'), {
        userId: 'initial',
        userName: 'Initial User',
        userEmail: 'initial@example.com',
        subjectId: 'initial',
        subjectName: 'Initial Subject',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        notes: 'Initial record to establish collection',
        addedById: currentUser.uid,
        addedByName: 'Admin',
        addedByEmail: currentUser.email,
        createdAt: serverTimestamp()
    })
    .then(() => {
        showToast('Manual attendance collection created successfully!', 'success');
        loadRecentAttendance();
    })
    .catch(error => {
        showToast('Error creating manual attendance collection: ' + error.message, 'danger');
        console.error("Error creating manual attendance collection:", error);
    });
}

// Add manual attendance record
function addManualAttendance() {
    const userId = document.getElementById('attendanceUserSelect').value;
    const subjectId = document.getElementById('attendanceSubjectSelect').value;
    const date = document.getElementById('attendanceDate').value;
    const status = document.querySelector('input[name="attendanceStatus"]:checked')?.value;
    const notes = document.getElementById('attendanceNotes').value.trim();

    if (!userId) {
        showToast('Please select a user.', 'warning');
        return;
    }

    if (!subjectId) {
        showToast('Please select a subject.', 'warning');
        return;
    }

    if (!date) {
        showToast('Please select a date.', 'warning');
        return;
    }

    if (!status) {
        showToast('Please select a status.', 'warning');
        return;
    }

    const addBtn = document.getElementById('addAttendanceBtn');
    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';

    // Get user and subject details
    Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('subjects').doc(subjectId).get()
    ])
    .then(([userDoc, subjectDoc]) => {
        if (!userDoc.exists()) {
            throw new Error('User not found');
        }

        if (!subjectDoc.exists()) {
            throw new Error('Subject not found');
        }

        const userData = userDoc.data();
        const subjectData = subjectDoc.data();

        // Create attendance record
        return db.collection('manualAttendance').add({
            userId: userId,
            userName: userData.name || userData.email || 'Unknown',
            userEmail: userData.email || 'No email',
            subjectId: subjectId,
            subjectName: subjectData.name || 'Unknown Subject',
            date: date,
            status: status,
            notes: notes,
            addedById: currentUser.uid,
            addedByName: 'Admin',
            addedByEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => ({ userData, subjectData }));
    })
    .then(({ userData, subjectData }) => {
        // Update the user's attendance data
        const attendanceData = userData.attendanceData || { subjects: {} };
        const subjectName = subjectData.name;

        // Initialize subject data if it doesn't exist
        if (!attendanceData.subjects[subjectName]) {
            attendanceData.subjects[subjectName] = { present: 0, absent: 0 };
        }

        // Update the attendance count
        if (status === 'present') {
            attendanceData.subjects[subjectName].present = (attendanceData.subjects[subjectName].present || 0) + 1;
        } else {
            attendanceData.subjects[subjectName].absent = (attendanceData.subjects[subjectName].absent || 0) + 1;
        }

        // Update the user document with the new attendance data
        return db.collection('users').doc(userId).update({
            attendanceData: attendanceData,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    })
    .then(() => {
        showToast('Attendance record added successfully!', 'success');

        // Clear form
        document.getElementById('attendanceUserSelect').value = '';
        document.getElementById('attendanceSubjectSelect').value = '';
        document.getElementById('attendanceNotes').value = '';
        document.getElementById('statusPresent').checked = true;

        // Reload attendance data
        loadRecentAttendance();

        // Also refresh user data to update stats
        loadUserData();
    })
    .catch(error => {
        console.error("Error adding attendance:", error);
        showToast('Error adding attendance: ' + error.message, 'danger');
    })
    .finally(() => {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Add Attendance';
    });
}

// Show activity details in a modal
function showActivityDetails(logId, logData) {
    // Set up the modal content
    document.getElementById('activityDetailsTitle').textContent = `Activity Details: ${logData.activity || 'Unknown'}`;

    const detailsContainer = document.getElementById('activityDetailsContent');
    if (!detailsContainer) return;

    // Format timestamp
    let timestamp = 'Unknown';
    if (logData.timestamp) {
        const date = logData.timestamp.toDate();
        timestamp = date.toLocaleString();
    }

    // Build HTML content with all available details
    let htmlContent = `
        <div class="card mb-3">
            <div class="card-header bg-light">
                <h5 class="mb-0">Basic Information</h5>
            </div>
            <div class="card-body">
                <table class="table table-sm">
                    <tr>
                        <th style="width: 30%">User:</th>
                        <td>${logData.userName || 'Unknown'} (${logData.userEmail || 'No email'})</td>
                    </tr>
                    <tr>
                        <th>Activity:</th>
                        <td>${logData.activity || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Timestamp:</th>
                        <td>${timestamp}</td>
                    </tr>
                    <tr>
                        <th>Page:</th>
                        <td>${logData.page || 'Unknown'}</td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header bg-light">
                <h5 class="mb-0">System Information</h5>
            </div>
            <div class="card-body">
                <table class="table table-sm">
                    <tr>
                        <th style="width: 30%">IP Address:</th>
                        <td>${logData.ipAddress || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Browser:</th>
                        <td>${logData.browser || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Operating System:</th>
                        <td>${logData.os || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Device:</th>
                        <td>${logData.device || 'Unknown'}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    // Add additional data if available
    if (logData.additionalData) {
        htmlContent += `
            <div class="card">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Additional Data</h5>
                </div>
                <div class="card-body">
                    <pre class="mb-0" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(logData.additionalData, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    detailsContainer.innerHTML = htmlContent;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('activityDetailsModal'));
    modal.show();
}

// Show deleted item details in a modal
function showDeletedItemDetails(recordId, recordData) {
    // Set up the modal content
    document.getElementById('deletedDetailsTitle').textContent = `Deleted ${recordData.itemType || 'Item'} Details`;

    const detailsContainer = document.getElementById('deletedDetailsContent');
    if (!detailsContainer) return;

    // Format timestamp
    let deletedAt = 'Unknown';
    if (recordData.deletedAt) {
        const date = recordData.deletedAt.toDate();
        deletedAt = date.toLocaleString();
    }

    // Build HTML content with all available details
    let htmlContent = `
        <div class="card mb-3">
            <div class="card-header bg-light">
                <h5 class="mb-0">Deletion Information</h5>
            </div>
            <div class="card-body">
                <table class="table table-sm">
                    <tr>
                        <th style="width: 30%">Item Type:</th>
                        <td>${recordData.itemType || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Original ID:</th>
                        <td>${recordData.originalId || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Deleted By:</th>
                        <td>${recordData.deletedByName || 'Unknown'} (${recordData.deletedByEmail || 'No email'})</td>
                    </tr>
                    <tr>
                        <th>Deleted At:</th>
                        <td>${deletedAt}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    // Add item data if available
    if (recordData.itemData) {
        htmlContent += `
            <div class="card">
                <div class="card-header bg-light">
                    <h5 class="mb-0">Item Data</h5>
                </div>
                <div class="card-body">
                    <pre class="mb-0" style="max-height: 300px; overflow-y: auto;">${JSON.stringify(recordData.itemData, null, 2)}</pre>
                </div>
            </div>
        `;

        // Add restore button if it's a restorable item type
        if (['subject', 'manualAttendance'].includes(recordData.itemType)) {
            htmlContent += `
                <div class="mt-3">
                    <button id="restoreItemBtn" class="btn btn-warning">
                        <i class="fas fa-undo-alt me-2"></i>Restore Item
                    </button>
                </div>
            `;
        }
    }

    detailsContainer.innerHTML = htmlContent;

    // Add event listener to restore button if it exists
    const restoreBtn = document.getElementById('restoreItemBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => restoreDeletedItem(recordId, recordData));
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deletedDetailsModal'));
    modal.show();
}

// Restore a deleted item
function restoreDeletedItem(recordId, recordData) {
    if (!confirm(`Are you sure you want to restore this ${recordData.itemType}?`)) {
        return;
    }

    const restoreBtn = document.getElementById('restoreItemBtn');
    if (restoreBtn) {
        restoreBtn.disabled = true;
        restoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Restoring...';
    }

    // Different restore logic based on item type
    let restorePromise;

    if (recordData.itemType === 'subject') {
        // Restore a subject
        restorePromise = setDoc(doc(db, 'subjects', recordData.originalId), recordData.itemData);
    } else if (recordData.itemType === 'manualAttendance') {
        // Restore attendance record
        restorePromise = setDoc(doc(db, 'manualAttendance', recordData.originalId), recordData.itemData);
    } else {
        // Generic restore
        restorePromise = Promise.reject(new Error('Cannot restore this item type'));
    }

    restorePromise
        .then(() => {
            // Delete the record from deleted records
            return db.collection('deletedRecords').doc(recordId).delete();
        })
        .then(() => {
            showToast(`${recordData.itemType} restored successfully!`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('deletedDetailsModal')).hide();

            // Reload relevant data
            loadDeletedReports();
            if (recordData.itemType === 'subject') {
                loadSubjects();
            } else if (recordData.itemType === 'manualAttendance') {
                loadRecentAttendance();
            }
        })
        .catch(error => {
            console.error("Error restoring item:", error);
            showToast('Error restoring item: ' + error.message, 'danger');
        })
        .finally(() => {
            if (restoreBtn) {
                restoreBtn.disabled = false;
                restoreBtn.innerHTML = '<i class="fas fa-undo-alt me-2"></i>Restore Item';
            }
        });
}

// Show/hide loading overlay
function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if(show) {
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    } else {
        overlay.classList.add('d-none');
        overlay.classList.remove('d-flex');
    }
}

// Send notification to all users
function sendNotification() {
    const message = document.getElementById('notification-message').value.trim();

    if (!message) {
        showToast('Please enter a notification message', 'warning');
        return;
    }

    const sendBtn = document.getElementById('send-notification-btn');
    const statusDiv = document.getElementById('notification-status');

    // Disable button and show loading state
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
    statusDiv.innerHTML = '<div class="alert alert-info">Sending notification...</div>';

    // Create notification object
    const notification = {
        message: message,
        sentBy: currentUser.displayName || currentUser.email || 'Admin',
        sentById: currentUser.uid,
        sentByEmail: currentUser.email,
        isAdmin: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    };

    // Add to notifications collection
    db.collection('notifications').add(notification)
        .then((docRef) => {
            // Clear message field
            document.getElementById('notification-message').value = '';

            statusDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>Notification sent successfully!</div>';
            showToast('Notification sent to all users', 'success');

            // Log activity
            return db.collection('userLogs').add({
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Admin',
                userEmail: currentUser.email,
                activity: `Sent notification: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`,
                page: 'Admin Panel',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ipAddress: 'N/A',
                device: 'Admin Panel',
                browser: 'Admin Browser',
                os: 'Admin OS',
                additionalData: {
                    notificationId: docRef.id,
                    fullMessage: message
                }
            });
        })
        .catch((error) => {
            console.error("Error sending notification:", error);
            statusDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error: ${error.message}</div>`;
            showToast('Failed to send notification', 'danger');
        })
        .finally(() => {
            // Reset button state
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Notification';

            // Clear status after 5 seconds
            setTimeout(() => {
                if (statusDiv.querySelector('.alert-success')) {
                    statusDiv.innerHTML = '';
                }
            }, 5000);
        });
}

// Send notification from notifications tab
function sendNotificationFromTab() {
    const title = document.getElementById('notification-title').value.trim();
    const message = document.getElementById('notification-tab-message').value.trim();

    if (!message) {
        showToast('Please enter a notification message', 'warning');
        return;
    }

    const sendBtn = document.getElementById('send-notification-tab-btn');
    const statusDiv = document.getElementById('notification-send-status');

    // Disable button and show loading state
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
    statusDiv.innerHTML = '<div class="alert alert-info">Sending notification...</div>';

    // Create notification object
    const notification = {
        title: title,
        message: message,
        sentBy: currentUser.displayName || currentUser.email || 'Admin',
        sentById: currentUser.uid,
        sentByEmail: currentUser.email,
        isAdmin: true,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
    };

    // Add to notifications collection
    db.collection('notifications').add(notification)
        .then((docRef) => {
            // Clear fields
            document.getElementById('notification-title').value = '';
            document.getElementById('notification-tab-message').value = '';

            statusDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>Notification sent successfully!</div>';
            showToast('Notification sent to all users', 'success');

            // Reload notifications
            loadNotifications();

            // Log activity
            return addDoc(collection(db, 'userLogs'), {
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Admin',
                userEmail: currentUser.email,
                activity: `Sent notification: "${title || message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`,
                page: 'Admin Panel - Notifications Tab',
                timestamp: serverTimestamp(),
                ipAddress: 'N/A',
                device: 'Admin Panel',
                browser: 'Admin Browser',
                os: 'Admin OS',
                additionalData: {
                    notificationId: docRef.id,
                    fullMessage: message,
                    title: title
                }
            });
        })
        .catch((error) => {
            console.error("Error sending notification:", error);
            statusDiv.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error: ${error.message}</div>`;
            showToast('Failed to send notification', 'danger');
        })
        .finally(() => {
            // Reset button state
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send Notification';

            // Clear success status after 5 seconds
            setTimeout(() => {
                if (statusDiv.querySelector('.alert-success')) {
                    statusDiv.innerHTML = '';
                }
            }, 5000);
        });
}

// Load all notifications
function loadNotifications() {
    if (!checkFirebase()) return;
    console.log("Loading notifications for admin panel");
    const notificationsBody = document.getElementById('notifications-body');
    const loadingSpinner = document.getElementById('notifications-loading');

    if (loadingSpinner) loadingSpinner.style.display = 'block';

    db.collection('notifications').orderBy('timestamp', 'desc').get().then(snapshot => {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (!notificationsBody) return;

            notificationsBody.innerHTML = '';
            if (snapshot.empty) {
                notificationsBody.innerHTML = '<tr><td colspan="5" class="text-center">No notifications found.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                // ... rendering logic ...
            });
        })
        .catch(error => {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            console.error("Error loading notifications:", error);
            showToast(`Error loading notifications: ${error.message}`, 'danger');
            if (notificationsBody) {
                notificationsBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        });
}

// Create notifications collection if it doesn't exist
function createNotificationsCollection() {
    if (!currentUser) {
        showToast('Authentication error. Please reload the page.', 'danger');
        return;
    }

    showToast('Creating notifications collection...', 'info');
    setDoc(doc(db, 'notifications', 'initial'), {
        title: 'Welcome to LowryBunks',
        message: 'This is the first notification. The system is now ready to send and receive notifications.',
        sentBy: 'System',
        sentById: 'system',
        sentByEmail: 'system@example.com',
        isAdmin: true,
        timestamp: serverTimestamp(),
        read: false
    })
    .then(() => {
        showToast('Notifications collection created successfully!', 'success');
        loadNotifications();
    })
    .catch(error => {
        showToast('Error creating notifications collection: ' + error.message, 'danger');
        console.error("Error creating notifications collection:", error);
    });
}

// Show notification details in modal
function showNotificationDetails(id, data) {
    // Set up the modal content
    document.getElementById('notificationDetailsTitle').textContent = data.title || 'Notification Details';

    const detailsContainer = document.getElementById('notificationDetailsContent');
    if (!detailsContainer) return;

    // Format timestamp
    let formattedDate = 'Unknown';
    if (data.timestamp) {
        formattedDate = data.timestamp.toDate().toLocaleString();
    }

    // Build HTML content with all available details
    let htmlContent = `
        <div class="card mb-3">
            <div class="card-header bg-light">
                <h5 class="mb-0">Message</h5>
            </div>
            <div class="card-body">
                ${data.message || 'No message content'}
            </div>
        </div>

        <div class="card">
            <div class="card-header bg-light">
                <h5 class="mb-0">Details</h5>
            </div>
            <div class="card-body">
                <table class="table table-sm">
                    <tr>
                        <th style="width: 30%">Sent By:</th>
                        <td>
                            ${data.sentBy || 'Unknown'}
                            ${data.isAdmin ? '<span class="badge bg-primary"><i class="fas fa-check-circle"></i> Admin</span>' : ''}
                        </td>
                    </tr>
                    <tr>
                        <th>Email:</th>
                        <td>${data.sentByEmail || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <th>Timestamp:</th>
                        <td>${formattedDate}</td>
                    </tr>
                    <tr>
                        <th>Notification ID:</th>
                        <td><code>${id}</code></td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    detailsContainer.innerHTML = htmlContent;

    // Set up delete button handler
    const deleteBtn = document.getElementById('deleteNotificationBtn');
    if (deleteBtn) {
        // Remove any existing event listeners
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        // Add new event listener
        newDeleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this notification?')) {
                deleteNotification(id, true);
            }
        });
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('notificationDetailsModal'));
    modal.show();
}

// Delete a notification
function deleteNotification(id, closeModal = false) {
    db.collection('notifications').doc(id).delete()
        .then(() => {
            showToast('Notification deleted successfully', 'success');

            // Close modal if open
            if (closeModal) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('notificationDetailsModal'));
                if (modal) {
                    modal.hide();
                }
            }

            // Reload notifications
            loadNotifications();

            // Log activity
            return addDoc(collection(db, 'userLogs'), {
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Admin',
                userEmail: currentUser.email,
                activity: `Deleted notification (ID: ${id})`,
                page: 'Admin Panel - Notifications',
                timestamp: serverTimestamp(),
                ipAddress: 'N/A',
                device: 'Admin Panel',
                browser: 'Admin Browser',
                os: 'Admin OS'
            });
        })
        .catch(error => {
            console.error("Error deleting notification:", error);
            showToast('Error deleting notification: ' + error.message, 'danger');
        });
}

// Delete all notifications
function deleteAllNotifications() {
    if (!confirm('Are you sure you want to delete ALL notifications? This cannot be undone.')) {
        return;
    }

    const deleteBtn = document.getElementById('deleteAllNotificationsBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';

    // Get all notifications
    db.collection('notifications').get()
        .then(snapshot => {
            if (snapshot.empty) {
                showToast('No notifications to delete', 'info');
                return Promise.resolve();
            }

            // Create a batch delete
            const batchSize = 450; // Firestore limit is 500 operations per batch
            let batches = [];
            let currentBatch = db.batch();
            let operationCount = 0;

            snapshot.forEach(doc => {
                // Skip the initial doc
                if (doc.id === 'initial') return;

                currentBatch.delete(doc.ref);
                operationCount++;

                if (operationCount >= batchSize) {
                    batches.push(currentBatch.commit());
                    currentBatch = db.batch();
                    operationCount = 0;
                }
            });

            // Commit any remaining operations
            if (operationCount > 0) {
                batches.push(currentBatch.commit());
            }

            return Promise.all(batches);
        })
        .then(() => {
            showToast('All notifications deleted successfully', 'success');

            // Reload notifications
            loadNotifications();

            // Log activity
            return addDoc(collection(db, 'userLogs'), {
                userId: currentUser.uid,
                userName: currentUser.displayName || 'Admin',
                userEmail: currentUser.email,
                activity: 'Deleted all notifications',
                page: 'Admin Panel - Notifications',
                timestamp: serverTimestamp(),
                ipAddress: 'N/A',
                device: 'Admin Panel',
                browser: 'Admin Browser',
                os: 'Admin OS'
            });
        })
        .catch(error => {
            console.error("Error deleting all notifications:", error);
            showToast('Error deleting notifications: ' + error.message, 'danger');
        })
        .finally(() => {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash me-1"></i>Delete All';
        });
}

function checkFirebase() {
    if (!auth || !db) {
        console.error("Firebase is not initialized.");
        showToast("Firebase is not properly configured. Please check console.", 'danger');
        return false;
    }
    return true;
}

// Initialize Firebase function
function initializeFirebase() {
    try {
        console.log("Attempting to initialize Firebase...");

        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not loaded - make sure Firebase scripts are loaded before auth.js");
            showGlobalError("Firebase SDK not loaded", "Make sure Firebase scripts are loaded before auth.js");
            return;
        }

        console.log("Firebase SDK is available");

        // Initialize Firebase if not already initialized
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized successfully");
        } else {
            console.log("Firebase already initialized");
        }

        // Set up auth and db references
        auth = firebase.auth();
        db = firebase.firestore();

        console.log("Firebase auth and firestore references set up successfully");
        console.log("Auth object:", auth ? "Available" : "Not available");
        console.log("DB object:", db ? "Available" : "Not available");

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showGlobalError("Firebase initialization failed", error.message);
    }
}

// Initialize Firebase when the script loads
// Add a small delay to ensure Firebase scripts are fully loaded
setTimeout(() => {
    initializeFirebase();
}, 100);

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page
    if (document.getElementById('loginTab')) {
        setupAuthUI();
        setupAuthListeners();
    }
    
    // Check if user is logged in for all pages
    checkAuthState();
});

// Set up the authentication UI
function setupAuthUI() {
    // Tab switching functionality
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginContent = document.getElementById('loginContent');
    const signupContent = document.getElementById('signupContent');
    
    loginTab.addEventListener('click', function() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginContent.classList.remove('d-none');
        signupContent.classList.add('d-none');
    });
    
    signupTab.addEventListener('click', function() {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupContent.classList.remove('d-none');
        loginContent.classList.add('d-none');
    });
    
    // Password toggle functionality
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        const targetId = toggle.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        toggle.addEventListener('click', function() {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
            } else {
                passwordInput.type = 'password';
            }
        });
    });
}

// Set up authentication event listeners
function setupAuthListeners() {
    // Login functionality
    const loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showMessage('Please fill in all fields');
            return;
        }
        
        // Show loading state
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
        
        // Check network connectivity first
        if (!navigator.onLine) {
            showMessage('Network error. Please check your internet connection.');
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
            return;
        }
        
        // Check if auth is defined
        if (!auth) {
            showMessage('Authentication service is not available. Please refresh the page and try again.');
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
            return;
        }
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Redirect to dashboard - without .html extension for Netlify compatibility
                window.location.href = 'dashboard';
            })
            .catch((error) => {
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
                
                // Handle specific errors
                if (error.code === 'auth/network-request-failed') {
                    showMessage('Network error. Please check your internet connection.');
                } else if (error.code === 'auth/wrong-password') {
                    showMessage('Invalid email or password. Please try again.');
                } else if (error.code === 'auth/user-not-found') {
                    showMessage('No account found with this email. Please sign up.');
                } else {
                    showMessage(`Error: ${error.message}`);
                }
            });
    });
    
    // Signup functionality
    const signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function() {
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            
            if (!name || !email || !password) {
                showMessage('Please fill in all fields');
                return;
            }
            
            // Show loading state
            signupButton.disabled = true;
            signupButton.textContent = 'Creating Account...';
            
            // Check network connectivity first
            if (!navigator.onLine) {
                showMessage('Network error. Please check your internet connection.');
                signupButton.disabled = false;
                signupButton.textContent = 'Create Account';
                return;
            }
            
            // Check if auth and db are defined
            if (!auth || !db) {
                showMessage('Authentication service is not available. Please refresh the page and try again.');
                signupButton.disabled = false;
                signupButton.textContent = 'Create Account';
                return;
            }
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Update the user's profile with their name
                    return userCredential.user.updateProfile({
                        displayName: name
                    }).then(() => {
                        // Create a user document in Firestore
                        return db.collection('users').doc(userCredential.user.uid).set({
                            name: name,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            attendanceData: {
                                subjects: {}
                            }
                        });
                    }).then(() => {
                        // Redirect to dashboard
                        window.location.href = 'dashboard';
                    });
                })
                .catch((error) => {
                    signupButton.disabled = false;
                    signupButton.textContent = 'Create Account';
                    
                    // Handle specific errors
                    if (error.code === 'auth/network-request-failed') {
                        showMessage('Network error. Please check your internet connection.');
                    } else if (error.code === 'auth/email-already-in-use') {
                        showMessage('Email already in use. Try logging in instead.');
                    } else if (error.code === 'auth/weak-password') {
                        showMessage('Password is too weak. Please use a stronger password.');
                    } else {
                        showMessage(`Error: ${error.message}`);
                    }
                });
        });
    }
    
    // Google Sign In
    const googleLogin = document.getElementById('googleLogin');
    if (googleLogin) {
        googleLogin.addEventListener('click', function() {
            // Check network connectivity first
            if (!navigator.onLine) {
                showMessage('Network error. Please check your internet connection.');
                return;
            }
            
            // Check if auth and db are defined
            if (!auth || !db) {
                showMessage('Authentication service is not available. Please refresh the page and try again.');
                return;
            }
            
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    // Check if this is a new user
                    const isNewUser = result.additionalUserInfo.isNewUser;
                    if (isNewUser) {
                        // Create a user document in Firestore
                        return db.collection('users').doc(result.user.uid).set({
                            name: result.user.displayName,
                            email: result.user.email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            attendanceData: {
                                subjects: {}
                            }
                        });
                    } else {
                        // Redirect to dashboard
                        window.location.href = 'dashboard';
                    }
                })
                .catch((error) => {
                    if (error.code === 'auth/network-request-failed') {
                        showMessage('Network error. Please check your internet connection.');
                    } else {
                        showMessage(`Error: ${error.message}`);
                    }
                });
        });
    }
    
    // Reset password functionality
    const forgotPassword = document.getElementById('forgotPassword');
    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            const email = prompt('Enter your email to reset your password:');
            if (email) {
                // Check network connectivity first
                if (!navigator.onLine) {
                    showMessage('Network error. Please check your internet connection.');
                    return;
                }
                
                // Check if auth is defined
                if (!auth) {
                    showMessage('Authentication service is not available. Please refresh the page and try again.');
                    return;
                }
                
                auth.sendPasswordResetEmail(email)
                    .then(() => {
                        alert('Password reset email sent. Check your inbox.');
                    })
                    .catch((error) => {
                        if (error.code === 'auth/network-request-failed') {
                            showMessage('Network error. Please check your internet connection.');
                        } else if (error.code === 'auth/user-not-found') {
                            showMessage('No account found with this email.');
                        } else {
                            showMessage(`Error: ${error.message}`);
                        }
                    });
            }
        });
    }
}

// Check authentication state
function checkAuthState() {
    // Check if auth is defined before using it
    if (!auth) {
        console.error('Authentication service is not initialized');
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('login') || currentPath.endsWith('/');

        // If we're on login page and user is logged in, redirect to dashboard
        if (user && isAuthPage) {
            window.location.href = 'dashboard'; // No .html extension for Netlify compatibility
        }
        
        // If we're on a protected page and user is not logged in, redirect to login
        if (!user && !isAuthPage) {
            window.location.href = 'login.html';
        }
        
        // Update profile icon with user's initial if available
        if (user) {
            const profileIcon = document.querySelector('.profile-icon');
            if (profileIcon) {
                profileIcon.textContent = getInitials(user.displayName || user.email || 'U');
            }
            
            // Update greeting if on index.html
            const greeting = document.querySelector('.greeting');
            if (greeting && (currentPath.includes('dashboard') || currentPath.endsWith('/'))) {
                const userName = user.displayName?.split(' ')[0] || 'User';
                greeting.innerHTML = `Hello, <span id="userName">${userName}</span>!`;
            }
        }
    });
}

// Helper functions
function showMessage(message) {
    // You can replace this with a more sophisticated notification system
    alert(message);
}

function getInitials(name) {
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
} 