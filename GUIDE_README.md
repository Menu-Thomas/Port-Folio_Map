# Portfolio Guide System

This interactive guide system provides a Clippy-inspired tutorial for new users exploring the 3D hexagonal portfolio interface.

## Features

- **Welcome Introduction**: Introduces users to the 3D portfolio concept
- **Step-by-step Tutorial**: Guides users through key features:
  - Navigation using mouse drag to orbit around the island
  - Using the sidebar navigation for quick access
  - Clicking on hexagons to navigate to different sections
  - Discovering interactive objects with hover effects
  - Clicking on special objects to open detailed modals
  - Using scroll wheel to return to overview
- **Context-aware Guidance**: Detects user interactions and adapts accordingly
- **Progress Tracking**: Remembers if user has completed the guide
- **Skip/Restart Options**: Users can skip the guide or restart it anytime
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Files

- `guide.js` - Main guide system logic and functionality
- `guide.css` - Responsive styles for guide elements

## How it Works

### Initialization
The guide automatically starts for first-time visitors after all portfolio assets are loaded. Returning users see a small help button to restart the guide.

### Guide Steps
1. **Welcome** - Introduction to the 3D portfolio concept
2. **Overview** - Explains camera controls and hexagon concept
3. **Navigation** - Shows sidebar navigation features
4. **Hex Interaction** - Teaches hex clicking for navigation
5. **Objects Introduction** - Introduces interactive objects concept
6. **Hover Objects** - Teaches object hover interactions
7. **Click Objects** - Teaches object clicking for detailed views
8. **Scroll Tip** - Explains scroll wheel navigation
9. **Completion** - Congratulates user and ends tutorial

### Interactive Features
- **Smart Detection**: Automatically detects when users perform guided actions
- **Visual Highlights**: Highlights relevant UI elements during explanations
- **Progress Indicators**: Shows current step and total steps
- **Character Animation**: Animated guide character with floating and pulsing effects

### Storage
- Uses localStorage to remember if guide was completed
- Key: `portfolio_guide_completed`

### API
The guide system exposes a global API:
```javascript
window.portfolioGuide.start()    // Start the guide
window.portfolioGuide.end()      // End the guide
window.portfolioGuide.restart()  // Clear completion status and restart
window.portfolioGuide.isActive() // Check if guide is currently running
```

## Customization

### Colors
The guide uses the portfolio's color scheme defined in `GUIDE_CONFIG.COLORS`:
- Primary: `#ffd4a3` (warm orange)
- Secondary: `#ff9a56` (darker orange)
- Background: `rgba(20, 20, 30, 0.95)` (dark semi-transparent)

### Timing
Step durations and animation speeds can be adjusted in `GUIDE_CONFIG`.

### Content
Guide messages and titles are in French and can be easily modified in the `guideSteps` array.

## Browser Compatibility

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support
- requestAnimationFrame support
- localStorage support

## Accessibility

- Keyboard navigation support for buttons
- Focus indicators
- Reduced motion support for users with motion sensitivity
- Screen reader friendly text content
