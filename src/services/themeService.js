class ThemeService {
  static THEMES = {
    light: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8f9fa',
      '--bg-tertiary': '#e9ecef',
      '--text-primary': '#212529',
      '--text-secondary': '#6c757d',
      '--text-muted': '#adb5bd',
      '--border-color': '#dee2e6',
      '--shadow': '0 2px 4px rgba(0, 0, 0, 0.1)',
    '--primary-color': '#FF6A00',
    '--primary-hover': '#e65a00',
  '--primary-2': '#cc5200',
  '--primary-rgb': '255,106,0',
    '--primary-2': '#cc5200',
      '--success-color': '#48bb78',
      '--warning-color': '#ed8936',
      '--error-color': '#f56565',
      '--card-bg': '#ffffff',
      '--input-bg': '#ffffff',
      '--button-primary': '#FF6A00',
      '--button-secondary': '#e2e8f0'
    },
    dark: {
      '--bg-primary': '#1a202c',
      '--bg-secondary': '#2d3748',
      '--bg-tertiary': '#4a5568',
      '--text-primary': '#f7fafc',
      '--text-secondary': '#e2e8f0',
      '--text-muted': '#a0aec0',
      '--border-color': '#4a5568',
      '--shadow': '0 2px 4px rgba(0, 0, 0, 0.3)',
  '--primary-color': '#FF6A00',
  '--primary-hover': '#e65a00',
  '--primary-2': '#cc5200',
  '--primary-rgb': '255,106,0',
  '--primary-2': '#cc5200',
      '--success-color': '#48bb78',
      '--warning-color': '#ed8936',
      '--error-color': '#f56565',
      '--card-bg': '#2d3748',
      '--input-bg': '#4a5568',
      '--button-primary': '#FF6A00',
      '--button-secondary': '#4a5568'
    }
  };

  // Subscription system for theme changes
  static subscribers = [];

  static subscribe(callback) {
    // Add callback to subscribers list
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  static notifySubscribers(changes) {
    // Notify all subscribers of theme changes
    this.subscribers.forEach(callback => {
      try {
        callback(changes);
      } catch (error) {
        console.error('Error in theme subscriber:', error);
      }
    });
  }

  static async initializeTheme() {
    try {
      // Get saved theme preference
      const savedTheme = localStorage.getItem('paylink_theme');

      // Get automatic theme based on time
      const autoTheme = this.getAutomaticTheme();

      // Use saved theme or automatic theme
      const theme = savedTheme || autoTheme;

      this.applyTheme(theme);

      // Set up automatic theme switching if no manual preference
      if (!savedTheme) {
        this.startAutomaticThemeSwitching();
      }

      console.log('Theme initialized:', theme);
    } catch (error) {
      console.error('Error initializing theme:', error);
    }
  }

  static getAutomaticTheme() {
    const hour = new Date().getHours();
    // Dark mode from 7 PM to 7 AM
    return hour >= 19 || hour < 7 ? 'dark' : 'light';
  }

  static applyTheme(theme) {
    const root = document.documentElement;
    const themeVars = this.THEMES[theme];

    if (themeVars) {
      Object.entries(themeVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      root.setAttribute('data-theme', theme);
      localStorage.setItem('paylink_theme', theme);

      // Update meta theme-color for mobile browsers
      this.updateMetaThemeColor(theme);

      // Notify subscribers of theme change
      this.notifySubscribers({
        theme,
        isDark: theme === 'dark',
        timestamp: Date.now()
      });
    }
  }

  static updateMetaThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a202c' : '#FF6A00');
    }
  }

  static setTheme(theme) {
    if (this.THEMES[theme]) {
      this.applyTheme(theme);
      // Stop automatic switching when manual theme is set
      this.stopAutomaticThemeSwitching();
    }
  }

  static getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  static toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  static startAutomaticThemeSwitching() {
    // Check every hour for theme changes
    this.themeInterval = setInterval(() => {
      const savedTheme = localStorage.getItem('paylink_theme');
      if (!savedTheme) {
        const autoTheme = this.getAutomaticTheme();
        const currentTheme = this.getCurrentTheme();

        if (autoTheme !== currentTheme) {
          this.applyTheme(autoTheme);
        }
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  static stopAutomaticThemeSwitching() {
    if (this.themeInterval) {
      clearInterval(this.themeInterval);
      this.themeInterval = null;
    }
  }

  static resetToAutomatic() {
    localStorage.removeItem('paylink_theme');
    this.startAutomaticThemeSwitching();
    const autoTheme = this.getAutomaticTheme();
    this.applyTheme(autoTheme);
  }

  static getThemeInfo() {
    const currentTheme = this.getCurrentTheme();
    const savedTheme = localStorage.getItem('paylink_theme');
    const autoTheme = this.getAutomaticTheme();

    return {
      current: currentTheme,
      saved: savedTheme,
      automatic: autoTheme,
      isAutomatic: !savedTheme,
      nextAutoSwitch: this.getNextAutoSwitchTime()
    };
  }

  static getNextAutoSwitchTime() {
    const now = new Date();
    const currentHour = now.getHours();

    let nextSwitchHour;
    if (currentHour >= 19) {
      // Currently dark mode, next switch to light at 7 AM tomorrow
      nextSwitchHour = 7;
    } else if (currentHour >= 7) {
      // Currently light mode, next switch to dark at 7 PM
      nextSwitchHour = 19;
    } else {
      // Currently dark mode before 7 AM, next switch to light at 7 AM
      nextSwitchHour = 7;
    }

    const nextSwitch = new Date(now);
    nextSwitch.setHours(nextSwitchHour, 0, 0, 0);

    if (nextSwitch <= now) {
      nextSwitch.setDate(nextSwitch.getDate() + 1);
    }

    return nextSwitch;
  }

  static async updateUserThemePreference(userId, theme) {
    try {
      await User.findByIdAndUpdate(userId, {
        themePreference: theme,
        updatedAt: new Date()
      });

      // Apply theme immediately
      this.setTheme(theme);

      return true;
    } catch (error) {
      console.error('Error updating user theme preference:', error);
      return false;
    }
  }

  static getThemeSettings() {
    const currentTheme = this.getCurrentTheme();
    return {
      currentTheme,
      isDark: currentTheme === 'dark',
      availableThemes: this.getAvailableThemes(),
      autoSwitching: !localStorage.getItem('paylink_theme'),
      preferences: {
        darkModeStartTime: 19, // 7 PM
        darkModeEndTime: 7,    // 7 AM
      }
    };
  }

  static async getUserThemePreference(userId) {
    try {
      // Frontend-only: Get from localStorage
      const savedTheme = localStorage.getItem(`paylink_theme_${userId}`);
      return savedTheme || null;
    } catch (error) {
      console.error('Error getting user theme preference:', error);
      return null;
    }
  }

  static applyUserTheme(userId) {
    // This would be called after user login to apply their saved preference
    this.getUserThemePreference(userId).then(preference => {
      if (preference) {
        this.setTheme(preference);
      } else {
        this.initializeTheme();
      }
    });
  }

  static getAvailableThemes() {
    return Object.keys(this.THEMES);
  }

  static getThemePreview(theme) {
    // Return a small preview object for theme selection UI
    return {
      name: theme,
      colors: {
        primary: this.THEMES[theme]['--bg-primary'],
        secondary: this.THEMES[theme]['--bg-secondary'],
        text: this.THEMES[theme]['--text-primary'],
        accent: this.THEMES[theme]['--primary-color']
      }
    };
  }

  static exportTheme(theme) {
    return this.THEMES[theme] || null;
  }

  static importTheme(themeName, themeVars) {
    // Allow importing custom themes (for future expansion)
    if (this.validateThemeVars(themeVars)) {
      this.THEMES[themeName] = themeVars;
      return true;
    }
    return false;
  }

  static validateThemeVars(themeVars) {
    const requiredVars = [
      '--bg-primary', '--text-primary', '--primary-color'
    ];

    return requiredVars.every(varName => themeVars.hasOwnProperty(varName));
  }

  static animateThemeTransition(duration = 300) {
    const root = document.documentElement;

    // Add transition class
    root.style.transition = `all ${duration}ms ease`;

    // Remove transition after animation
    setTimeout(() => {
      root.style.transition = '';
    }, duration);
  }

  static async scheduleThemeEvent(event) {
    // Frontend-only: Store in localStorage
    try {
      const events = JSON.parse(localStorage.getItem('paylink_theme_events') || '[]');
      events.push({
        name: event.name,
        theme: event.theme,
        startDate: event.startDate,
        endDate: event.endDate,
        active: true
      });
      localStorage.setItem('paylink_theme_events', JSON.stringify(events));
      return { success: true };
    } catch (error) {
      console.error('Error scheduling theme event:', error);
      throw error;
    }
  }

  static async getActiveThemeEvents() {
    try {
      const events = JSON.parse(localStorage.getItem('paylink_theme_events') || '[]');
      const now = new Date();
      return events.filter(e => 
        new Date(e.startDate) <= now && new Date(e.endDate) >= now
      );
    } catch (error) {
      console.error('Error getting active theme events:', error);
      return [];
    }
  }

  static async applyBestThemeForTime() {
    // Advanced theme switching based on various factors
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Weekend different theme logic
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      return hour >= 20 || hour < 8 ? 'dark' : 'light';
    }

    // Workday theme logic
    return hour >= 18 || hour < 7 ? 'dark' : 'light';
  }

  static getThemeAnalytics() {
    // Track theme usage for analytics
    try {
      const themeUsage = JSON.parse(localStorage.getItem('paylink_theme_usage') || '{}');
      const currentTheme = this.getCurrentTheme();

      themeUsage[currentTheme] = (themeUsage[currentTheme] || 0) + 1;
      themeUsage.lastUpdated = new Date().toISOString();

      localStorage.setItem('paylink_theme_usage', JSON.stringify(themeUsage));

      return themeUsage;
    } catch (error) {
      console.error('Error getting theme analytics:', error);
      return {};
    }
  }
}

export default ThemeService;
