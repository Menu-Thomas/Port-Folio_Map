/**
 * Portfolio State Manager
 * Handles saving and loading portfolio state (discovered flowers, visited sections, etc.)
 */

class StateManager {
  constructor() {
    this.storageKey = 'portfolio_state_v1';
    this.defaultState = {
      version: 1,
      visitedHexes: new Set(),
      discoveredSkillFlowers: new Set(), 
      discoveredLanguageFlowers: new Set(),
      unreadDrawers: new Set([
        'drawer1', 'drawer2', 'drawer3', 'drawer4', 
        'steering', 'forge', 'mail-box', 'trashTruck', 
        'convoyeur', 'sensorSensei', 'skillFlower'
      ]),
      cameraPosition: null,
      currentActiveHex: null,
      preferences: {
        enableParticles: true,
        soundEnabled: true,
        highQualityGraphics: true,
        showHelpOnStart: true
      },
      stats: {
        totalVisits: 0,
        timeSpent: 0,
        lastVisit: null,
        firstVisit: null,
        interactionsCount: 0
      },
      achievements: new Set()
    };
    
    this.state = this.loadState();
    this.updateStats();
  }

  // Convert Sets to Arrays for JSON serialization
  serializeState(state) {
    return {
      ...state,
      visitedHexes: Array.from(state.visitedHexes),
      discoveredSkillFlowers: Array.from(state.discoveredSkillFlowers),
      discoveredLanguageFlowers: Array.from(state.discoveredLanguageFlowers),
      unreadDrawers: Array.from(state.unreadDrawers),
      achievements: Array.from(state.achievements)
    };
  }

