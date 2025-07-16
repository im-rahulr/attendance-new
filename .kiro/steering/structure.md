# Project Structure & Organization

## Directory Layout

```
attendance-app/
├── src/                    # Source code directory
│   ├── api/               # API endpoints and authentication
│   │   ├── auth.js        # Firebase authentication logic
│   │   ├── email-server.js # Email service backend
│   │   └── get_users.php  # PHP API endpoint
│   ├── components/        # Reusable UI components and scripts
│   │   ├── admin.js       # Admin panel functionality
│   │   ├── dashboard-ui.js # Dashboard UI components
│   │   ├── notifications.js # Notification handling
│   │   ├── theme.js       # Theme management
│   │   └── email-*.js     # Email system components
│   ├── pages/             # HTML pages
│   │   ├── index.html     # Entry point (redirects to login)
│   │   ├── login.html     # Authentication page
│   │   ├── dashboard.html # Main dashboard
│   │   ├── admin.html     # Administrative panel
│   │   └── *.html         # Other application pages
│   ├── styles/            # CSS stylesheets
│   │   ├── style.css      # Main stylesheet with theme support
│   │   └── login.css      # Login-specific styles
│   ├── utils/             # Utility functions
│   │   ├── script.js      # Core functionality
│   │   ├── validation.js  # Form validation utilities
│   │   └── logger.js      # Logging utilities
│   └── tests/             # Test files and test pages
├── docs/                  # Project documentation
├── database/              # Database schemas and migrations
├── public/                # Static files served directly
├── scripts/               # Build and deployment scripts
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
└── package.json           # Project dependencies and scripts
```

## File Organization Patterns

### HTML Pages (`src/pages/`)
- Entry point: `index.html` (redirects to login)
- Authentication: `login.html`
- Main app: `dashboard.html`, `profile.html`, `report.html`
- Admin: `admin.html`, `admin-test.html`
- Utility: `contact.html`, `documentation.html`

### JavaScript Components (`src/components/`)
- **Admin**: `admin.js`, `admin-script.js`, `admin-auth.js`
- **UI**: `dashboard-ui.js`, `notifications-ui.js`
- **Services**: `email-*.js`, `theme.js`, `notifications.js`
- **Integration**: `mcp-integration.js`

### Utilities (`src/utils/`)
- **Core**: `script.js` (main application logic)
- **Validation**: `validation.js` (form validation, data integrity)
- **Logging**: `logger.js` (error tracking, user activity)

### API Layer (`src/api/`)
- **Authentication**: `auth.js` (Firebase auth, user management)
- **Email**: `email-server.js`, `send-email.php`
- **Data**: `get_users.php` (user data endpoints)

## Naming Conventions

### Files
- HTML pages: `kebab-case.html` (e.g., `admin-test.html`)
- JavaScript: `kebab-case.js` (e.g., `dashboard-ui.js`)
- CSS: `kebab-case.css` (e.g., `login.css`)

### Functions & Variables
- Functions: `camelCase` (e.g., `updateAttendance()`)
- Variables: `camelCase` (e.g., `currentUser`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `FIREBASE_CONFIG`)
- Firebase references: `camelCase` with descriptive names (e.g., `firebaseAuth`, `firebaseDb`)

### CSS Classes
- Component classes: `kebab-case` (e.g., `.profile-icon`)
- Utility classes: `kebab-case` (e.g., `.text-muted`)
- Theme variables: `--kebab-case` (e.g., `--bg-primary`)

## Import/Reference Patterns

### Relative Paths
- Use relative paths for local resources
- Pages reference components: `../components/file.js`
- Components reference utils: `../utils/file.js`

### Firebase Integration
- Initialize Firebase in `auth.js`
- Export Firebase instances: `auth`, `db`, `storage`
- Use consistent Firebase variable names across files

### Theme System
- CSS custom properties in `:root` and `[data-theme="dark"]`
- Theme switching via `theme.js` component
- Consistent theme variable usage across all stylesheets

## Testing Structure (`src/tests/`)
- **System Tests**: `system-tests.html`, `run-tests.js`
- **Feature Tests**: `*-test.html` for specific features
- **Debug Pages**: `*-debug.html` for troubleshooting
- **CLI Tests**: `test-*.js` for automated testing