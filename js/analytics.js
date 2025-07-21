/**
 * Simple Analytics Tracker
 * Privacy-focused analytics for portfolio interactions
 */

class AnalyticsTracker {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];
    this.maxEvents = 100; // Limit stored events
    
    this.init();
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  init() {
    // Track page load
    this.track('page_load', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timestamp: Date.now()
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.track('visibility_change', {
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.track('error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now()
      });
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - this.startTime;
      this.track('session_end', {
        duration: sessionDuration,
        events_count: this.events.length,
        timestamp: Date.now()
      });
      
      // Send final batch if needed
      this.sendBatch();
    });
  }

  track(eventName, data = {}) {
    const event = {
      name: eventName,
      session_id: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      ...data
    };

    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log in development
    if (!this.isProduction()) {
      console.log('📊 Analytics:', eventName, data);
    }

    // Send critical events immediately
    if (this.isCriticalEvent(eventName)) {
      this.sendEvent(event);
    }
  }

  isCriticalEvent(eventName) {
    return ['error', 'critical_error', 'asset_load_failure'].includes(eventName);
  }

  isProduction() {
    return !window.location.hostname.includes('localhost') && 
           !window.location.hostname.includes('127.0.0.1');
  }

  // Portfolio-specific tracking methods
  trackInteraction(type, target, data = {}) {
    this.track('interaction', {
      interaction_type: type,
      target: target,
      ...data
    });
  }

  trackHexVisit(hexType, duration = null) {
    this.track('hex_visit', {
      hex_type: hexType,
      duration: duration
    });
  }

  trackModalOpen(modalType) {
    this.track('modal_open', {
      modal_type: modalType
    });
  }

  trackModalClose(modalType, duration) {
    this.track('modal_close', {
      modal_type: modalType,
      duration: duration
    });
  }

  trackAssetLoadTime(assetType, filename, loadTime) {
    this.track('asset_load', {
      asset_type: assetType,
      filename: filename,
      load_time: loadTime
    });
  }

  trackPerformance(fps, loadTime) {
    this.track('performance', {
      fps: fps,
      load_time: loadTime,
      memory_used: performance.memory ? performance.memory.usedJSHeapSize : null
    });
  }

  // Send event to server (placeholder - implement based on your backend)
  async sendEvent(event) {
    if (!this.isProduction()) return; // Don't send in development

    try {
      // Example: send to your analytics endpoint
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
      
      console.log('Would send event:', event);
    } catch (error) {
      console.warn('Analytics send failed:', error);
    }
  }

  // Send batch of events
  async sendBatch() {
    if (this.events.length === 0 || !this.isProduction()) return;

    try {
      // Example: send batch to your analytics endpoint
      // await fetch('/api/analytics/batch', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: this.events })
      // });
      
      console.log('Would send batch:', this.events.length, 'events');
      this.events = []; // Clear sent events
    } catch (error) {
      console.warn('Analytics batch send failed:', error);
    }
  }

  // Get session summary
  getSessionSummary() {
    const duration = Date.now() - this.startTime;
    const interactionEvents = this.events.filter(e => e.name === 'interaction');
    
    return {
      session_id: this.sessionId,
      duration: duration,
      total_events: this.events.length,
      interactions: interactionEvents.length,
      hex_visits: this.events.filter(e => e.name === 'hex_visit').length,
      modal_opens: this.events.filter(e => e.name === 'modal_open').length,
      errors: this.events.filter(e => e.name === 'error').length
    };
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsTracker;
} else {
  window.AnalyticsTracker = AnalyticsTracker;
}
