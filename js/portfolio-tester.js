/**
 * Portfolio Functional Tester
 * Automated testing of portfolio interactions and functionality
 */

class PortfolioTester {
  constructor() {
    this.results = [];
    this.errors = [];
    this.warnings = [];
    this.isRunning = false;
  }

  async runAllTests() {
    if (this.isRunning) {
      console.warn('Tests are already running');
      return;
    }

    this.isRunning = true;
    this.results = [];
    this.errors = [];
    this.warnings = [];

    console.log('🧪 Starting Portfolio Tests...');
    this.showTestingUI();

    try {
      await this.testEnvironment();
      await this.testAssetLoading();
      await this.testThreeJSScene();
      await this.testInteractions();
      await this.testModals();
      await this.testNavigation();
      await this.testMobile();
      await this.testPerformance();
      await this.testAccessibility();

      this.generateReport();
    } catch (error) {
      console.error('Test suite failed:', error);
      this.errors.push('Test suite crashed: ' + error.message);
    } finally {
      this.isRunning = false;
      this.hideTestingUI();
    }
  }

  // Test environment setup
  async testEnvironment() {
    console.log('Testing environment...');
    
    this.test('WebGL Support', () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    });

    this.test('Three.js Loaded', () => {
      return typeof THREE !== 'undefined';
    });

    this.test('GSAP Loaded', () => {
      return typeof gsap !== 'undefined';
    });

    this.test('Required DOM Elements', () => {
      const required = ['body', 'canvas'];
      return required.every(el => document.querySelector(el));
    });