  // Convert Arrays back to Sets after JSON deserialization
  deserializeState(serialized) {
    return {
      ...serialized,
      visitedHexes: new Set(serialized.visitedHexes || []),
      discoveredSkillFlowers: new Set(serialized.discoveredSkillFlowers || []),
      discoveredLanguageFlowers: new Set(serialized.discoveredLanguageFlowers || []),
      unreadDrawers: new Set(serialized.unreadDrawers || this.defaultState.unreadDrawers),
      achievements: new Set(serialized.achievements || [])
    };
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const deserialized = this.deserializeState(parsed);
        
        // Merge with defaults for any missing properties
        return {
          ...this.defaultState,
          ...deserialized,
          preferences: {
            ...this.defaultState.preferences,
            ...deserialized.preferences
          },
          stats: {
            ...this.defaultState.stats,
            ...deserialized.stats
          }
        };
      }
    } catch (error) {
      console.warn('Failed to load state:', error);
    }
    
    return { ...this.defaultState };
  }

  saveState() {
    try {
      const serialized = this.serializeState(this.state);
      localStorage.setItem(this.storageKey, JSON.stringify(serialized));
      console.log('Portfolio state saved');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  updateStats() {
    const now = Date.now();
    
    if (!this.state.stats.firstVisit) {
      this.state.stats.firstVisit = now;
    }
    
    this.state.stats.lastVisit = now;
    this.state.stats.totalVisits++;
  }

  // State getters and setters
  markHexVisited(hexType) {
    this.state.visitedHexes.add(hexType);
    this.checkAchievements();
    this.saveState();
  }

  isHexVisited(hexType) {
    return this.state.visitedHexes.has(hexType);
  }

  discoverSkillFlower(index) {
    this.state.discoveredSkillFlowers.add(index);
    this.checkAchievements();
    this.saveState();
  }

  discoverLanguageFlower(name) {
    this.state.discoveredLanguageFlowers.add(name);
    this.checkAchievements();
    this.saveState();
  }

  markDrawerAsRead(drawerName) {
    this.state.unreadDrawers.delete(drawerName);
    this.state.stats.interactionsCount++;
    this.checkAchievements();
    this.saveState();
  }

  getUnreadDrawers() {
    return this.state.unreadDrawers;
  }

  saveCameraPosition(position, lookAt, activeHex) {
    this.state.cameraPosition = {
      position: { ...position },
      lookAt: { ...lookAt },
      timestamp: Date.now()
    };
    this.state.currentActiveHex = activeHex;
    this.saveState();
  }

  getSavedCameraPosition() {
    const saved = this.state.cameraPosition;
    if (saved && Date.now() - saved.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
      return saved;
    }
    return null;
  }

  // Preferences
  updatePreference(key, value) {
    this.state.preferences[key] = value;
    this.saveState();
  }

  getPreference(key) {
    return this.state.preferences[key];
  }

  // Achievements system
  checkAchievements() {
    const achievements = [];

    // Explorer achievement
    if (this.state.visitedHexes.size >= 5 && !this.state.achievements.has('explorer')) {
      achievements.push('explorer');
      this.state.achievements.add('explorer');
    }

    // Discoverer achievement  
    if (this.state.discoveredSkillFlowers.size >= 9 && !this.state.achievements.has('discoverer')) {
      achievements.push('discoverer');
      this.state.achievements.add('discoverer');
    }

    // Tech enthusiast achievement
    if (this.state.discoveredLanguageFlowers.size >= 5 && !this.state.achievements.has('tech_enthusiast')) {
      achievements.push('tech_enthusiast');
      this.state.achievements.add('tech_enthusiast');
    }

    // Completionist achievement
    if (this.state.unreadDrawers.size === 0 && !this.state.achievements.has('completionist')) {
      achievements.push('completionist');
      this.state.achievements.add('completionist');
    }

    // Regular visitor achievement
    if (this.state.stats.totalVisits >= 10 && !this.state.achievements.has('regular_visitor')) {
      achievements.push('regular_visitor');
      this.state.achievements.add('regular_visitor');
    }

    // Show new achievements
    achievements.forEach(achievement => this.showAchievement(achievement));

    return achievements;
  }

  showAchievement(achievementKey) {
    const achievements = {
      explorer: { name: 'Explorateur', description: 'Visitez 5 zones différentes', icon: '🗺️' },
      discoverer: { name: 'Découvreur', description: 'Découvrez toutes les compétences', icon: '🔍' },
      tech_enthusiast: { name: 'Passionné Tech', description: 'Explorez 5 technologies', icon: '💻' },
      completionist: { name: 'Perfectionniste', description: 'Lisez tous les contenus', icon: '✨' },
      regular_visitor: { name: 'Visiteur Régulier', description: 'Visitez le portfolio 10 fois', icon: '🏆' }
    };

    const achievement = achievements[achievementKey];
    if (!achievement) return;

    // Create achievement notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10001;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 16px 20px; border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: translateX(100%); transition: transform 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">${achievement.icon}</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Achievement Débloqué!</div>
          <div style="font-weight: 500; color: #f0f0f0;">${achievement.name}</div>
          <div style="font-size: 12px; opacity: 0.8;">${achievement.description}</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Animate out after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 4000);

    // Track achievement
    if (window.analytics) {
      window.analytics.track('achievement_unlocked', {
        achievement: achievementKey,
        name: achievement.name
      });
    }
  }

  // Reset functions
  resetState() {
    this.state = { ...this.defaultState };
    this.saveState();
  }

  resetProgress() {
    this.state.visitedHexes.clear();
    this.state.discoveredSkillFlowers.clear();
    this.state.discoveredLanguageFlowers.clear();
    this.state.unreadDrawers = new Set(this.defaultState.unreadDrawers);
    this.state.achievements.clear();
    this.saveState();
  }

  // Export state
  exportState() {
    return JSON.stringify(this.serializeState(this.state), null, 2);
  }

  // Import state
  importState(stateJson) {
    try {
      const parsed = JSON.parse(stateJson);
      this.state = this.deserializeState(parsed);
      this.saveState();
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  // Get stats for display
  getStats() {
    const timeSince = this.state.stats.firstVisit 
      ? Date.now() - this.state.stats.firstVisit 
      : 0;
    
    return {
      ...this.state.stats,
      hexesVisited: this.state.visitedHexes.size,
      skillFlowersDiscovered: this.state.discoveredSkillFlowers.size,
      languageFlowersDiscovered: this.state.discoveredLanguageFlowers.size,
      itemsRead: this.defaultState.unreadDrawers.size - this.state.unreadDrawers.size,
      achievementsUnlocked: this.state.achievements.size,
      daysSinceFirstVisit: Math.floor(timeSince / (1000 * 60 * 60 * 24))
    };
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
} else {
  window.StateManager = StateManager;
}
