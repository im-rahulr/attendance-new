// This file contains the UI-specific logic for notifications.html

// Variables to store Firebase references
let auth;
let db;
let currentUser = null;

// Show loading overlay
function showLoading() {
    document.querySelector('.loading-overlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.querySelector('.loading-overlay').style.display = 'none';
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Load user notifications
function loadNotifications() {
    console.log("Loading notifications...");
    
    // Safety check for Firebase
    if (!firebase.apps.length) {
        console.error("Firebase not initialized!");
        alert("Error: Firebase not initialized. Please refresh the page.");
        return;
    }
    
    // Make sure we have db defined
    if (!db) {
        db = firebase.firestore();
    }
    
    if (!db) {
        console.error("Firestore database not initialized!");
        alert("Error: Database connection failed. Please refresh the page.");
        return;
    }
    
    showLoading();
    const container = document.getElementById('notificationsContainer');
    
    if (!container) {
        console.error("Notification container not found");
        hideLoading();
        return;
    }
    
    console.log("Fetching notifications from Firestore...");
    
    // Check if we have a current user, if not try to get it
    if (!currentUser && firebase.auth().currentUser) {
        currentUser = firebase.auth().currentUser;
    }
    
    // Even if we don't have a current user (due to OAuth domain issues in development),
    // still try to fetch notifications - the security rules will handle permissions
    
    // Reference to notifications collection - show all notifications for all users
    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .get()
        .then(snapshot => {
            console.log("Notifications retrieved:", snapshot.size);
            hideLoading();
            
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="notification-empty">
                        <i class="bi bi-bell-slash"></i>
                        <p>No notifications yet</p>
                    </div>
                `;
                return;
            }
            
            // Clear container
            container.innerHTML = '';
            
            // Add notifications to container
            snapshot.forEach(doc => {
                const notif = doc.data();
                console.log("Processing notification:", doc.id, notif);
                
                // Create notification element
                const notifEl = document.createElement('div');
                notifEl.className = `notification-item ${notif.read ? '' : 'unread'}`;
                notifEl.id = `notification-${doc.id}`;
                
                // Format sent by with verification badge if admin
                let senderInfo = '';
                if (notif.isAdmin) {
                    senderInfo = `<span class="notification-badge"><i class="bi bi-check-circle-fill"></i> Admin</span>`;
                }
                
                // Format timestamp
                let timeDisplay = 'Unknown time';
                try {
                    if (notif.timestamp) {
                        timeDisplay = formatDate(notif.timestamp);
                    }
                } catch (e) {
                    console.error("Error formatting timestamp:", e);
                }
                
                // Title display
                let titleDisplay = '';
                if (notif.title) {
                    titleDisplay = `<h5 class="notification-title">${notif.title}</h5>`;
                }
                
                notifEl.innerHTML = `
                    <div class="notification-header">
                        <div>
                            ${titleDisplay}
                            <small>From: ${notif.sentBy || 'System'} ${senderInfo}</small>
                        </div>
                        <div class="notification-time">${timeDisplay}</div>
                    </div>
                    <div class="notification-content">${notif.message || ''}</div>
                `;
                
                // Mark as read when clicked
                notifEl.addEventListener('click', () => {
                    if (!notif.read) {
                        markNotificationAsRead(doc.id);
                        notifEl.classList.remove('unread');
                    }
                });
                
                container.appendChild(notifEl);
            });
            
            // Update notification count in badge
            updateNotificationBadge();
        })
        .catch(error => {
            console.error("Error loading notifications:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            hideLoading();

            let errorMessage = `Could not load notifications.`;
            let errorDetails = `There was a problem fetching data from the server. Please try again later. (${error.message})`;

            switch (error.code) {
                case 'permission-denied':
                    errorMessage = "Permission Denied";
                    errorDetails = "Your security settings are preventing notifications from being loaded. The administrator needs to update the Firebase Security Rules to allow access.";
                    break;
                case 'unauthenticated':
                    errorMessage = "Not Logged In";
                    errorDetails = "You must be logged in to see notifications. Redirecting to login page...";
                    setTimeout(() => window.location.href = 'login.html', 2000);
                    break;
                case 'unavailable':
                    errorMessage = "Network Error";
                    errorDetails = "Could not connect to the notifications service. Please check your internet connection and try again.";
                    break;
            }

            container.innerHTML = `
                <div class="notification-empty text-center text-danger p-4">
                    <i class="bi bi-exclamation-triangle-fill" style="font-size: 48px;"></i>
                    <h5 class="mt-3">${errorMessage}</h5>
                    <p class="text-muted">${errorDetails}</p>
                    <button class="btn btn-primary mt-2" onclick="loadNotifications()">
                        <i class="bi bi-arrow-clockwise me-2"></i> Try Again
                    </button>
                </div>
            `;
        });
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    if (!notificationId) {
        console.error("No notification ID provided");
        return;
    }
    
    // Get a fresh reference to the database
    if (!db) {
        db = firebase.firestore();
    }
    
    if (!db) {
        console.error("Firestore not initialized");
        return;
    }
    
    console.log("Marking notification as read:", notificationId);
    
    db.collection('notifications').doc(notificationId).update({
        read: true
    }).then(() => {
        console.log("Successfully marked notification as read");
        // Update the badge count
        updateNotificationBadge();
    }).catch(error => {
        console.error("Error marking notification as read:", error);
        // Try again with no authentication requirement
        try {
            db.collection('notifications').doc(notificationId).update({
                read: true
            });
        } catch (e) {
            console.error("Second attempt failed:", e);
        }
    });
}

// Update notification badge count
function updateNotificationBadge() {
    if (!currentUser) return;
    
    if (!db) {
        db = firebase.firestore();
    }
    
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    // Count unread notifications
    db.collection('notifications')
        .where('read', '==', false)
        .get()
        .then(snapshot => {
            const count = snapshot.size;
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'inline-block';
                badge.className = 'notification-badge';
            } else {
                badge.style.display = 'none';
            }
        })
        .catch(error => {
            console.error("Error counting notifications:", error);
            badge.style.display = 'none';
        });
}

// Wait for DOM to be fully loaded before initializing Firebase
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded - Setting up auth listener");
    
    // Initialize Firebase references
    try {
        // Ensure Firebase is initialized
        if (firebase && firebase.apps.length > 0) {
            auth = firebase.auth();
            db = firebase.firestore();
            
            console.log("Firebase auth available:", !!auth);
            console.log("Firebase firestore available:", !!db);
            
            // Show loading while we check auth
            showLoading();
            
            auth.onAuthStateChanged(user => {
                if (user) {
                    currentUser = user;
                    console.log("User authenticated:", user.email);
                    
                    // Update user initials in profile icon
                    const profileIcon = document.getElementById('profileIcon');
                    if (profileIcon && user.displayName) {
                        const names = user.displayName.split(' ');
                        const initials = names.map(name => name.charAt(0).toUpperCase()).join('');
                        profileIcon.textContent = initials.substring(0, 2);
                    } else if (profileIcon && user.email) {
                        profileIcon.textContent = user.email.substring(0, 2).toUpperCase();
                    }
                    
                    // Load notifications
                    loadNotifications();
                } else {
                    console.log("User not authenticated, redirecting to login");
                    hideLoading();
                    // Redirect to login if not logged in
                    window.location.href = 'login.html';
                }
            }, error => {
                console.error("Auth state change error:", error);
                hideLoading();
                alert("Authentication error: " + error.message);
            });
        } else {
            console.error("Firebase not initialized!");
            // Wait a bit and try again
            setTimeout(() => {
                if (firebase && firebase.apps.length > 0) {
                    auth = firebase.auth();
                    db = firebase.firestore();
                    console.log("Firebase initialized after delay");
                    
                    // Force load notifications
                    loadNotifications();
                } else {
                    console.error("Firebase still not initialized after delay");
                    alert("Firebase initialization failed. Please refresh the page.");
                }
            }, 1500);
        }
    } catch (e) {
        console.error("Error during Firebase initialization:", e);
    }
    
    // Add event listener for profile icon to navigate to profile page
    const profileIcon = document.getElementById('profileIcon');
    if (profileIcon) {
        profileIcon.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    
    // Add a reload button in case it's needed
    document.querySelector('.notifications-header').innerHTML += `
        <button id="refreshNotificationsBtn" class="btn btn-sm btn-outline-primary" onclick="loadNotifications()">
            <i class="bi bi-arrow-clockwise me-2"></i>Refresh
        </button>
    `;
    
    // Force load notifications after a short delay
    // This ensures notifications are loaded even if there are auth issues
    setTimeout(() => {
        console.log("Force loading notifications after timeout");
        loadNotifications();
    }, 2000);
}); 