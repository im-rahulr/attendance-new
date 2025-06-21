// This file contains the UI-specific logic for dashboard.html

// Override the showLoading and hideLoading functions from script.js
window.showLoading = function(message = "Loading...") {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
};

window.hideLoading = function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
};

// Override the showToast function from script.js
window.showToast = function(message, duration = 3000) {
    const toastEl = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toastMessage) {
        toastMessage.textContent = message;
    }
    
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: duration });
        toast.show();
    }
};

// Update dashboard UI with data
function updateDashboardUI(data) {
    console.log("Updating dashboard UI with data:", data);
    
    if (!data || !data.todaysClasses) {
        console.log("No attendance data available");
        return;
    }
    
    const classesSection = document.querySelector('.classes-section');
    if (!classesSection) return;
    
    // Keep the title
    const title = classesSection.querySelector('.section-title');
    classesSection.innerHTML = '';
    if (title) {
        classesSection.appendChild(title);
    }
    
    // Check if there are any classes
    if (data.todaysClasses.length === 0) {
        const noClassesMsg = document.createElement('div');
        noClassesMsg.className = 'alert alert-info';
        noClassesMsg.textContent = 'No subjects have been added by the administrator yet.';
        classesSection.appendChild(noClassesMsg);
        return;
    }
    
    // Log the data to ensure we have status information
    console.log("Classes data for rendering:", data.todaysClasses);
    
    // Add class cards dynamically based on subjects
    data.todaysClasses.forEach(classData => {
        const classCard = document.createElement('div');
        
        let markedClass = '';
        let statusText = 'Mark your attendance';
        let statusClass = 'status-unmarked';
        
        if (classData.status === 'present') {
            statusText = 'Present';
            statusClass = 'status-present';
            markedClass = 'marked-present';
        } else if (classData.status === 'absent') {
            statusText = 'Absent';
            statusClass = 'status-absent';
            markedClass = 'marked-absent';
        }
        
        classCard.className = `class-card ${markedClass}`;
        
        // The visual indication is now handled entirely by the CSS on the class-card
        const subjectDisplay = `<div class="subject">${classData.subject}</div>`;
            
        classCard.innerHTML = `
            <div class="class-info">
                ${subjectDisplay}
                <div class="status">Status: <span class="${statusClass}">${statusText}</span></div>
            </div>
            <div class="class-label">${classData.label}</div>
            <div class="attendance-buttons">
                <button class="btn-present ${classData.status === 'present' ? 'active' : ''}" data-class-id="${classData.id}">Present</button>
                <button class="btn-absent ${classData.status === 'absent' ? 'active' : ''}" data-class-id="${classData.id}">Absent</button>
            </div>
        `;
        
        classesSection.appendChild(classCard);
    });
    
    // Re-attach event listeners to buttons with improved handling
    document.querySelectorAll('.btn-present, .btn-absent').forEach(button => {
        // Remove any existing event listeners first
        button.removeEventListener('click', handleAttendanceButtonClick);
        // Add the event listener
        button.addEventListener('click', handleAttendanceButtonClick);
    });
    
    // Separate function for better handling
    function handleAttendanceButtonClick(event) {
        const button = event.currentTarget;
        const classId = parseInt(button.getAttribute('data-class-id'));
        const status = button.classList.contains('btn-present') ? 'present' : 'absent';
        
        console.log(`Button clicked: Class ID ${classId}, Status ${status}`);
        
        // Prevent double-clicks
        if (button.disabled) {
            console.log('Button is already processing a click');
            return;
        }
        
        // Temporarily disable the button
        button.disabled = true;
        
        // Call the update function
        if (typeof updateAttendance === 'function') {
            updateAttendance(classId, status).finally(() => {
                // Re-enable the button after processing
                setTimeout(() => {
                    button.disabled = false;
                }, 1000);
            });
        } else {
            console.error('updateAttendance function not found');
            button.disabled = false;
        }
    }
}

// Setup real-time listener for user's attendance data
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Setting up listeners");
    
    // Check if Firebase Auth and Firestore are initialized
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
        // Set up real-time listener for the current user
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                console.log("User authenticated:", user.uid);
                
                // Set user's initials in profile icon
                const profileIcon = document.getElementById('profileIcon');
                if (profileIcon) {
                    const name = user.displayName || user.email || 'User';
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
                    profileIcon.textContent = initials;
                }
                
                // Set user's name in greeting
                const userName = document.getElementById('userName');
                if (userName) {
                    userName.textContent = user.displayName || 'User';
                }
                
                // Set up real-time listener for user's attendance data
                const userRef = firebase.firestore().collection('users').doc(user.uid);
                
                // Listen for real-time updates
                userRef.onSnapshot(
                    function(doc) {
                        console.log("Received Firestore update");
                        if (doc.exists && doc.data().attendanceData) {
                            const data = doc.data().attendanceData;
                            console.log("Attendance data received:", data);
                            updateDashboardUI(data);
                        } else {
                            console.log("No attendance data in document");
                        }
                    },
                    function(error) {
                        console.error("Real-time listener error:", error);
                    }
                );
            } else {
                console.log("No authenticated user");
            }
        });
    } else {
        console.error("Firebase not properly initialized");
    }
});

// Force refresh on page load
window.addEventListener('load', function() {
    console.log("Window loaded - Forcing data refresh");
    
    // Show loading indicator
    showLoading("Loading your attendance data...");
    
    // Check if user is authenticated
    if (firebase.auth().currentUser) {
        console.log("User is already authenticated on page load");
        const userRef = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid);
        
        // Force a refresh from server
        userRef.get({ source: "server" })
            .then(function(doc) {
                if (doc.exists && doc.data().attendanceData) {
                    console.log("Got fresh data from server");
                    updateDashboardUI(doc.data().attendanceData);
                } else {
                    console.log("No data found on server");
                }
                hideLoading();
            })
            .catch(function(error) {
                console.error("Error fetching data on page load:", error);
                hideLoading();
                showToast("Error loading attendance data. Please try again.");
            });
    } else {
        console.log("Waiting for auth state to resolve");
        // The onAuthStateChanged handler will take care of it
        setTimeout(function() {
            hideLoading();
        }, 2000);
    }
}); 