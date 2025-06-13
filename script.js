// User attendance data collection
let currentUser = null;
let firebaseAuth;
let firebaseDb;
let firebaseRtdb; // Realtime Database reference for presence

// Initialize attendance data if not exists
function initializeData() {
    // Check if Firebase is initialized
    if (!firebase) {
        console.error("Firebase not initialized");
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
            currentUser = user;
            
            // Setup presence system if Realtime Database is available
            if (firebaseRtdb) {
                setupPresence(user.uid);
            }
            
            try {
                // Check if the user already has attendance data in Firestore
                const userRef = firebaseDb.collection('users').doc(user.uid);
                const userDoc = await userRef.get();
                
                if (userDoc.exists) {
                    if (userDoc.data().attendanceData) {
                        // User already has data, no need to initialize
                        updateUI();
                    } else {
                        // User exists but doesn't have attendance data
                        const initialData = createInitialData();
                        await userRef.update({
                            attendanceData: initialData
                        });
                        updateUI();
                    }
                } else {
                    // User document doesn't exist, create it with initial data
                    const initialData = createInitialData();
                    await userRef.set({
                        name: user.displayName || 'User',
                        email: user.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        attendanceData: initialData
                    });
                    updateUI();
                }
            } catch (error) {
                console.error("Error initializing user data:", error);
                // Try to load data from localStorage as fallback
                if (localStorage.getItem('attendanceData')) {
                    updateUI();
                }
            }
        }
    });
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
    return {
        subjects: {
            'English': { 
                present: 0, 
                absent: 0,
                sessions: []
            },
            'Mathematics': { 
                present: 0, 
                absent: 0,
                sessions: []
            }
        },
        todaysClasses: [
            {
                id: 1,
                subject: 'English',
                status: 'unmarked',
                label: '1st class'
            },
            {
                id: 2,
                subject: 'Mathematics',
                status: 'unmarked',
                label: '2nd class'
            },
            {
                id: 3,
                subject: 'Mathematics',
                status: 'unmarked',
                label: '3rd class'
            }
        ]
    };
}

// Function to get current data from Firestore
async function getAttendanceData() {
    if (!currentUser) {
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
        const userDoc = await userRef.get();
        
        if (userDoc.exists && userDoc.data().attendanceData) {
            return userDoc.data().attendanceData;
        } else {
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
    // Always save to localStorage as backup with timestamp
    localStorage.setItem('attendanceData', JSON.stringify(data));
    localStorage.setItem('attendanceDataTimestamp', Date.now().toString());
    
    if (!currentUser || !firebaseDb) return;
    
    try {
        const userRef = firebaseDb.collection('users').doc(currentUser.uid);
        await userRef.update({
            attendanceData: data,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving attendance data:', error);
        // Data is already saved to localStorage as backup
    }
}

// Function to update attendance status
async function updateAttendance(classId, newStatus) {
    try {
        const data = await getAttendanceData();
        if (!data) return;
        
        const classToUpdate = data.todaysClasses.find(cls => cls.id === classId);
        
        if (classToUpdate) {
            const oldStatus = classToUpdate.status;
            const subject = classToUpdate.subject;
            
            // Don't do anything if status is the same
            if (oldStatus === newStatus) return;
            
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
            
            await saveAttendanceData(data);
            updateUI();
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        alert('Failed to update attendance. Please check your connection and try again.');
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
async function updateUI() {
    try {
        const data = await getAttendanceData();
        if (!data) return;
        
        const currentPath = window.location.pathname;
        
        // Update Dashboard Page UI
        if (currentPath.includes('dashboard.html')) {
            const classCards = document.querySelectorAll('.class-card');
            
            classCards.forEach((card, index) => {
                const classData = data.todaysClasses[index];
                if (!classData) return;
                
                const statusElement = card.querySelector('.status span');
                if (statusElement) {
                    if (classData.status === 'unmarked') {
                        statusElement.textContent = 'Mark your attendance';
                        statusElement.className = 'status-unmarked';
                    } else {
                        statusElement.textContent = classData.status;
                        statusElement.className = classData.status === 'present' ? 'status-present' : '';
                    }
                }
                
                const presentBtn = card.querySelector('.btn-present');
                const absentBtn = card.querySelector('.btn-absent');
                
                if (presentBtn) presentBtn.classList.toggle('active', classData.status === 'present');
                if (absentBtn) absentBtn.classList.toggle('active', classData.status === 'absent');
            });
        }
        
        // Update Report Page UI
        if (currentPath.includes('report.html')) {
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
                
                for (const subject in data.subjects) {
                    const subjectData = data.subjects[subject];
                    const percentage = calculatePercentage(subjectData.present, subjectData.absent);
                    
                    const subjectCard = document.createElement('div');
                    subjectCard.className = 'subject-card';
                    subjectCard.innerHTML = `
                        <h4 class="subject-name">${subject}</h4>
                        <div class="attendance-stats">
                            <div class="present-count">Total Present: <span>${subjectData.present}</span></div>
                            <div class="absent-count">Total Absent: <span>${subjectData.absent}</span></div>
                        </div>
                        <div class="percentage-bar">
                            <span class="percentage">${percentage}%</span>
                        </div>
                    `;
                    
                    subjectContainer.appendChild(subjectCard);
                }
            }
        }
    } catch (error) {
        console.error('Error updating UI:', error);
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

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    
    // Set up online/offline status detection
    window.addEventListener('online', function() {
        console.log('Device is online. Syncing data with Firestore...');
        syncLocalStorageToFirestore();
    });
    
    window.addEventListener('offline', function() {
        console.log('Device is offline. Data will be saved locally.');
    });
    
    // Update UI immediately and then periodically
    updateUI();
    setInterval(updateUI, 60000); // Update every minute
    
    // Update time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000); // Update every minute
}); 