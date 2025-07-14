// Notification utility functions
class NotificationManager {
    constructor() {
        this.currentUser = null;
        this.unreadCount = 0;
        this.notifications = [];
        this.listeners = [];
    }

    // Initialize notification manager
    init(user) {
        this.currentUser = user;
        if (user) {
            console.log("Initializing notification manager for user:", user.uid);
            // Add a small delay to ensure Firestore is ready
            setTimeout(() => {
                this.setupRealtimeListener();
                this.updateNotificationBadges();
            }, 1000);
        }
    }

    // Setup real-time listener for notifications
    setupRealtimeListener() {
        if (!this.currentUser) {
            console.log("No current user for notification listener");
            return;
        }

        console.log("Setting up notification listener for user:", this.currentUser.uid);

        const unsubscribe = firebase.firestore()
            .collection('notifications')
            .where('recipientId', '==', this.currentUser.uid)
            .onSnapshot(snapshot => {
                console.log("Notification snapshot received, size:", snapshot.size);
                this.notifications = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log("Notification data:", data);
                    this.notifications.push({
                        id: doc.id,
                        ...data
                    });
                });

                // Sort notifications by timestamp (newest first)
                this.notifications.sort((a, b) => {
                    const aTime = a.timestamp ? a.timestamp.toDate() : new Date(0);
                    const bTime = b.timestamp ? b.timestamp.toDate() : new Date(0);
                    return bTime - aTime;
                });

                console.log("Total notifications loaded:", this.notifications.length);
                this.unreadCount = this.notifications.filter(n => !n.read).length;
                console.log("Unread count:", this.unreadCount);

                this.updateNotificationBadges();

                // Notify listeners
                this.listeners.forEach(listener => {
                    if (typeof listener === 'function') {
                        listener(this.notifications, this.unreadCount);
                    }
                });
            }, error => {
                console.error("Error in notification listener:", error);
            });

        this.listeners.push(unsubscribe);
    }

    // Update notification badges across the app
    updateNotificationBadges() {
        const badges = document.querySelectorAll('#navNotificationBadge, .notification-badge');
        badges.forEach(badge => {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
                badge.style.display = 'inline-block';
                badge.style.visibility = 'visible';
            } else {
                badge.textContent = '';
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
            }
        });

        // Update filter counts if on notifications page
        const allCountElement = document.getElementById('allCount');
        const unreadCountElement = document.getElementById('unreadCount');

        if (allCountElement) {
            allCountElement.textContent = this.notifications.length || 0;
        }

        if (unreadCountElement) {
            unreadCountElement.textContent = this.unreadCount || 0;
        }

        console.log(`Updated notification badges: ${this.unreadCount} unread, ${this.notifications.length} total`);
    }

    // Add listener for notification updates
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    // Get unread count
    getUnreadCount() {
        return this.unreadCount;
    }

    // Get all notifications
    getNotifications() {
        return this.notifications;
    }

    // Mark notification as read
    markAsRead(notificationId) {
        return firebase.firestore()
            .collection('notifications')
            .doc(notificationId)
            .update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    }

    // Delete notification
    deleteNotification(notificationId) {
        return firebase.firestore()
            .collection('notifications')
            .doc(notificationId)
            .delete();
    }

    // Mark all notifications as read
    markAllAsRead() {
        const batch = firebase.firestore().batch();
        
        this.notifications
            .filter(n => !n.read)
            .forEach(notification => {
                const notificationRef = firebase.firestore()
                    .collection('notifications')
                    .doc(notification.id);
                batch.update(notificationRef, {
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

        return batch.commit();
    }

    // Clean up listeners
    cleanup() {
        this.listeners.forEach(listener => {
            if (typeof listener === 'function' && listener.name === 'unsubscribe') {
                listener();
            }
        });
        this.listeners = [];
    }
}

// Create global notification manager instance
window.notificationManager = new NotificationManager();

// Auto-initialize when Firebase auth state changes
function initializeNotificationManager() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        console.log("Initializing notification manager");
        firebase.auth().onAuthStateChanged(function(user) {
            console.log("Auth state changed in notification manager:", user ? user.uid : 'no user');
            if (user) {
                window.notificationManager.init(user);
            } else {
                window.notificationManager.cleanup();
            }
        });
    } else {
        console.log("Firebase not ready, retrying in 1 second");
        setTimeout(initializeNotificationManager, 1000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeNotificationManager();
});

// Utility function to show notification toast (if available)
function showNotificationToast(title, message, type = 'info') {
    // Check if we're on a page with toast functionality
    if (typeof showToast === 'function') {
        showToast(`${title}: ${message}`, type);
        return;
    }

    // Fallback to browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico' // Adjust path as needed
        });
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

// Auto-request notification permission when script loads
document.addEventListener('DOMContentLoaded', function() {
    requestNotificationPermission();
});
