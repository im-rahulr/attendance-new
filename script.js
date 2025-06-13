// User attendance data collection
let currentUser = null;
let firebaseAuth;
let firebaseDb;

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

    // Check if user is authenticated
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
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
                status: 'present',
                label: '1st class'
            },
            {
                id: 2,
                subject: 'Mathematics',
                status: 'present',
                label: '2nd class'
            },
            {
                id: 3,
                subject: 'Mathematics',
                status: 'present',
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
    // Always save to localStorage as backup
    localStorage.setItem('attendanceData', JSON.stringify(data));
    
    if (!currentUser || !firebaseDb) return;
    
    try {
        const userRef = firebaseDb.collection('users').doc(currentUser.uid);
        await userRef.update({
            attendanceData: data
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
            if (oldStatus === 'present' && newStatus === 'absent') {
                data.subjects[subject].present--;
                data.subjects[subject].absent++;
            } else if (oldStatus === 'absent' && newStatus === 'present') {
                data.subjects[subject].present++;
                data.subjects[subject].absent--;
            }
            
            // Add session record
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
        
        // Update Home Page UI
        if (currentPath.includes('index.html') || currentPath === '/') {
            const classCards = document.querySelectorAll('.class-card');
            
            classCards.forEach((card, index) => {
                const classData = data.todaysClasses[index];
                if (!classData) return;
                
                const statusText = card.querySelector('.status span');
                const presentBtn = card.querySelector('.btn-present');
                const absentBtn = card.querySelector('.btn-absent');
                
                statusText.textContent = classData.status;
                statusText.className = classData.status === 'present' ? 'status-present' : '';
                
                presentBtn.classList.toggle('active', classData.status === 'present');
                absentBtn.classList.toggle('active', classData.status === 'absent');
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
            const subjectCards = document.querySelectorAll('.subject-card');
            
            let index = 0;
            for (const subject in data.subjects) {
                if (index >= subjectCards.length) break;
                
                const card = subjectCards[index];
                const subjectData = data.subjects[subject];
                
                card.querySelector('.subject-name').textContent = subject;
                card.querySelector('.present-count span').textContent = subjectData.present;
                card.querySelector('.absent-count span').textContent = subjectData.absent;
                
                const percentage = calculatePercentage(subjectData.present, subjectData.absent);
                card.querySelector('.percentage-bar .percentage').textContent = `${percentage}%`;
                
                index++;
            }
        }
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Add event listeners to attendance buttons
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check if Firebase exists
        if (typeof firebase === 'undefined') {
            console.error("Firebase SDK not found");
            alert("Firebase SDK not found. Please check your internet connection and try again.");
            return;
        }

        // Initialize data and update UI
        initializeData();
        
        // Add event listeners to buttons on home page
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            const classCards = document.querySelectorAll('.class-card');
            
            classCards.forEach((card, index) => {
                const classId = index + 1;
                const presentBtn = card.querySelector('.btn-present');
                const absentBtn = card.querySelector('.btn-absent');
                
                presentBtn.addEventListener('click', function() {
                    updateAttendance(classId, 'present');
                });
                
                absentBtn.addEventListener('click', function() {
                    updateAttendance(classId, 'absent');
                });
            });
        }
        
        // Update current time in status bar
        updateCurrentTime();
        setInterval(updateCurrentTime, 60000); // Update time every minute
    } catch (error) {
        console.error('Error in DOM content loaded:', error);
    }
});

// Function to update current time in status bar
function updateCurrentTime() {
    try {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        const timeElements = document.querySelectorAll('.time');
        timeElements.forEach(el => {
            el.textContent = timeString;
        });
    } catch (error) {
        console.error('Error updating time:', error);
    }
} 