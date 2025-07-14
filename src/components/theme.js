/**
 * Theme Management System
 * Handles dark/light theme switching with localStorage persistence
 * Dark theme is set as default
 */

class ThemeManager {
    constructor() {
        this.THEME_KEY = 'attendance-app-theme';
        this.DARK_THEME = 'dark';
        this.LIGHT_THEME = 'light';
        this.DEFAULT_THEME = this.DARK_THEME; // Dark theme as default
        
        this.init();
    }
    
    /**
     * Initialize theme system
     */
    init() {
        // Get saved theme or use default (dark)
        const savedTheme = this.getSavedTheme();
        const theme = savedTheme || this.DEFAULT_THEME;
        
        // Apply theme immediately to prevent flash
        this.applyTheme(theme);
        
        // Set up theme toggle listeners when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupThemeToggle());
        } else {
            this.setupThemeToggle();
        }
    }
    
    /**
     * Get saved theme from localStorage
     */
    getSavedTheme() {
        try {
            return localStorage.getItem(this.THEME_KEY);
        } catch (error) {
            console.warn('Could not access localStorage for theme:', error);
            return null;
        }
    }
    
    /**
     * Save theme to localStorage
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.THEME_KEY, theme);
        } catch (error) {
            console.warn('Could not save theme to localStorage:', error);
        }
    }
    
    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === this.DARK_THEME) {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.removeAttribute('data-theme');
        }
        
        // Update theme toggle if it exists
        this.updateThemeToggle(theme);
        
        // Dispatch theme change event
        this.dispatchThemeChangeEvent(theme);
    }
    
    /**
     * Toggle between themes
     */
    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === this.DARK_THEME ? this.LIGHT_THEME : this.DARK_THEME;
        
        this.setTheme(newTheme);
    }
    
    /**
     * Set specific theme
     */
    setTheme(theme) {
        if (theme !== this.DARK_THEME && theme !== this.LIGHT_THEME) {
            console.warn('Invalid theme:', theme);
            return;
        }
        
        this.applyTheme(theme);
        this.saveTheme(theme);
    }
    
    /**
     * Get current theme
     */
    getCurrentTheme() {
        return document.documentElement.hasAttribute('data-theme') ? this.DARK_THEME : this.LIGHT_THEME;
    }
    
    /**
     * Check if dark theme is active
     */
    isDarkTheme() {
        return this.getCurrentTheme() === this.DARK_THEME;
    }
    
    /**
     * Setup theme toggle functionality
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            
            // Update initial state
            this.updateThemeToggle(this.getCurrentTheme());
        }
    }
    
    /**
     * Update theme toggle UI
     */
    updateThemeToggle(theme) {
        const themeToggle = document.getElementById('themeToggle');
        const themeLabel = document.getElementById('themeLabel');
        
        if (themeToggle) {
            if (theme === this.DARK_THEME) {
                themeToggle.classList.add('active');
            } else {
                themeToggle.classList.remove('active');
            }
        }
        
        if (themeLabel) {
            themeLabel.textContent = theme === this.DARK_THEME ? 'Dark Theme' : 'Light Theme';
        }
    }
    
    /**
     * Dispatch theme change event for other components to listen to
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themeChanged', {
            detail: { theme, isDark: theme === this.DARK_THEME }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get theme preference for system theme detection (future enhancement)
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.DARK_THEME;
        }
        return this.LIGHT_THEME;
    }
    
    /**
     * Listen for system theme changes (future enhancement)
     */
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!this.getSavedTheme()) {
                    const systemTheme = e.matches ? this.DARK_THEME : this.LIGHT_THEME;
                    this.applyTheme(systemTheme);
                }
            });
        }
    }
}

// Initialize theme manager immediately
const themeManager = new ThemeManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
} else if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
    window.themeManager = themeManager;
}
