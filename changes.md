# Project Changes Log

## Change History

### 2024-07-26 10:45
- **Type**: REFACTOR
- **Files**: changes.html
- **Description**: Updated the changes log UI with a cleaner design by removing boxes and cards, adding home/close buttons, developer attribution for each change, and a new "Features Coming Soon" section
- **Impact**: Improves readability and navigation of the changes log page
- **Breaking**: No
- **Dependencies**: None
- **Manual Steps**: None

### 2024-07-25 15:00
- **Type**: REFACTOR
- **Files**: dashboard.html, report.html, profile.html, admin.html
- **Description**: Replaced default Bootstrap spinner with book-style loader across 4 files for better UX
- **Impact**: The loading indicator shown during data fetching operations is now the book-style animation on the dashboard, report, profile, and admin pages
- **Breaking**: No
- **Dependencies**: None - Pure CSS implementation
- **Manual Steps**: None required - Changes are automatically applied

### 2024-07-25 14:45
- **Type**: FEATURE
- **Files**: login.html
- **Description**: Added book-style loading animation and lazy image loading to improve login experience
- **Impact**: Login page now displays an elegant animation while loading and images load only when they are about to be displayed
- **Breaking**: No
- **Dependencies**: Uses native IntersectionObserver API
- **Manual Steps**: For new images, use `data-src` attribute instead of `src` to enable lazy loading 