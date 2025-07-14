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
                // Get current day of the week
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const today = new Date();
                const currentDay = daysOfWeek[today.getDay()];
                console.log("Current day:", currentDay);
                
                // Check if the user already has attendance data in Firestore
                const userRef = firebaseDb.collection('users').doc(user.uid);
                const userDoc = await userRef.get({ source: "server" }); // Force server fetch
                
                // Fetch subjects from admin-created subjects collection
                const subjectsSnapshot = await firebaseDb.collection('subjects').get();
                
                // Process admin-defined subjects, filtering by current day
                const subjectsForToday = [];
                subjectsSnapshot.forEach(doc => {
                    const subjectData = doc.data();
                    const subjectName = subjectData.name;
                    
                    // Check if this subject is scheduled for today
                    const classDays = subjectData.classDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; // Default to weekdays if not specified
                    
                    // Only include subjects for today
                    if (classDays.includes(currentDay)) {
                        subjectsForToday.push({
                            id: doc.id,
                            name: subjectName,
                            classOrder: subjectData.classOrder || 999, // Default to a high number if no order specified
                            data: { 
                                present: 0, 
                                absent: 0,
                                sessions: []
                            }
                        });
                    }
                });
                
                // Sort subjects by classOrder
                subjectsForToday.sort((a, b) => a.classOrder - b.classOrder);
                
                // Create adminSubjects object from the sorted array
                const adminSubjects = {};
                subjectsForToday.forEach(subject => {
                    adminSubjects[subject.name] = subject.data;
                });
                
                console.log("Admin subjects for today:", Object.keys(adminSubjects));
                
                // Create initial classes array from admin subjects for today
                const todaysClasses = Object.keys(adminSubjects).map((subject, index) => {
                    // Get the corresponding subject data to find the order
                    const subjectObj = subjectsForToday.find(s => s.name === subject);
                    const classOrder = subjectObj ? subjectObj.classOrder : (index + 1);
                    
                    // Create an ordinal label based on the class order
                    const orderSuffix = getOrdinalSuffix(classOrder);
                    const label = `${classOrder}${orderSuffix} class`;
                    
                    return {
                        id: index + 1,
                        subject: subject,
                        status: 'unmarked',
                        label: label,
                        classOrder: classOrder
                    };
                });
                
                if (userDoc.exists) {
                    if (userDoc.data().attendanceData) {
                        console.log("User has existing attendance data");
                        // User already has data, update it with current admin subjects
                        const existingData = userDoc.data().attendanceData;
                        const existingSubjects = existingData.subjects || {};
                        
                        // Keep existing attendance data for all subjects
                        const updatedSubjects = { ...existingSubjects };

                        // Add any new subjects for today with proper validation
                        Object.keys(adminSubjects).forEach(subject => {
                            if (!updatedSubjects[subject]) {
                                updatedSubjects[subject] = {
                                    present: 0,
                                    absent: 0,
                                    sessions: []
                                };
                            } else {
                                // Ensure existing subjects have proper structure
                                if (!updatedSubjects[subject].sessions) {
                                    updatedSubjects[subject].sessions = [];
                                }
                                if (typeof updatedSubjects[subject].present !== 'number') {
                                    updatedSubjects[subject].present = 0;
                                }
                                if (typeof updatedSubjects[subject].absent !== 'number') {
                                    updatedSubjects[subject].absent = 0;
                                }
                            }
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

                        // Create initial data structure
                        let updatedData = {
                            subjects: updatedSubjects,
                            todaysClasses: updatedClasses,
                            lastResetDate: existingData.lastResetDate // Preserve existing reset date
                        };

                        // Check if daily reset is needed
                        if (needsDailyReset(updatedData)) {
                            console.log("Daily reset needed - resetting today's class statuses");
                            updatedData = resetDailyAttendance(updatedData, todaysClasses);
                        } else {
                            console.log("No daily reset needed - using existing class statuses");
                        }
                        
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
                            todaysClasses: todaysClasses,
                            lastResetDate: new Date().toISOString()
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
                        todaysClasses: todaysClasses,
                        lastResetDate: new Date().toISOString()
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

// Function to check if attendance data needs daily reset
function needsDailyReset(attendanceData) {
    if (!attendanceData || !attendanceData.lastResetDate) {
        return true; // No reset date means it needs reset
    }

    const today = new Date();
    const todayDateString = today.toDateString(); // e.g., "Mon Dec 25 2023"
    const lastResetDate = new Date(attendanceData.lastResetDate);
    const lastResetDateString = lastResetDate.toDateString();

    return todayDateString !== lastResetDateString;
}

// Function to reset daily attendance data while preserving historical data
function resetDailyAttendance(attendanceData, todaysClasses) {
    console.log("Resetting daily attendance data for new day");

    // Reset all today's classes to 'unmarked' status
    const resetClasses = todaysClasses.map(classItem => ({
        ...classItem,
        status: 'unmarked'
    }));

    // Update attendance data with reset classes and new reset date
    const updatedData = {
        ...attendanceData,
        todaysClasses: resetClasses,
        lastResetDate: new Date().toISOString()
    };

    console.log("Daily attendance reset completed");
    return updatedData;
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

// Function to validate attendance data integrity
function validateAttendanceData(data) {
    // Use enhanced validation manager if available
    if (window.validationManager) {
        const validation = window.validationManager.validateAttendanceData(data);
        return {
            valid: validation.valid,
            error: validation.errors.length > 0 ? validation.errors[0] : null,
            errors: validation.errors
        };
    }

    // Fallback validation
    if (!data || !data.subjects || !data.todaysClasses) {
        return { valid: false, error: "Invalid attendance data structure" };
    }

    // Check if all subjects in todaysClasses exist in subjects
    for (const classData of data.todaysClasses) {
        if (!data.subjects[classData.subject]) {
            return { valid: false, error: `Subject ${classData.subject} not found in subjects data` };
        }
    }

    return { valid: true };
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

        // Validate data integrity
        const validation = validateAttendanceData(data);
        if (!validation.valid) {
            hideLoading();
            showToast(`Data validation error: ${validation.error}`);
            console.error("Attendance data validation failed:", validation.error);
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

            // Ensure subject data structure exists and is valid
            if (!data.subjects[subject]) {
                data.subjects[subject] = { present: 0, absent: 0, sessions: [] };
            }
            if (!data.subjects[subject].sessions) {
                data.subjects[subject].sessions = [];
            }

            // Update class status
            classToUpdate.status = newStatus;

            // Update subject count with validation
            if (oldStatus === 'present') {
                data.subjects[subject].present = Math.max(0, (data.subjects[subject].present || 0) - 1);
            } else if (oldStatus === 'absent') {
                data.subjects[subject].absent = Math.max(0, (data.subjects[subject].absent || 0) - 1);
            }

            if (newStatus === 'present') {
                data.subjects[subject].present = (data.subjects[subject].present || 0) + 1;
            } else if (newStatus === 'absent') {
                data.subjects[subject].absent = (data.subjects[subject].absent || 0) + 1;
            }

            // Add session record with timestamp and validation
            const sessionRecord = {
                date: new Date().toISOString(),
                status: newStatus,
                classId: classId
            };

            data.subjects[subject].sessions.push(sessionRecord);

            // Log the activity
            logUserActivity('Marked attendance', {
                subject: subject,
                status: newStatus,
                classId: classId,
                timestamp: new Date().toISOString(),
                previousStatus: oldStatus
            });

            // Validate data again before saving
            const finalValidation = validateAttendanceData(data);
            if (!finalValidation.valid) {
                hideLoading();
                showToast(`Data validation error before save: ${finalValidation.error}`);
                console.error("Final attendance data validation failed:", finalValidation.error);
                return;
            }

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

// Function to check if a subject has any actual attendance data
function hasAttendanceData(subjectData) {
    if (!subjectData) return false;

    const present = subjectData.present || 0;
    const absent = subjectData.absent || 0;
    const sessions = subjectData.sessions || [];

    // Check if there are any recorded sessions or non-zero counts
    return sessions.length > 0 || present > 0 || absent > 0;
}

// Function to get attendance status for a subject
function getAttendanceStatus(subjectData) {
    if (!hasAttendanceData(subjectData)) {
        return {
            status: 'no-data',
            message: 'No attendance recorded yet',
            hasData: false
        };
    }

    const present = subjectData.present || 0;
    const absent = subjectData.absent || 0;
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
        status: percentage >= 75 ? 'good' : 'warning',
        message: `${percentage}% attendance (${present}/${total})`,
        hasData: true,
        percentage: percentage,
        present: present,
        absent: absent,
        total: total
    };
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

// Display subjects on the report page
function displaySubjects(data) {
    if (!data || !data.subjects) {
        console.error("Invalid data provided to displaySubjects");
        return;
    }
    
    // On the report page, we use renderSubjects
    if (typeof renderSubjects === 'function') {
        // Check if we're on the report page
        if (window.location.pathname.includes('report')) {
            console.log("Rendering subjects for report page");
            
            // Fetch all subjects, not just today's
            firebaseDb.collection('subjects').orderBy('classOrder').get()
                .then(snapshot => {
                    const allSubjects = [];
                    snapshot.forEach(doc => {
                        allSubjects.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // If no subjects found in the collection, use the subjects from user data
                    if (allSubjects.length === 0 && data.subjects) {
                        console.log("No subjects in collection, using user data");
                        renderSubjects(data.subjects, data);
                    } else {
                        console.log("Using subjects from collection", allSubjects);
                        renderSubjects(allSubjects, data);
                    }
                })
                .catch(error => {
                    console.error("Error fetching all subjects for report:", error);
                    // Fallback to using subjects from user data
                    console.log("Falling back to user data for subjects");
                    renderSubjects(data.subjects, data);
                });
        }
    } else {
        console.warn("renderSubjects function not found on this page");
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
        
        // Log user activity based on the page they're viewing
        if (currentPath.includes('dashboard')) {
            logUserActivity('Viewed dashboard');
        } else if (currentPath.includes('report')) {
            logUserActivity('Viewed attendance report');
        }
        
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
                    
                    // Get current day of the week
                    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const today = new Date();
                    const currentDay = daysOfWeek[today.getDay()];
                    
                    noClassesMsg.textContent = `No classes scheduled for ${currentDay}. Check back on your next class day.`;
                    classesSection.appendChild(noClassesMsg);
                } else {
                    // Sort classes by classOrder if available
                    const sortedClasses = [...data.todaysClasses].sort((a, b) => {
                        const orderA = a.classOrder || 999;
                        const orderB = b.classOrder || 999;
                        return orderA - orderB;
                    });
                    
                    // Add class cards dynamically based on subjects
                    sortedClasses.forEach(classData => {
                        const classCard = document.createElement('div');
                        classCard.className = 'class-card';

                        let statusText = 'Mark your attendance';
                        let statusClass = 'status-unmarked';
                        let attendanceInfo = '';

                        // Check if this subject has any attendance data
                        const subjectData = data.subjects[classData.subject];
                        const attendanceStatus = getAttendanceStatus(subjectData);

                        // Add visual indicator for marked attendance
                        if (classData.status === 'present') {
                            statusText = 'Present';
                            statusClass = 'status-present';
                            classCard.classList.add('attendance-marked');
                        } else if (classData.status === 'absent') {
                            statusText = 'Absent';
                            statusClass = 'status-absent';
                            classCard.classList.add('attendance-marked');
                        }

                        // Add attendance summary info if there's data
                        if (attendanceStatus.hasData) {
                            attendanceInfo = `
                                <div class="attendance-summary ${attendanceStatus.status}">
                                    <small>${attendanceStatus.message}</small>
                                </div>
                            `;
                        } else {
                            attendanceInfo = `
                                <div class="attendance-summary no-data">
                                    <small>No attendance history yet</small>
                                </div>
                            `;
                        }

                        classCard.innerHTML = `
                            <div class="class-info">
                                <div class="subject">${classData.subject}</div>
                                <div class="status">Status: <span class="${statusClass}">${statusText}</span></div>
                                ${attendanceInfo}
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
            displaySubjects(data);
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

// Function to load user data for the admin panel
function loadUserData() {
    console.log("Loading user data for admin panel");
    showLoading("Loading user data...");
    
    if (!firebase || !firebase.firestore) {
        console.error("Firebase not initialized");
        hideLoading();
        showToast("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    const db = firebase.firestore();
    const usersRef = db.collection('users');
    
    usersRef.get()
        .then((snapshot) => {
            const userData = [];
            snapshot.forEach((doc) => {
                const user = doc.data();
                userData.push({
                    id: doc.id,
                    name: user.name || 'Unknown',
                    email: user.email || 'No email',
                    lastLogin: user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleString() : 'Never',
                    attendanceData: user.attendanceData || { subjects: {} }
                });
            });
            
            // Update the users table
            updateUserTable(userData);
            
            // Update the dashboard chart
            updateDashboardChart(userData);
            
            hideLoading();
        })
        .catch((error) => {
            console.error("Error loading user data:", error);
            hideLoading();
            showToast("Error loading user data. Please try again.");
        });
}

// Function to load subjects for the admin panel
function loadSubjects() {
    console.log("Loading subjects for admin panel");
    showLoading("Loading subjects...");
    
    if (!firebase || !firebase.firestore) {
        console.error("Firebase not initialized");
        hideLoading();
        showToast("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    const db = firebase.firestore();
    const subjectsRef = db.collection('subjects');
    
    subjectsRef.get()
        .then((snapshot) => {
            const subjectsData = [];
            snapshot.forEach((doc) => {
                const subject = doc.data();
                subjectsData.push({
                    id: doc.id,
                    name: subject.name || 'Unnamed Subject',
                    classOrder: subject.classOrder || 0,
                    classDays: subject.classDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                });
            });
            
            // Update the subjects table
            updateSubjectsTable(subjectsData);
            
            hideLoading();
        })
        .catch((error) => {
            console.error("Error loading subjects:", error);
            hideLoading();
            showToast("Error loading subjects. Please try again.");
        });
}

// Function to update the users table in the admin panel
function updateUserTable(userData) {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;
    
    userTableBody.innerHTML = '';
    
    if (userData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">No users found</td>';
        userTableBody.appendChild(row);
        return;
    }
    
    userData.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Calculate attendance percentages
        let totalPresent = 0;
        let totalAbsent = 0;
        
        if (user.attendanceData && user.attendanceData.subjects) {
            Object.values(user.attendanceData.subjects).forEach(subject => {
                totalPresent += subject.present || 0;
                totalAbsent += subject.absent || 0;
            });
        }
        
        const totalClasses = totalPresent + totalAbsent;
        const attendancePercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${attendancePercentage}%</td>
            <td>
                <button class="btn btn-sm btn-primary view-details-btn" data-user-id="${user.id}">
                    View Details
                </button>
                <button class="btn btn-sm btn-success export-user-btn" data-user-id="${user.id}">
                    Export Data
                </button>
            </td>
        `;
        
        userTableBody.appendChild(row);
    });
    
    // Add event listeners to the view details buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const user = userData.find(u => u.id === userId);
            if (user) {
                showUserDetails(user);
            }
        });
    });
    
    // Add event listeners to the export buttons
    document.querySelectorAll('.export-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const user = userData.find(u => u.id === userId);
            if (user) {
                exportUserData(user);
            }
        });
    });
}

// Function to update the subjects table in the admin panel
function updateSubjectsTable(subjectsData) {
    const subjectTableBody = document.getElementById('subjectTableBody');
    if (!subjectTableBody) return;
    
    subjectTableBody.innerHTML = '';
    
    if (subjectsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">No subjects found</td>';
        subjectTableBody.appendChild(row);
        return;
    }
    
    subjectsData.forEach((subject, index) => {
        const row = document.createElement('tr');
        
        // Format class days
        const classDays = subject.classDays ? subject.classDays.join(', ') : 'Not specified';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${subject.name}</td>
            <td>${classDays}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-subject-btn" data-subject-id="${subject.id}">
                    Delete
                </button>
            </td>
        `;
        
        subjectTableBody.appendChild(row);
    });
    
    // Add event listeners to the delete buttons
    document.querySelectorAll('.delete-subject-btn').forEach(button => {
        button.addEventListener('click', function() {
            const subjectId = this.getAttribute('data-subject-id');
            if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
                deleteSubject(subjectId);
            }
        });
    });
}

// Function to show user details in a modal
function showUserDetails(user) {
    const modal = document.getElementById('userDetailsModal');
    if (!modal) return;
    
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    
    modalTitle.textContent = `${user.name}'s Details`;
    
    // Prepare subject-wise attendance data
    let subjectsHtml = '';
    
    if (user.attendanceData && user.attendanceData.subjects) {
        const subjects = user.attendanceData.subjects;
        
        if (Object.keys(subjects).length === 0) {
            subjectsHtml = '<p>No subject data available</p>';
        } else {
            subjectsHtml = '<div class="table-responsive"><table class="table table-bordered">';
            subjectsHtml += '<thead><tr><th>Subject</th><th>Present</th><th>Absent</th><th>Percentage</th></tr></thead><tbody>';
            
            Object.entries(subjects).forEach(([subjectName, data]) => {
                const present = data.present || 0;
                const absent = data.absent || 0;
                const total = present + absent;
                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
                
                subjectsHtml += `
                    <tr>
                        <td>${subjectName}</td>
                        <td>${present}</td>
                        <td>${absent}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            });
            
            subjectsHtml += '</tbody></table></div>';
        }
    } else {
        subjectsHtml = '<p>No attendance data available</p>';
    }
    
    // Create modal content
    modalBody.innerHTML = `
        <div class="user-info-container">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Last Login:</strong> ${user.lastLogin}</p>
            <h5>Attendance Data</h5>
            ${subjectsHtml}
        </div>
    `;
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Function to update the dashboard chart
function updateDashboardChart(userData) {
    const chartCanvas = document.getElementById('attendanceChart');
    if (!chartCanvas) return;
    
    // Calculate attendance statistics
    const totalUsers = userData.length;
    let goodAttendance = 0; // >= 75%
    let averageAttendance = 0; // 50-75%
    let poorAttendance = 0; // < 50%
    
    userData.forEach(user => {
        let totalPresent = 0;
        let totalAbsent = 0;
        
        if (user.attendanceData && user.attendanceData.subjects) {
            Object.values(user.attendanceData.subjects).forEach(subject => {
                totalPresent += subject.present || 0;
                totalAbsent += subject.absent || 0;
            });
        }
        
        const totalClasses = totalPresent + totalAbsent;
        const attendancePercentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
        
        if (attendancePercentage >= 75) {
            goodAttendance++;
        } else if (attendancePercentage >= 50) {
            averageAttendance++;
        } else {
            poorAttendance++;
        }
    });
    
    // Create or update chart
    if (window.attendanceChart) {
        window.attendanceChart.data.datasets[0].data = [goodAttendance, averageAttendance, poorAttendance];
        window.attendanceChart.update();
    } else if (window.Chart) {
        window.attendanceChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Good (≥75%)', 'Average (50-75%)', 'Poor (<50%)'],
                datasets: [{
                    data: [goodAttendance, averageAttendance, poorAttendance],
                    backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Attendance Distribution'
                    }
                }
            }
        });
    }
    
    // Update summary cards
    updateSummaryCards(userData);
}

// Function to update summary cards
function updateSummaryCards(userData) {
    // Update total users card
    const totalUsersElement = document.getElementById('totalUsers');
    if (totalUsersElement) {
        totalUsersElement.textContent = userData.length;
    }
    
    // Calculate other statistics
    let activeUsers = 0;
    let totalAttendance = 0;
    let subjectCount = new Set();
    
    userData.forEach(user => {
        // Count active users (logged in within the last 7 days)
        if (user.lastLogin && new Date(user.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
            activeUsers++;
        }
        
        // Calculate attendance percentage
        let userPresent = 0;
        let userTotal = 0;
        
        if (user.attendanceData && user.attendanceData.subjects) {
            Object.entries(user.attendanceData.subjects).forEach(([subjectName, data]) => {
                subjectCount.add(subjectName);
                userPresent += data.present || 0;
                userTotal += (data.present || 0) + (data.absent || 0);
            });
        }
        
        if (userTotal > 0) {
            totalAttendance += (userPresent / userTotal) * 100;
        }
    });
    
    // Update active users card
    const activeUsersElement = document.getElementById('activeUsers');
    if (activeUsersElement) {
        activeUsersElement.textContent = activeUsers;
    }
    
    // Update average attendance card
    const avgAttendanceElement = document.getElementById('avgAttendance');
    if (avgAttendanceElement) {
        const avgAttendance = userData.length > 0 ? Math.round(totalAttendance / userData.length) : 0;
        avgAttendanceElement.textContent = `${avgAttendance}%`;
    }
    
    // Update total subjects card
    const totalSubjectsElement = document.getElementById('totalSubjects');
    if (totalSubjectsElement) {
        totalSubjectsElement.textContent = subjectCount.size;
    }
}

// Function to delete a subject
function deleteSubject(subjectId) {
    showLoading("Deleting subject...");
    
    if (!firebase || !firebase.firestore) {
        console.error("Firebase not initialized");
        hideLoading();
        showToast("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    const db = firebase.firestore();
    
    // Get subject data before deleting (for backup)
    db.collection('subjects').doc(subjectId).get()
        .then((doc) => {
            if (doc.exists) {
                const subjectData = doc.data();
                
                // Store in deletedRecords collection
                return db.collection('deletedRecords').add({
                    type: 'subject',
                    data: subjectData,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deletedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'unknown'
                }).then(() => {
                    // Now delete the subject
                    return db.collection('subjects').doc(subjectId).delete();
                });
            } else {
                return db.collection('subjects').doc(subjectId).delete();
            }
        })
        .then(() => {
            hideLoading();
            showToast("Subject deleted successfully");
            
            // Reload subjects
            loadSubjects();
        })
        .catch((error) => {
            console.error("Error deleting subject:", error);
            hideLoading();
            showToast("Error deleting subject. Please try again.");
        });
}

// Function to export user data to Excel
function exportUserData(user) {
    showLoading("Preparing export...");
    
    try {
        // Check if ExcelJS is available
        if (!window.ExcelJS) {
            showToast("ExcelJS library not loaded. Please refresh the page.");
            hideLoading();
            return;
        }
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Data');
        
        // Add user info
        worksheet.addRow(['User Information']);
        worksheet.addRow(['Name', user.name]);
        worksheet.addRow(['Email', user.email]);
        worksheet.addRow(['Last Login', user.lastLogin]);
        worksheet.addRow([]);
        
        // Add attendance data
        worksheet.addRow(['Subject', 'Present', 'Absent', 'Percentage']);
        
        if (user.attendanceData && user.attendanceData.subjects) {
            Object.entries(user.attendanceData.subjects).forEach(([subjectName, data]) => {
                const present = data.present || 0;
                const absent = data.absent || 0;
                const total = present + absent;
                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
                
                worksheet.addRow([subjectName, present, absent, `${percentage}%`]);
            });
        }
        
        // Style the worksheet
        worksheet.getColumn(1).width = 20;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 15;
        
        // Generate file
        workbook.xlsx.writeBuffer()
            .then(buffer => {
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${user.name}_attendance_data.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
                hideLoading();
                showToast("Export completed successfully");
            })
            .catch(error => {
                console.error("Error generating Excel file:", error);
                hideLoading();
                showToast("Error generating Excel file");
            });
    } catch (error) {
        console.error("Error in export function:", error);
        hideLoading();
        showToast("Error exporting data");
    }
}

// Check if user is admin
function checkAdmin() {
    return new Promise((resolve, reject) => {
        if (!firebase || !firebase.auth()) {
            reject(new Error("Firebase not initialized"));
            return;
        }
        
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            reject(new Error("No user logged in"));
            return;
        }
        
        // Check if user's email is in the admin list
        const adminEmails = ['admin@admin.com']; // Add more admin emails as needed
        resolve(adminEmails.includes(currentUser.email));
    });
}

// Enhanced User Activity Tracking System with Structured Logging
class ActivityTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = new Date();
        this.pageLoadTime = new Date();
        this.activityQueue = [];
        this.isOnline = navigator.onLine;
        this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR
        this.maxQueueSize = 100;
        this.setupEventListeners();
        this.startHeartbeat();
        this.initializeStructuredLogging();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize structured logging configuration
    initializeStructuredLogging() {
        this.logConfig = {
            levels: {
                DEBUG: 0,
                INFO: 1,
                WARN: 2,
                ERROR: 3
            },
            format: {
                timestamp: true,
                level: true,
                sessionId: true,
                userId: true,
                structured: true
            },
            rotation: {
                enabled: true,
                maxSize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                compress: true
            }
        };
    }

    // Check if log level should be processed
    shouldLog(level) {
        const currentLevel = this.logConfig.levels[this.logLevel] || 1;
        const messageLevel = this.logConfig.levels[level] || 1;
        return messageLevel >= currentLevel;
    }

    // Create structured log entry
    createStructuredLog(level, activity, additionalData = null) {
        const user = firebase.auth()?.currentUser;
        const timestamp = new Date().toISOString();

        const structuredLog = {
            '@timestamp': timestamp,
            '@version': '1',
            level: level,
            logger: 'ActivityTracker',
            thread: 'main',
            message: activity,
            sessionId: this.sessionId,
            userId: user?.uid || 'anonymous',
            userName: user?.displayName || 'Unknown User',
            userEmail: user?.email || 'Unknown Email',
            page: window.location.pathname,
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            connectionType: navigator.connection?.effectiveType || 'unknown',
            onlineStatus: navigator.onLine,
            additionalData: additionalData
        };

        // Add device and browser info
        const deviceInfo = this.getDeviceInfo();
        Object.assign(structuredLog, deviceInfo);

        return structuredLog;
    }

    setupEventListeners() {
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logActivity('Page hidden', { visibility: 'hidden' });
            } else {
                this.logActivity('Page visible', { visibility: 'visible' });
            }
        });

        // Track online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.logActivity('Connection restored', { connectionStatus: 'online' });
            this.flushQueuedActivities();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.logActivity('Connection lost', { connectionStatus: 'offline' });
        });

        // Track page unload
        window.addEventListener('beforeunload', () => {
            const sessionDuration = new Date() - this.sessionStartTime;
            this.logActivity('Session ended', {
                sessionDuration: sessionDuration,
                sessionId: this.sessionId
            });
        });

        // Track errors
        window.addEventListener('error', (event) => {
            this.logActivity('JavaScript error', {
                error: event.error?.message || 'Unknown error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logActivity('Unhandled promise rejection', {
                reason: event.reason?.toString() || 'Unknown reason'
            });
        });
    }

    startHeartbeat() {
        // Send heartbeat every 5 minutes to track active sessions
        setInterval(() => {
            if (!document.hidden) {
                this.logActivity('Heartbeat', {
                    sessionId: this.sessionId,
                    sessionDuration: new Date() - this.sessionStartTime
                });
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    async logActivity(activity, additionalData = null, level = 'INFO') {
        try {
            // Check if this log level should be processed
            if (!this.shouldLog(level)) {
                return;
            }

            const user = firebase.auth().currentUser;
            if (!user && level !== 'ERROR') return; // Allow error logs even without user

            // Create structured log entry
            const structuredLog = this.createStructuredLog(level, activity, additionalData);

            // Add Firebase timestamp for server-side ordering
            structuredLog.serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();

            // Manage queue size to prevent memory issues
            if (this.activityQueue.length >= this.maxQueueSize) {
                this.activityQueue.shift(); // Remove oldest entry
            }

            if (this.isOnline) {
                await firebaseDb.collection('userLogs').add(structuredLog);
                console.log(`[${level}] Activity logged:`, activity);

                // Process any queued activities
                await this.flushActivityQueue();
            } else {
                // Queue activity for later when online
                this.activityQueue.push(structuredLog);
                console.log(`[${level}] Activity queued (offline):`, activity);
            }
        } catch (error) {
            console.error("Error logging activity:", error);
            // Queue activity for retry with exponential backoff
            const retryCount = (additionalData?.retryCount || 0) + 1;
            if (retryCount <= 3) { // Max 3 retries
                const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                setTimeout(() => {
                    this.logActivity(activity, { ...additionalData, retryCount }, level);
                }, retryDelay);
            }
        }
    }

    // Flush queued activities when back online
    async flushActivityQueue() {
        if (this.activityQueue.length === 0) return;

        const queueCopy = [...this.activityQueue];
        this.activityQueue = [];

        for (const logEntry of queueCopy) {
            try {
                await firebaseDb.collection('userLogs').add(logEntry);
                console.log("Queued activity flushed:", logEntry.message);
            } catch (error) {
                console.error("Failed to flush queued activity:", error);
                // Re-queue failed entries
                this.activityQueue.push(logEntry);
            }
        }
    }

    async flushQueuedActivities() {
        if (this.activityQueue.length === 0) return;

        console.log(`Flushing ${this.activityQueue.length} queued activities...`);
        const activities = [...this.activityQueue];
        this.activityQueue = [];

        for (const activity of activities) {
            try {
                if (activity.retryCount && activity.retryCount > 3) {
                    console.warn("Dropping activity after 3 retries:", activity);
                    continue;
                }
                await this.logActivity(activity.activity, activity.additionalData);
            } catch (error) {
                console.error("Error flushing queued activity:", error);
                // Re-queue with retry count
                this.activityQueue.push({
                    ...activity,
                    retryCount: (activity.retryCount || 0) + 1
                });
            }
        }
    }

    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        return {
            browser: this.getBrowserInfo(userAgent),
            os: this.getOSInfo(userAgent),
            device: this.getDeviceType(userAgent),
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent)
        };
    }

    getBrowserInfo(userAgent) {
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        return 'Unknown';
    }

    getOSInfo(userAgent) {
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Unknown';
    }

    getDeviceType(userAgent) {
        if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
        if (/mobile|phone/i.test(userAgent)) return 'Mobile';
        return 'Desktop';
    }
}

// Initialize activity tracker
let activityTracker;
if (typeof window !== 'undefined') {
    activityTracker = new ActivityTracker();
}

// Enhanced function to log user activity (backward compatibility)
async function logUserActivity(activity, additionalData = null) {
    if (activityTracker) {
        await activityTracker.logActivity(activity, additionalData);
    } else {
        // Fallback to original implementation
        try {
            const user = firebase.auth().currentUser;
            if (!user) return;

            const logData = {
                userId: user.uid,
                userName: user.displayName || "Unknown User",
                userEmail: user.email || "Unknown Email",
                activity: activity,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                page: window.location.pathname,
                additionalData: additionalData
            };

            await firebaseDb.collection('userLogs').add(logData);
            console.log("Activity logged:", activity);
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    }
}

// Enhanced Activity Tracking Functions
function trackFormSubmission(formName, formData = {}) {
    logUserActivity('Form submitted', {
        formName: formName,
        formData: Object.keys(formData).reduce((acc, key) => {
            // Don't log sensitive data like passwords
            if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
                acc[key] = '[REDACTED]';
            } else {
                acc[key] = formData[key];
            }
            return acc;
        }, {}),
        formFields: Object.keys(formData).length
    });
}

function trackButtonClick(buttonName, buttonContext = {}) {
    logUserActivity('Button clicked', {
        buttonName: buttonName,
        buttonContext: buttonContext,
        clickTime: new Date().toISOString()
    });
}

function trackPageView(pageName, pageData = {}) {
    logUserActivity('Page viewed', {
        pageName: pageName,
        pageData: pageData,
        loadTime: new Date() - (activityTracker?.pageLoadTime || new Date()),
        previousPage: document.referrer
    });
}

function trackDataModification(action, dataType, recordId = null, changes = {}) {
    logUserActivity('Data modified', {
        action: action, // 'create', 'update', 'delete'
        dataType: dataType, // 'user', 'attendance', 'subject', etc.
        recordId: recordId,
        changes: changes,
        modificationTime: new Date().toISOString()
    });
}

// Enhanced Error Management System with Unique IDs
class ErrorManager {
    constructor() {
        this.errorQueue = [];
        this.isOnline = navigator.onLine;
        this.setupGlobalErrorHandlers();
    }

    // Generate unique error ID using UUID v4 format
    generateErrorId() {
        // Simple UUID v4 implementation for browser compatibility
        return 'ERR-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }).toUpperCase();
    }

    // Setup global error handlers
    setupGlobalErrorHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                source: 'window.error'
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason?.toString() || 'Unknown promise rejection',
                stack: event.reason?.stack,
                source: 'unhandledrejection'
            });
        });

        // Handle network status changes
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.flushErrorQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Main error handling function
    async handleError(errorInfo, userContext = {}) {
        const errorId = this.generateErrorId();
        const timestamp = new Date().toISOString();

        // Get current user info
        const user = firebase.auth()?.currentUser;

        // Create comprehensive error object
        const errorData = {
            errorId: errorId,
            timestamp: timestamp,
            type: errorInfo.type || 'Unknown Error',
            message: errorInfo.message || 'No message provided',
            stack: errorInfo.stack || new Error().stack,
            filename: errorInfo.filename || 'Unknown file',
            lineno: errorInfo.lineno || 0,
            colno: errorInfo.colno || 0,
            source: errorInfo.source || 'manual',

            // User context
            userId: user?.uid || 'anonymous',
            userEmail: user?.email || 'anonymous',
            userName: user?.displayName || 'anonymous',

            // Browser context
            userAgent: navigator.userAgent,
            url: window.location.href,
            page: window.location.pathname,
            referrer: document.referrer,

            // Device context
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

            // Additional context
            userContext: userContext,

            // Firebase timestamp for Firestore
            firestoreTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Log to console for debugging
        console.error(`[${errorId}] ${errorData.type}:`, errorData.message);
        console.error('Error details:', errorData);

        // Show user-friendly error message
        this.showUserFriendlyError(errorId, errorData.type, errorData.message);

        // Store error in Firestore
        await this.storeError(errorData);

        // Track error activity
        if (window.logUserActivity) {
            logUserActivity('Error occurred', {
                errorId: errorId,
                errorType: errorData.type,
                errorMessage: errorData.message,
                errorTime: timestamp
            });
        }

        return errorId;
    }

    // Store error in Firestore
    async storeError(errorData) {
        try {
            if (this.isOnline && firebase.firestore) {
                await firebase.firestore().collection('errorLogs').add(errorData);
                console.log(`Error ${errorData.errorId} stored successfully`);
            } else {
                // Queue for later if offline
                this.errorQueue.push(errorData);
                console.log(`Error ${errorData.errorId} queued (offline)`);
            }
        } catch (error) {
            console.error('Failed to store error:', error);
            // Queue for retry
            this.errorQueue.push(errorData);
        }
    }

    // Flush queued errors when back online
    async flushErrorQueue() {
        if (this.errorQueue.length === 0) return;

        console.log(`Flushing ${this.errorQueue.length} queued errors...`);
        const errors = [...this.errorQueue];
        this.errorQueue = [];

        for (const errorData of errors) {
            try {
                await this.storeError(errorData);
            } catch (error) {
                console.error('Failed to flush error:', error);
                // Re-queue if still failing
                this.errorQueue.push(errorData);
            }
        }
    }

    // Show user-friendly error message
    showUserFriendlyError(errorId, errorType, errorMessage) {
        const userMessage = this.getUserFriendlyMessage(errorType, errorMessage);
        const fullMessage = `${userMessage}\n\nError ID: ${errorId}\nPlease contact support if this problem persists.`;

        // Try different toast methods
        if (typeof showToast === 'function') {
            showToast(`Error ${errorId}: ${userMessage}`, 'error');
        } else if (typeof window.showToast === 'function') {
            window.showToast(`Error ${errorId}: ${userMessage}`, 'error');
        } else {
            // Fallback to alert
            alert(fullMessage);
        }

        // Also show in console for developers
        console.warn(`User shown error ${errorId}: ${userMessage}`);
    }

    // Convert technical errors to user-friendly messages
    getUserFriendlyMessage(errorType, errorMessage) {
        const lowerMessage = errorMessage.toLowerCase();

        if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
            return 'Network connection problem. Please check your internet connection and try again.';
        } else if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
            return 'You don\'t have permission to perform this action. Please contact your administrator.';
        } else if (lowerMessage.includes('firebase') || lowerMessage.includes('firestore')) {
            return 'Database connection issue. Please try again in a moment.';
        } else if (lowerMessage.includes('auth') || lowerMessage.includes('login')) {
            return 'Authentication problem. Please try logging in again.';
        } else if (errorType.includes('Promise')) {
            return 'An operation failed to complete. Please try again.';
        } else {
            return 'An unexpected error occurred. Our team has been notified.';
        }
    }

    // Manual error reporting function
    reportError(message, context = {}) {
        return this.handleError({
            type: 'Manual Error Report',
            message: message,
            source: 'manual'
        }, context);
    }

    // Async operation wrapper with error handling
    async wrapAsync(operation, context = {}) {
        try {
            return await operation();
        } catch (error) {
            const errorId = await this.handleError({
                type: 'Async Operation Error',
                message: error.message,
                stack: error.stack,
                source: 'async_wrapper'
            }, context);
            throw new Error(`Operation failed (Error ID: ${errorId})`);
        }
    }
}

// Initialize global error manager
let errorManager;
if (typeof window !== 'undefined') {
    errorManager = new ErrorManager();
    window.errorManager = errorManager;
}

// Enhanced trackError function (backward compatibility)
function trackError(errorType, errorMessage, errorContext = {}) {
    if (errorManager) {
        return errorManager.handleError({
            type: errorType,
            message: errorMessage,
            source: 'track_error'
        }, errorContext);
    } else {
        // Fallback to original implementation
        logUserActivity('Error occurred', {
            errorType: errorType,
            errorMessage: errorMessage,
            errorContext: errorContext,
            stackTrace: new Error().stack,
            errorTime: new Date().toISOString()
        });
    }
}

// Global error reporting functions
window.reportError = function(message, context = {}) {
    if (errorManager) {
        return errorManager.reportError(message, context);
    }
};

window.wrapAsync = function(operation, context = {}) {
    if (errorManager) {
        return errorManager.wrapAsync(operation, context);
    }
    return operation();
};

// Input validation utilities
window.validateInput = {
    email: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    notEmpty: function(value) {
        return value && value.trim().length > 0;
    },

    minLength: function(value, minLength) {
        return value && value.length >= minLength;
    },

    maxLength: function(value, maxLength) {
        return value && value.length <= maxLength;
    },

    sanitizeHtml: function(input) {
        if (!input) return '';
        return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    },

    isValidDate: function(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
};

function trackFeatureUsage(featureName, featureData = {}) {
    logUserActivity('Feature used', {
        featureName: featureName,
        featureData: featureData,
        usageTime: new Date().toISOString()
    });
}

function trackSearchQuery(searchTerm, searchContext = {}) {
    logUserActivity('Search performed', {
        searchTerm: searchTerm,
        searchContext: searchContext,
        resultsCount: searchContext.resultsCount || 0,
        searchTime: new Date().toISOString()
    });
}

function trackExportAction(exportType, exportData = {}) {
    logUserActivity('Data exported', {
        exportType: exportType,
        exportData: exportData,
        exportTime: new Date().toISOString()
    });
}

// Auto-track common interactions
function setupAutoTracking() {
    // Track all form submissions
    document.addEventListener('submit', (event) => {
        const form = event.target;
        const formData = new FormData(form);
        const formObject = {};
        for (let [key, value] of formData.entries()) {
            formObject[key] = value;
        }
        trackFormSubmission(form.id || form.className || 'unknown-form', formObject);
    });

    // Track all button clicks
    document.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' || event.target.type === 'button' || event.target.type === 'submit') {
            const button = event.target;
            trackButtonClick(
                button.id || button.className || button.textContent?.substring(0, 20) || 'unknown-button',
                {
                    buttonType: button.type,
                    buttonText: button.textContent?.substring(0, 50),
                    parentForm: button.form?.id || null
                }
            );
        }
    });

    // Track navigation
    let currentPage = window.location.pathname;
    const observer = new MutationObserver(() => {
        if (window.location.pathname !== currentPage) {
            currentPage = window.location.pathname;
            trackPageView(currentPage);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Track focus/blur events for engagement
    let focusStartTime = new Date();
    window.addEventListener('focus', () => {
        focusStartTime = new Date();
        logUserActivity('Window focused');
    });

    window.addEventListener('blur', () => {
        const focusDuration = new Date() - focusStartTime;
        logUserActivity('Window blurred', { focusDuration: focusDuration });
    });
}

// Initialize auto-tracking when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAutoTracking);
} else {
    setupAutoTracking();
}

// Helper functions for user agent parsing
function getBrowserInfo(userAgent) {
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Edg")) return "Edge";
    if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) return "Internet Explorer";
    return "Unknown Browser";
}

function getOSInfo(userAgent) {
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac OS")) return "macOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
    return "Unknown OS";
}

function getDeviceInfo(userAgent) {
    if (userAgent.includes("Mobile")) return "Mobile";
    if (userAgent.includes("Tablet")) return "Tablet";
    return "Desktop";
} 