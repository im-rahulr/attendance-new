// User attendance data collection
let currentUser = null;
let firebaseAuth;
let firebaseDb;
let firebaseRtdb; // Realtime Database reference for presence

// Initialize attendance data if not exists
function initializeData() {
    console.log("Initializing data...");
    showLoading("Loading your data...");
    
    // Check if Firebase is initialized
    if (!firebase) {
        console.error("Firebase not initialized");
        hideLoading();
        return;
    }

    // Initialize Firebase references
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    
    // Check if Realtime Database is available (for presence)
    if (firebase.database) {
        firebaseRtdb = firebase.database();
    }

    // Check if user is authenticated
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User authenticated in initializeData:", user.uid);
            currentUser = user;
            
            // Setup presence system if Realtime Database is available
            if (firebaseRtdb) {
                setupPresence(user.uid);
            }
            
            try {
                // Check if the user already has attendance data in Firestore
                const userRef = firebaseDb.collection('users').doc(user.uid);
                const userDoc = await userRef.get({ source: "server" }); // Force server fetch
                
                // Fetch subjects from admin-created subjects collection
                const subjectsSnapshot = await firebaseDb.collection('subjects').get();
                const adminSubjects = {};
                
                // If no subjects are defined by admin yet, show a message
                if (subjectsSnapshot.empty) {
                    hideLoading();
                    showToast("No subjects have been added by the administrator yet.", 5000);
                    
                    // Create empty data structure
                    if (!userDoc.exists || !userDoc.data().attendanceData) {
                        await userRef.set({
                            name: user.displayName || 'User',
                            email: user.email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            attendanceData: {
                                subjects: {},
                                todaysClasses: []
                            }
                        }, { merge: true });
                    }
                    
                    updateUI(true);
                    return;
                }
                
                // Process admin-defined subjects
                subjectsSnapshot.forEach(doc => {
                    const subjectName = doc.data().name;
                    adminSubjects[subjectName] = { 
                        present: 0, 
                        absent: 0,
                        sessions: []
                    };
                });
                
                console.log("Admin subjects:", Object.keys(adminSubjects));
                
                // Create initial classes array from admin subjects
                const todaysClasses = Object.keys(adminSubjects).map((subject, index) => {
                    return {
                        id: index + 1,
                        subject: subject,
                        status: 'unmarked',
                        label: `${index + 1}${getOrdinalSuffix(index + 1)} class`
                    };
                });
                
                if (userDoc.exists) {
                    if (userDoc.data().attendanceData) {
                        console.log("User has existing attendance data");
                        // User already has data, update it with current admin subjects
                        const existingData = userDoc.data().attendanceData;
                        const updatedSubjects = {};
                        
                        // Keep only admin-defined subjects and preserve existing attendance data
                        Object.keys(adminSubjects).forEach(subject => {
                            updatedSubjects[subject] = existingData.subjects[subject] || adminSubjects[subject];
                        });
                        
                        // Update today's classes with existing status
                        const updatedClasses = todaysClasses.map(newClass => {
                            // Try to find matching class in existing data
                            const existingClass = existingData.todaysClasses.find(
                                cls => cls.subject === newClass.subject
                            );
                            
                            if (existingClass) {
                                // Preserve the status from existing class
                                return {
                                    ...newClass,
                                    status: existingClass.status
                                };
                            }
                            return newClass;
                        });
                        
                        // Update with new data structure
                        const updatedData = {
                            subjects: updatedSubjects,
                            todaysClasses: updatedClasses
                        };
                        
                        console.log("Updating user data with:", updatedData);
                        await userRef.update({
                            attendanceData: updatedData,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // If we're on dashboard page, update UI with the new data
                        if (window.location.pathname.includes('dashboard')) {
                            if (typeof updateDashboardUI === 'function') {
                                updateDashboardUI(updatedData);
                            } else {
                                updateUI(false, updatedData);
                            }
                        } else {
                            updateUI(false, updatedData);
                        }
                        
                        hideLoading();
                    } else {
                        // User exists but doesn't have attendance data
                        console.log("User exists but no attendance data");
                        const initialData = {
                            subjects: adminSubjects,
                            todaysClasses: todaysClasses
                        };
                        
                        await userRef.update({
                            attendanceData: initialData,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // If we're on dashboard page, update UI with the new data
                        if (window.location.pathname.includes('dashboard')) {
                            if (typeof updateDashboardUI === 'function') {
                                updateDashboardUI(initialData);
                            } else {
                                updateUI(false, initialData);
                            }
                        } else {
                            updateUI(false, initialData);
                        }
                        
                        hideLoading();
                    }
                } else {
                    // User document doesn't exist, create it with initial data
                    console.log("Creating new user document");
                    const initialData = {
                        subjects: adminSubjects,
                        todaysClasses: todaysClasses
                    };
                    
                    await userRef.set({
                        name: user.displayName || 'User',
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        attendanceData: initialData,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // If we're on dashboard page, update UI with the new data
                    if (window.location.pathname.includes('dashboard')) {
                        if (typeof updateDashboardUI === 'function') {
                            updateDashboardUI(initialData);
                        } else {
                            updateUI(false, initialData);
                        }
                    } else {
                        updateUI(false, initialData);
                    }
                    
                    hideLoading();
                }
            } catch (error) {
                console.error("Error initializing user data:", error);
                hideLoading();
                showToast("Error loading subjects. Please try again later.", 5000);
                // Try to load data from localStorage as fallback
                if (localStorage.getItem('attendanceData')) {
                    updateUI(true);
                }
            }
        } else {
            console.log("No authenticated user in initializeData");
            hideLoading();
        }
    });
}

// Helper function to get ordinal suffix for numbers
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
        return "st";
    }
    if (j === 2 && k !== 12) {
        return "nd";
    }
    if (j === 3 && k !== 13) {
        return "rd";
    }
    return "th";
}

// Setup presence system to track online/offline status
function setupPresence(userId) {
    // Create a reference to this user's specific status node
    const userStatusRef = firebaseRtdb.ref('/status/' + userId);
    
    // We'll create two constants which we will write to the Realtime Database
    // when this device is offline or online
    const isOfflineForDatabase = {
        state: 'offline',
        last_changed: firebase.database.ServerValue.TIMESTAMP,
    };
    
    const isOnlineForDatabase = {
        state: 'online',
        last_changed: firebase.database.ServerValue.TIMESTAMP,
    };
    
    // Create reference to the special '.info/connected' path
    firebaseRtdb.ref('.info/connected').on('value', (snapshot) => {
        // If we're not currently connected, don't do anything
        if (snapshot.val() === false) {
            return;
        }
        
        // If we are connected, set up the onDisconnect handler
        userStatusRef.onDisconnect().set(isOfflineForDatabase).then(() => {
            // The promise returned from .onDisconnect().set() will resolve as soon as the server
            // acknowledges the onDisconnect() request, NOT once we've actually disconnected
            
            // We can now safely mark ourselves as online
            userStatusRef.set(isOnlineForDatabase);
            
            // When we come online, sync any data stored in localStorage
            syncLocalStorageToFirestore();
        });
    });
    
    // Listen for changes to online status
    userStatusRef.on('value', (snapshot) => {
        const status = snapshot.val();
        if (status && status.state === 'online') {
            // User is online, ensure we have the latest data
            syncLocalStorageToFirestore();
        }
    });
}

// Sync data stored in localStorage to Firestore when we come online
function syncLocalStorageToFirestore() {
    if (!currentUser || !firebaseDb) return;
    
    const localData = localStorage.getItem('attendanceData');
    if (!localData) return;
    
    try {
        const data = JSON.parse(localData);
        const timestamp = localStorage.getItem('attendanceDataTimestamp');
        
        // Only update if we have data and a timestamp
        if (data && timestamp) {
            // Get the current data from Firestore to check timestamp
            firebaseDb.collection('users').doc(currentUser.uid).get()
                .then(doc => {
                    if (doc.exists && doc.data().lastUpdated) {
                        const serverTimestamp = doc.data().lastUpdated.toMillis();
                        
                        // Only update if local data is newer
                        if (parseInt(timestamp) > serverTimestamp) {
                            return firebaseDb.collection('users').doc(currentUser.uid).update({
                                attendanceData: data,
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    } else {
                        // No server timestamp, update anyway
                        return firebaseDb.collection('users').doc(currentUser.uid).update({
                            attendanceData: data,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                })
                .catch(error => {
                    console.error("Error syncing local data to Firestore:", error);
                });
        }
    } catch (error) {
        console.error("Error parsing local storage data:", error);
    }
}

// Create initial attendance data structure
function createInitialData() {
    // This function is now deprecated as we fetch subjects from Firestore
    // Keeping it for backward compatibility
    return {
        subjects: {},
        todaysClasses: []
    };
}

// Function to get current data from Firestore
async function getAttendanceData(forceServer = false) {
    console.log("Getting attendance data, forceServer:", forceServer);
    
    if (!currentUser) {
        console.log("No current user, checking localStorage");
        // If no user is authenticated, try to get data from localStorage
        const localData = localStorage.getItem('attendanceData');
        return localData ? JSON.parse(localData) : null;
    }
    
    try {
        if (!firebaseDb) {
            console.error("Firestore not initialized");
            throw new Error("Firestore not initialized");
        }
        
        const userRef = firebaseDb.collection('users').doc(currentUser.uid);
        let userDoc;
        
        if (forceServer) {
            // Force fetch from server, not cache
            console.log("Forcing server fetch");
            userDoc = await userRef.get({ source: "server" });
        } else {
            userDoc = await userRef.get();
        }
        
        if (userDoc.exists && userDoc.data().attendanceData) {
            console.log("Got attendance data from Firestore");
            const data = userDoc.data().attendanceData;
            
            // Save to localStorage as backup
            localStorage.setItem('attendanceData', JSON.stringify(data));
            localStorage.setItem('attendanceDataTimestamp', Date.now().toString());
            
            return data;
        } else {
            console.log("No attendance data found in Firestore");
            return null;
        }
    } catch (error) {
        console.error('Error getting attendance data:', error);
        // Try to get data from localStorage as fallback
        const localData = localStorage.getItem('attendanceData');
        return localData ? JSON.parse(localData) : null;
    }
}

// Function to save data to Firestore
async function saveAttendanceData(data) {
    console.log("Saving attendance data:", data);
    
    // Always save to localStorage as backup with timestamp
    localStorage.setItem('attendanceData', JSON.stringify(data));
    localStorage.setItem('attendanceDataTimestamp', Date.now().toString());
    
    if (!currentUser || !firebaseDb) {
        console.log("No current user or Firestore, saved to localStorage only");
        return data;
    }
    
    try {
        const userRef = firebaseDb.collection('users').doc(currentUser.uid);
        await userRef.update({
            attendanceData: data,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("Data saved to Firestore successfully");
        // Return the updated data for immediate UI updates
        return data;
    } catch (error) {
        console.error('Error saving attendance data:', error);
        // Data is already saved to localStorage as backup
        return data; // Still return data for UI updates
    }
}

// Function to update attendance status
async function updateAttendance(classId, newStatus) {
    console.log(`Updating attendance for class ${classId} to ${newStatus}`);
    try {
        // Add animation to the button
        const buttons = document.querySelectorAll(`button[data-class-id="${classId}"]`);
        const clickedButton = buttons[newStatus === 'present' ? 0 : 1];
        
        // Add ripple effect
        if (clickedButton) {
            clickedButton.classList.add('animate');
            setTimeout(() => {
                clickedButton.classList.remove('animate');
            }, 700);
        }
        
        showLoading(`Marking ${newStatus}...`);
        
        const data = await getAttendanceData(true); // Force server fetch
        if (!data) {
            hideLoading();
            showToast("Could not find attendance data");
            return;
        }
        
        const classToUpdate = data.todaysClasses.find(cls => cls.id === classId);
        
        if (classToUpdate) {
            const oldStatus = classToUpdate.status;
            const subject = classToUpdate.subject;
            
            // Don't do anything if status is the same
            if (oldStatus === newStatus) {
                hideLoading();
                showToast(`Already marked ${newStatus}`);
                return;
            }
            
            console.log(`Changing status from ${oldStatus} to ${newStatus} for ${subject}`);
            
            // Update class status
            classToUpdate.status = newStatus;
            
            // Update subject count
            if (oldStatus === 'present') {
                data.subjects[subject].present--;
            } else if (oldStatus === 'absent') {
                data.subjects[subject].absent--;
            }
            
            if (newStatus === 'present') {
                data.subjects[subject].present++;
            } else if (newStatus === 'absent') {
                data.subjects[subject].absent++;
            }
            
            // Add session record with timestamp
            data.subjects[subject].sessions.push({
                date: new Date().toISOString(),
                status: newStatus
            });
            
            const updatedData = await saveAttendanceData(data);
            hideLoading();
            showToast(`Marked ${newStatus} for ${subject}`);
            
            // Update UI immediately with the updated data
            if (updatedData) {
                // If we're using the dashboard.html updateDashboardUI function
                if (typeof updateDashboardUI === 'function') {
                    updateDashboardUI(updatedData);
                } else {
                    // Otherwise use our own updateUI function
                    updateUI(false, updatedData);
                }
            }
        } else {
            hideLoading();
            showToast("Class not found");
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        hideLoading();
        showToast('Failed to update attendance. Please try again.');
    }
}

// Function to calculate attendance percentage
function calculatePercentage(present, absent) {
    const total = present + absent;
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
}

// Function to calculate total attendance percentage
async function calculateTotalPercentage() {
    try {
        const data = await getAttendanceData();
        if (!data) return 0;
        
        let totalPresent = 0;
        let totalAbsent = 0;
        
        for (const subject in data.subjects) {
            totalPresent += data.subjects[subject].present;
            totalAbsent += data.subjects[subject].absent;
        }
        
        return calculatePercentage(totalPresent, totalAbsent);
    } catch (error) {
        console.error('Error calculating percentage:', error);
        return 0;
    }
}

// Function to update UI based on current data
async function updateUI(forceServer = false, providedData = null) {
    try {
        if (!providedData) {
            showLoading("Loading latest data...");
            providedData = await getAttendanceData(forceServer);
            hideLoading();
        }
        
        if (!providedData) return;
        const data = providedData;
        
        const currentPath = window.location.pathname;
        console.log("Updating UI for path:", currentPath);
        
        // Update Dashboard Page UI
        if (currentPath.includes('dashboard')) {
            // Check if we have a custom updateDashboardUI function from dashboard.html
            if (typeof updateDashboardUI === 'function') {
                console.log("Using custom updateDashboardUI function");
                updateDashboardUI(data);
                return;
            }
            
            // Otherwise use our default implementation
            console.log("Using default dashboard UI update");
            const classesSection = document.querySelector('.classes-section');
            if (classesSection) {
                // Keep the title
                const title = classesSection.querySelector('.section-title');
                classesSection.innerHTML = '';
                if (title) {
                    classesSection.appendChild(title);
                } else {
                    const newTitle = document.createElement('h2');
                    newTitle.className = 'section-title';
                    newTitle.textContent = "Today's Classes";
                    classesSection.appendChild(newTitle);
                }
                
                // Check if there are any classes (subjects)
                if (!data.todaysClasses || data.todaysClasses.length === 0) {
                    const noClassesMsg = document.createElement('div');
                    noClassesMsg.className = 'alert alert-info';
                    noClassesMsg.textContent = 'No subjects have been added by the administrator yet.';
                    classesSection.appendChild(noClassesMsg);
                } else {
                    // Add class cards dynamically based on subjects
                    data.todaysClasses.forEach(classData => {
                        const classCard = document.createElement('div');
                        classCard.className = 'class-card';
                        
                        let statusText = 'Mark your attendance';
                        let statusClass = 'status-unmarked';
                        
                        if (classData.status === 'present') {
                            statusText = 'Present';
                            statusClass = 'status-present';
                        } else if (classData.status === 'absent') {
                            statusText = 'Absent';
                            statusClass = 'status-absent';
                        }
                        
                        classCard.innerHTML = `
                            <div class="class-info">
                                <div class="subject">${classData.subject}</div>
                                <div class="status">Status: <span class="${statusClass}">${statusText}</span></div>
                            </div>
                            <div class="class-label">${classData.label}</div>
                            <div class="attendance-buttons">
                                <button class="btn-present ${classData.status === 'present' ? 'active' : ''}" data-class-id="${classData.id}">Present</button>
                                <button class="btn-absent ${classData.status === 'absent' ? 'active' : ''}" data-class-id="${classData.id}">Absent</button>
                            </div>
                        `;
                        
                        // Add event listeners to the buttons
                        classesSection.appendChild(classCard);
                    });
                    
                    // Add event listeners after all cards are added
                    document.querySelectorAll('.btn-present, .btn-absent').forEach(button => {
                        button.addEventListener('click', function() {
                            const classId = parseInt(this.getAttribute('data-class-id'));
                            const status = this.classList.contains('btn-present') ? 'present' : 'absent';
                            updateAttendance(classId, status);
                        });
                    });
                }
            }
        }
        
        // Update Report Page UI
        if (currentPath.includes('report')) {
            // Update total percentage
            const totalPercentage = await calculateTotalPercentage();
            const percentageElement = document.querySelector('.percentage-circle .percentage');
            if (percentageElement) {
                percentageElement.textContent = `${totalPercentage}%`;
            }
            
            // Update subject cards
            const subjectContainer = document.querySelector('.subject-attendance');
            if (subjectContainer) {
                subjectContainer.innerHTML = '<h3>Subject Attendance Percentage</h3>';
                
                // Check if there are any subjects
                if (Object.keys(data.subjects).length === 0) {
                    const noSubjectsMsg = document.createElement('div');
                    noSubjectsMsg.className = 'alert alert-info';
                    noSubjectsMsg.textContent = 'No subjects have been added by the administrator yet.';
                    subjectContainer.appendChild(noSubjectsMsg);
                } else {
                    for (const subject in data.subjects) {
                        const subjectData = data.subjects[subject];
                        const percentage = calculatePercentage(subjectData.present || 0, subjectData.absent || 0);
                        
                        const subjectCard = document.createElement('div');
                        subjectCard.className = 'subject-card';
                        subjectCard.innerHTML = `
                            <h4 class="subject-name">${subject}</h4>
                            <div class="attendance-stats">
                                <div class="present-count">Total Present: <span>${subjectData.present || 0}</span></div>
                                <div class="absent-count">Total Absent: <span>${subjectData.absent || 0}</span></div>
                            </div>
                            <div class="percentage-bar">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                                <span class="percentage">${percentage}%</span>
                            </div>
                        `;
                        
                        subjectContainer.appendChild(subjectCard);
                    }
                }
            }
        }
    } catch (error) {
        hideLoading();
        console.error('Error updating UI:', error);
        showToast("Error updating the interface. Please refresh the page.", 5000);
    }
}

// Update current time display
function updateCurrentTime() {
    const currentTimeElement = document.getElementById('currentTime');
    if (!currentTimeElement) return;
    
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}`;
}

// Setup real-time listener for user's attendance data (for dashboard.html)
document.addEventListener('DOMContentLoaded', function() {
    console.log("Script.js: DOM Content Loaded");
    
    // Initialize Firebase if not already initialized
    if (typeof firebase !== 'undefined') {
        // Initialize data
        initializeData();
        
        // Update current time if element exists
        updateCurrentTime();
        setInterval(updateCurrentTime, 60000); // Update every minute
    } else {
        console.error("Firebase not loaded");
    }
});

// Helper functions for UI feedback
function showLoading(message = "Loading...") {
    console.log("Show loading:", message);
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingOverlay) {
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    console.log("Hide loading");
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showToast(message, duration = 3000) {
    console.log("Show toast:", message);
    
    // Try the Bootstrap toast first (from dashboard.html)
    const liveToast = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (liveToast && toastMessage) {
        toastMessage.textContent = message;
        const toast = new bootstrap.Toast(liveToast, { delay: duration });
        toast.show();
        return;
    }
    
    // Fall back to the original toast
    const toast = document.getElementById('toastNotification');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    } else {
        // Fallback to console if no toast element found
        console.log(message);
    }
} 