    this.test('Local Storage Available', () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    });
  }

  // Test asset loading
  async testAssetLoading() {
    console.log('Testing asset loading...');

    const testAssets = [
      './public/models/Hex.glb',
      './public/models/skillFlower.glb',
      './public/textures/env.jpg'
    ];

    for (const asset of testAssets) {
      await this.testAsync(`Asset: ${asset}`, async () => {
        const response = await fetch(asset, { method: 'HEAD' });
        return response.ok;
      });
    }
  }

  // Test Three.js scene
  async testThreeJSScene() {
    console.log('Testing Three.js scene...');

    this.test('Scene Created', () => {
      return window.scene && scene instanceof THREE.Scene;
    });

    this.test('Camera Created', () => {
      return window.camera && camera instanceof THREE.PerspectiveCamera;
    });

    this.test('Renderer Created', () => {
      return window.renderer && renderer instanceof THREE.WebGLRenderer;
    });

    this.test('Scene Has Objects', () => {
      return window.scene && scene.children.length > 0;
    });

    this.test('Lighting Setup', () => {
      const lights = scene.children.filter(child => 
        child instanceof THREE.DirectionalLight || 
        child instanceof THREE.AmbientLight ||
        child instanceof THREE.PointLight
      );
      return lights.length >= 3;
    });
  }

  // Test interactions
  async testInteractions() {
    console.log('Testing interactions...');

    this.test('Raycaster Created', () => {
      return window.raycaster && raycaster instanceof THREE.Raycaster;
    });

    this.test('Mouse Vector Setup', () => {
      return window.mouse && mouse instanceof THREE.Vector2;
    });

    this.test('Hex Objects Array', () => {
      return window.hexObjects && Array.isArray(hexObjects) && hexObjects.length > 0;
    });

    this.test('Drawers Array', () => {
      return window.drawers && Array.isArray(drawers);
    });

    // Test hover functionality
    this.test('Hover System', () => {
      return typeof window.hoveredDrawer !== 'undefined';
    });
  }

  // Test modal system
  async testModals() {
    console.log('Testing modal system...');

    const modalTypes = ['forge', 'contact', 'virtual', 'trash', 'convoyeur', 'sensorSensei'];

    modalTypes.forEach(type => {
      this.test(`${type} Modal Function`, () => {
        const functionName = `show${type.charAt(0).toUpperCase() + type.slice(1)}Modal`;
        return typeof window[functionName] === 'function';
      });
    });
  }

  // Test navigation
  async testNavigation() {
    console.log('Testing navigation...');

    this.test('Navigation Functions', () => {
      return typeof updateNavActiveState === 'function' &&
             typeof updateThemeUnreadBadges === 'function';
    });

    this.test('Unread Drawers System', () => {
      return window.unreadDrawers && unreadDrawers instanceof Set;
    });

    this.test('Hex Map Configuration', () => {
      return window.hexMap && Array.isArray(hexMap) && hexMap.length > 0;
    });
  }

  // Test mobile support
  async testMobile() {
    console.log('Testing mobile support...');

    this.test('Touch Detection', () => {
      return typeof window.isTouchDevice !== 'undefined';
    });

    this.test('Touch Variables', () => {
      return typeof touchStart !== 'undefined' &&
             typeof touchMoved !== 'undefined';
    });

    // Simulate touch event
    this.test('Touch Event Support', () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    });
  }

  // Test performance
  async testPerformance() {
    console.log('Testing performance...');

    this.test('Performance Monitor', () => {
      return window.performanceMonitor && typeof performanceMonitor.getFPS === 'function';
    });

    // Memory usage test
    this.test('Memory Usage', () => {
      if (performance.memory) {
        const memoryMB = performance.memory.usedJSHeapSize / 1048576;
        return memoryMB < 200; // Less than 200MB
      }
      return true; // Skip if not available
    });

    // FPS test (basic)
    await this.testAsync('Animation Loop', async () => {
      return new Promise(resolve => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrames() {
          frameCount++;
          if (frameCount >= 60) {
            const duration = performance.now() - startTime;
            const fps = (frameCount / duration) * 1000;
            resolve(fps > 30); // At least 30 FPS
          } else {
            requestAnimationFrame(countFrames);
          }
        }
        
        requestAnimationFrame(countFrames);
        
        // Timeout after 3 seconds
        setTimeout(() => resolve(false), 3000);
      });
    });
  }

  // Test accessibility
  async testAccessibility() {
    console.log('Testing accessibility...');

    this.test('Document Language', () => {
      return document.documentElement.lang !== '';
    });

    this.test('Page Title', () => {
      return document.title && document.title.trim() !== '';
    });

    this.test('Meta Description', () => {
      const meta = document.querySelector('meta[name="description"]');
      return meta && meta.content.trim() !== '';
    });

    this.test('Focus Management', () => {
      // Check if focus can be set programmatically
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      const focused = document.activeElement === button;
      document.body.removeChild(button);
      return focused;
    });
  }

  // Helper methods
  test(name, testFn) {
    try {
      const result = testFn();
      this.results.push({ name, passed: result, type: 'sync' });
      console.log(result ? '✅' : '❌', name);
      if (!result) {
        this.errors.push(`${name} failed`);
      }
    } catch (error) {
      this.results.push({ name, passed: false, error: error.message, type: 'sync' });
      console.log('❌', name, '- Error:', error.message);
      this.errors.push(`${name} errored: ${error.message}`);
    }
  }

  async testAsync(name, testFn) {
    try {
      const result = await testFn();
      this.results.push({ name, passed: result, type: 'async' });
      console.log(result ? '✅' : '❌', name);
      if (!result) {
        this.errors.push(`${name} failed`);
      }
    } catch (error) {
      this.results.push({ name, passed: false, error: error.message, type: 'async' });
      console.log('❌', name, '- Error:', error.message);
      this.errors.push(`${name} errored: ${error.message}`);
    }
  }

  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log('\n📊 Test Results:');
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (this.errors.length > 0) {
      console.log('\n❌ Failures:');
      this.errors.forEach(error => console.log('  -', error));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.warnings.forEach(warning => console.log('  -', warning));
    }

    // Show report in UI
    this.showReport(total, passed, failed);

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      errors: this.errors,
      warnings: this.warnings,
      details: this.results
    };
  }

  showTestingUI() {
    const ui = document.createElement('div');
    ui.id = 'test-ui';
    ui.style.cssText = `
      position: fixed; top: 10px; left: 10px; z-index: 10000;
      background: rgba(0,0,0,0.8); color: white; padding: 12px;
      border-radius: 8px; font-family: monospace; font-size: 12px;
    `;
    ui.innerHTML = '🧪 Running tests...';
    document.body.appendChild(ui);
  }

  hideTestingUI() {
    const ui = document.getElementById('test-ui');
    if (ui) ui.remove();
  }

  showReport(total, passed, failed) {
    const report = document.createElement('div');
    report.id = 'test-report';
    report.style.cssText = `
      position: fixed; top: 10px; left: 10px; z-index: 10000;
      background: ${failed === 0 ? 'rgba(0,150,0,0.9)' : 'rgba(150,0,0,0.9)'};
      color: white; padding: 16px; border-radius: 8px;
      font-family: monospace; font-size: 12px; max-width: 300px;
    `;
    
    report.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Test Report</div>
      <div>Total: ${total}</div>
      <div>Passed: ${passed}</div>
      <div>Failed: ${failed}</div>
      <div>Success: ${((passed / total) * 100).toFixed(1)}%</div>
      <button onclick="this.parentElement.remove()" style="margin-top: 8px; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer;">Close</button>
    `;
    
    document.body.appendChild(report);

    setTimeout(() => {
      if (report.parentElement) report.remove();
    }, 10000);
  }
}

// Make available globally for manual testing
window.PortfolioTester = PortfolioTester;

// Auto-run in development mode
if (!window.location.hostname.includes('localhost') === false) {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for everything to load, then run tests
    setTimeout(() => {
      if (window.allAssetsLoaded) {
        console.log('🧪 Auto-running tests...');
        const tester = new PortfolioTester();
        tester.runAllTests();
      }
    }, 5000);
  });
}

console.log('Portfolio Tester loaded. Run tests manually with: new PortfolioTester().runAllTests()');
