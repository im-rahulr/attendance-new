// This file contains the UI-specific logic for notifications.html

// Variables to store Firebase references
let auth;
let db;
let currentUser = null;
let currentFilter = 'all'; // 'all' or 'unread'

// Show loading overlay
function showLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
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

// Render notifications based on the current filter
function renderNotifications(notifications) {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    const filteredNotifications = notifications.filter(n => {
        if (currentFilter === 'unread') {
            return !n.read;
        }
        return true;
    });

    if (filteredNotifications.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No ${currentFilter === 'unread' ? 'unread' : ''} notifications</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    filteredNotifications.forEach(notif => {
        const notifEl = document.createElement('div');
        notifEl.className = `notification-item ${notif.read ? '' : 'unread'}`;
        notifEl.dataset.id = notif.id;
        
        const senderInfo = notif.isAdmin ? `<span class="admin-badge"><i class="fas fa-shield-alt"></i> Admin</span>` : '';
        const timeDisplay = formatDate(notif.timestamp);
        const titleDisplay = notif.title ? `<h5 class="notification-title">${notif.title}</h5>` : '';
        const authorDisplay = notif.authorName || notif.senderName || notif.sentBy || 'System';

        notifEl.innerHTML = `
            <div class="notification-icon"><i class="fas fa-bell"></i></div>
            <div class="notification-body">
                <div class="notification-header">
                    ${titleDisplay}
                    <span class="notification-time">${timeDisplay}</span>
                </div>
                <div class="notification-content">${notif.message || ''}</div>
                <div class="notification-footer">
                    <small>From: ${authorDisplay} ${senderInfo}</small>
                </div>
            </div>
            <div class="notification-actions">
                ${!notif.read ? '<button class="btn-read" title="Mark as read"><i class="fas fa-check"></i></button>' : ''}
                <button class="btn-delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        container.appendChild(notifEl);
    });
}

function updateFilterCounts(total, unread) {
    const allCount = document.getElementById('allCount');
    const unreadCount = document.getElementById('unreadCount');
    if (allCount) allCount.textContent = total;
    if (unreadCount) unreadCount.textContent = unread;
}

// Setup event listeners for notification actions
function setupActionListeners() {
    const container = document.getElementById('notificationsContainer');
    container.addEventListener('click', e => {
        const target = e.target;
        const notifItem = target.closest('.notification-item');
        if (!notifItem) return;

        const notificationId = notifItem.dataset.id;

        if (target.closest('.btn-read')) {
            window.notificationManager.markAsRead(notificationId).catch(err => console.error("Failed to mark as read", err));
        } else if (target.closest('.btn-delete')) {
            window.notificationManager.deleteNotification(notificationId).catch(err => console.error("Failed to delete", err));
        } else if (!notifItem.classList.contains('read')) {
            window.notificationManager.markAsRead(notificationId).catch(err => console.error("Failed to mark as read on click", err));
        }
    });
}

// Wait for DOM to be fully loaded before initializing Firebase
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM content loaded - Setting up auth listener for notifications UI");
    
    try {
        if (firebase && firebase.apps.length > 0) {
            auth = firebase.auth();
            db = firebase.firestore();
            
            showLoading();
            
            auth.onAuthStateChanged(user => {
                if (user) {
                    currentUser = user;
                    console.log("User authenticated, setting up notifications UI for:", user.email);

                    // The global notificationManager is already initialized.
                    // We just need to listen for its updates.
                    window.notificationManager.addListener((notifications, unreadCount) => {
                        renderNotifications(notifications);
                        updateFilterCounts(notifications.length, unreadCount);
                    });

                    // Perform an initial render with the data the manager already has.
                    const initialNotifications = window.notificationManager.getNotifications();
                    const initialUnreadCount = window.notificationManager.getUnreadCount();
                    renderNotifications(initialNotifications);
                    updateFilterCounts(initialNotifications.length, initialUnreadCount);

                    // Setup filters and actions
                    const allFilter = document.getElementById('allFilter');
                    const unreadFilter = document.getElementById('unreadFilter');

                    if (allFilter) {
                        allFilter.addEventListener('click', () => {
                            currentFilter = 'all';
                            allFilter.classList.add('active');
                            unreadFilter.classList.remove('active');
                            renderNotifications(window.notificationManager.getNotifications());
                        });
                    }

                    if (unreadFilter) {
                        unreadFilter.addEventListener('click', () => {
                            currentFilter = 'unread';
                            unreadFilter.classList.add('active');
                            allFilter.classList.remove('active');
                            renderNotifications(window.notificationManager.getNotifications());
                        });
                    }
                    
                    const markAllReadBtn = document.getElementById('markAllReadBtn');
                    if(markAllReadBtn) {
                        markAllReadBtn.addEventListener('click', () => {
                            window.notificationManager.markAllAsRead().catch(err => console.error("Failed to mark all as read", err));
                        });
                    }

                    setupActionListeners();
                    hideLoading();

                } else {
                    console.log("User not authenticated, redirecting to login");
                    hideLoading();
                    window.location.href = 'login.html';
                }
            });
        } else {
            console.error("Firebase not initialized on notifications page.");
            hideLoading();
        }
    } catch (error) {
        console.error("Error initializing notifications UI:", error);
        hideLoading();
    }
}); 