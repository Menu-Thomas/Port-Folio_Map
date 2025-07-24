/**
 * Interactive Portfolio Guide - Thomas Menu
 * A Clippy-inspired guide system for the 3D hexagonal portfolio interface
 * 
 * Features:
 * - Step-by-step tutorial for new users
 * - Interactive hints and tooltips
 * - Progress tracking and context-aware guidance
 * - Animated guide character with personality
 * 
 * @author Thomas Menu
 * @version 1.0.0
 */

// === GUIDE CONFIGURATION ===
const GUIDE_CONFIG = {
  GUIDE_ID: 'portfolio-guide',
  STORAGE_KEY: 'portfolio_guide_completed',
  DISMISSED_KEY: 'portfolio_guide_dismissed',
  ANIMATION_DURATION: 500,
  BUBBLE_DELAY: 2000,
  COLORS: {
    PRIMARY: '#ffd4a3',
    SECONDARY: '#ff9a56',
    BACKGROUND: 'rgba(20, 20, 30, 0.95)',
    BORDER: 'rgba(255, 212, 163, 0.3)',
    TEXT: '#ffffff',
    SHADOW: 'rgba(0, 0, 0, 0.3)'
  }
};

// === GUIDE STATE ===
let guideState = {
  isActive: false,
  currentStep: 0,
  isFirstVisit: true,
  guideBubble: null,
  guideCharacter: null,
  highlightOverlay: null,
  skipButton: null,
  userHasInteracted: false
};

// === GUIDE STEPS CONFIGURATION ===
const guideSteps = [
  {
    id: 'welcome',
    title: '🌟 Bienvenue sur mon île portfolio !',
    message: 'Je suis votre guide virtuel ! Cette île hexagonale en 3D présente mon univers professionnel de manière interactive. Prêt pour une visite guidée ?',
    action: 'continue',
    position: 'bottom-right',
    showSkip: true
  },
  {
    id: 'overview',
    title: '🗺️ Vue d\'ensemble',
    message: 'Vous pouvez faire glisser la souris pour tourner autour de l\'île et découvrir les différentes zones thématiques. Chaque hexagone représente une section de mon portfolio.',
    action: 'continue',
    position: 'bottom-right',
    highlight: null
  },
  {
    id: 'navigation',
    title: '🧭 Navigation facile',
    message: 'Utilisez cette barre de navigation pour accéder rapidement aux différentes sections : Accueil, CV, Projets, Contact, et Conception.',
    action: 'continue',
    position: 'left-center',
    highlight: '#zoneNavSidebar'
  },
  {
    id: 'hex_interaction',
    title: '🎯 Cliquez sur les hexagones',
    message: 'Cliquez sur n\'importe quel hexagone pour vous y rendre ! La caméra s\'animera automatiquement vers cette zone. Essayez de cliquer sur un hexagone maintenant.',
    action: 'click_hex',
    position: 'center',
    highlight: null,
    waitForInteraction: true
  },
  {
    id: 'objects_intro',
    title: '🔍 Objets interactifs',
    message: 'Chaque zone contient des objets 3D interactifs ! Recherchez des éléments qui brillent ou qui bougent quand vous passez la souris dessus.',
    action: 'continue',
    position: 'bottom-right',
    highlight: null
  },
  {
    id: 'hover_objects',
    title: '✨ Survol pour découvrir',
    message: 'Passez votre souris sur les objets pour voir des informations et des animations. Certains objets se soulèvent ou s\'illuminent !',
    action: 'hover_object',
    position: 'top-center',
    highlight: null,
    waitForInteraction: true
  },
  {
    id: 'click_objects',
    title: '🖱️ Cliquez pour approfondir',
    message: 'Cliquez sur les objets spéciaux pour ouvrir des modales détaillées avec mes projets, expériences et compétences. Essayez maintenant !',
    action: 'click_object',
    position: 'top-center',
    highlight: null,
    waitForInteraction: true
  },
  {
    id: 'scroll_tip',
    title: '🔄 Astuce de navigation',
    message: 'Utilisez la molette de la souris pour revenir à la vue d\'ensemble à tout moment. Très pratique pour explorer rapidement !',
    action: 'continue',
    position: 'bottom-right',
    highlight: null
  },
  {
    id: 'completion',
    title: '🎉 Parfait !',
    message: 'Vous maîtrisez maintenant les bases ! Explorez librement mon univers professionnel. Bonne découverte et n\'hésitez pas à me contacter !',
    action: 'complete',
    position: 'center',
    highlight: null
  }
];

// === GUIDE INITIALIZATION ===
function initializeGuide() {
  // Check if user has already completed or dismissed the guide
  const hasCompletedGuide = localStorage.getItem(GUIDE_CONFIG.STORAGE_KEY) === 'true';
  const hasDismissedGuide = localStorage.getItem(GUIDE_CONFIG.DISMISSED_KEY) === 'true';
  
  if (hasCompletedGuide || hasDismissedGuide) {
    guideState.isFirstVisit = false;
    createGuideToggleButton();
    return;
  }

  // Check if user is returning from contact page (skip guide in this case)
  const returningFromContact = sessionStorage.getItem('returningFromContact') === 'true';
  if (returningFromContact) {
    guideState.isFirstVisit = false;
    createGuideToggleButton();
    return;
  }

  // Wait for both assets to load AND loading overlay to be hidden
  function checkReadyToStart() {
    const assetsLoaded = window.allAssetsLoaded || sessionStorage.getItem('portfolioAssetsLoaded') === 'true';
    const overlayHidden = sessionStorage.getItem('loadingOverlayHidden') === 'true';
    const loadingOverlay = document.getElementById('loadingOverlay');
    const isOverlayActuallyHidden = !loadingOverlay || loadingOverlay.classList.contains('hidden');
    
    return assetsLoaded && overlayHidden && isOverlayActuallyHidden;
  }

  if (checkReadyToStart()) {
    // Small delay to ensure the loading overlay fade-out animation is complete
    setTimeout(startGuide, 1500);
  } else {
    // Check periodically for both conditions
    const checkInterval = setInterval(() => {
      if (checkReadyToStart()) {
        clearInterval(checkInterval);
        setTimeout(startGuide, 1500); // Small delay to ensure everything is ready
      }
    }, 500);
    
    // Also listen for the loading overlay hidden event
    const overlayHiddenListener = () => {
      setTimeout(() => {
        if (checkReadyToStart()) {
          startGuide();
          document.removeEventListener('loadingOverlayHidden', overlayHiddenListener);
        }
      }, 1500);
    };
    document.addEventListener('loadingOverlayHidden', overlayHiddenListener);
    
    // Cleanup after 30 seconds to prevent memory leaks
    setTimeout(() => {
      clearInterval(checkInterval);
      document.removeEventListener('loadingOverlayHidden', overlayHiddenListener);
      // Create toggle button as fallback
      if (!guideState.isActive && !document.getElementById('guide-toggle')) {
        createGuideToggleButton();
      }
    }, 30000);
  }
}

// === GUIDE CREATION FUNCTIONS ===
function createGuideCharacter() {
  const character = document.createElement('div');
  character.id = 'guide-character';
  character.innerHTML = '🧙‍♂️'; // Wizard emoji as guide character
  character.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, ${GUIDE_CONFIG.COLORS.PRIMARY}, ${GUIDE_CONFIG.COLORS.SECONDARY});
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 20px ${GUIDE_CONFIG.COLORS.SHADOW};
    transition: all 0.3s ease;
    animation: guideFloat 3s ease-in-out infinite;
    border: 3px solid ${GUIDE_CONFIG.COLORS.BORDER};
    pointer-events: auto;
  `;

  // Add floating animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes guideFloat {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-10px) scale(1.05); }
    }
    @keyframes guidePulse {
      0%, 100% { box-shadow: 0 4px 20px ${GUIDE_CONFIG.COLORS.SHADOW}; }
      50% { box-shadow: 0 4px 20px ${GUIDE_CONFIG.COLORS.PRIMARY}66; }
    }
    .guide-active {
      animation: guidePulse 2s ease-in-out infinite !important;
    }
  `;
  document.head.appendChild(style);

  character.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (guideState.isActive) {
      endGuide();
    } else {
      startGuide();
    }
  });

  character.addEventListener('mouseenter', () => {
    character.style.transform = 'scale(1.1)';
  });

  character.addEventListener('mouseleave', () => {
    character.style.transform = 'scale(1)';
  });

  // Prevent clicks from passing through
  character.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  character.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  document.body.appendChild(character);
  return character;
}

function createGuideBubble() {
  const bubble = document.createElement('div');
  bubble.id = 'guide-bubble';
  bubble.style.cssText = `
    position: fixed;
    max-width: 380px;
    min-width: 320px;
    background: ${GUIDE_CONFIG.COLORS.BACKGROUND};
    color: ${GUIDE_CONFIG.COLORS.TEXT};
    border: 2px solid ${GUIDE_CONFIG.COLORS.BORDER};
    border-radius: 16px;
    padding: 20px;
    z-index: 10001;
    box-shadow: 0 8px 32px ${GUIDE_CONFIG.COLORS.SHADOW};
    backdrop-filter: blur(10px);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.3s ease;
    pointer-events: auto;
    word-wrap: break-word;
    line-height: 1.4;
  `;

  // Prevent clicks from passing through to objects behind
  bubble.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  bubble.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  bubble.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  bubble.addEventListener('mousemove', (e) => {
    e.stopPropagation();
  });

  document.body.appendChild(bubble);
  return bubble;
}

function createHighlightOverlay(targetSelector) {
  if (!targetSelector) return null;

  const overlay = document.createElement('div');
  overlay.id = 'guide-highlight-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.5s ease;
  `;

  // Prevent clicks from passing through the overlay
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  overlay.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  overlay.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  const target = document.querySelector(targetSelector);
  if (target) {
    const rect = target.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: absolute;
      left: ${rect.left - 10}px;
      top: ${rect.top - 10}px;
      width: ${rect.width + 20}px;
      height: ${rect.height + 20}px;
      border: 3px solid ${GUIDE_CONFIG.COLORS.PRIMARY};
      border-radius: 8px;
      box-shadow: 0 0 20px ${GUIDE_CONFIG.COLORS.PRIMARY}66;
      background: transparent;
      animation: highlightPulse 2s ease-in-out infinite;
      pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes highlightPulse {
        0%, 100% { 
          box-shadow: 0 0 20px ${GUIDE_CONFIG.COLORS.PRIMARY}66;
          border-color: ${GUIDE_CONFIG.COLORS.PRIMARY};
        }
        50% { 
          box-shadow: 0 0 30px ${GUIDE_CONFIG.COLORS.PRIMARY}99;
          border-color: ${GUIDE_CONFIG.COLORS.SECONDARY};
        }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(highlight);
  }

  document.body.appendChild(overlay);
  return overlay;
}

function createSkipButton() {
  const skipBtn = document.createElement('button');
  skipBtn.id = 'guide-skip-button';
  skipBtn.textContent = 'Passer le guide';
  skipBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid ${GUIDE_CONFIG.COLORS.BORDER};
    color: ${GUIDE_CONFIG.COLORS.TEXT};
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    z-index: 10002;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    pointer-events: auto;
  `;

  skipBtn.addEventListener('mouseenter', () => {
    skipBtn.style.background = `rgba(255, 212, 163, 0.2)`;
    skipBtn.style.transform = 'scale(1.05)';
  });

  skipBtn.addEventListener('mouseleave', () => {
    skipBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    skipBtn.style.transform = 'scale(1)';
  });

  skipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    endGuide(true);
  });

  // Prevent clicks from passing through
  skipBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  skipBtn.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  document.body.appendChild(skipBtn);
  return skipBtn;
}

function createGuideToggleButton() {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'guide-toggle';
  toggleBtn.innerHTML = '❓';
  toggleBtn.title = 'Relancer le guide (clic droit pour réinitialiser)';
  toggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 45px;
    height: 45px;
    background: rgba(255, 212, 163, 0.1);
    border: 2px solid ${GUIDE_CONFIG.COLORS.BORDER};
    color: ${GUIDE_CONFIG.COLORS.PRIMARY};
    border-radius: 50%;
    cursor: pointer;
    z-index: 10000;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    pointer-events: auto;
  `;

  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.background = `rgba(255, 212, 163, 0.2)`;
    toggleBtn.style.transform = 'scale(1.1)';
  });

  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.background = 'rgba(255, 212, 163, 0.1)';
    toggleBtn.style.transform = 'scale(1)';
  });

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    startGuide();
  });

  // Add right-click to reset guide preferences
  toggleBtn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear both completed and dismissed flags
    localStorage.removeItem(GUIDE_CONFIG.STORAGE_KEY);
    localStorage.removeItem(GUIDE_CONFIG.DISMISSED_KEY);
    
    // Show confirmation
    toggleBtn.innerHTML = '✓';
    toggleBtn.title = 'Préférences du guide réinitialisées - Clic gauche pour démarrer';
    setTimeout(() => {
      toggleBtn.innerHTML = '❓';
      toggleBtn.title = 'Relancer le guide (clic droit pour réinitialiser)';
    }, 2000);
  });

  // Prevent clicks from passing through
  toggleBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  toggleBtn.addEventListener('mouseup', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  document.body.appendChild(toggleBtn);
}

// === GUIDE CONTROL FUNCTIONS ===
function startGuide() {
  if (guideState.isActive) return;

  guideState.isActive = true;
  guideState.currentStep = 0;
  guideState.userHasInteracted = false;

  // Create guide elements
  guideState.guideCharacter = createGuideCharacter();
  guideState.guideBubble = createGuideBubble();

  if (guideSteps[0].showSkip) {
    guideState.skipButton = createSkipButton();
  }

  // Add active class to character
  guideState.guideCharacter.classList.add('guide-active');

  // Disable 3D interactions temporarily for first steps
  if (window.interactionsDisabled !== undefined) {
    window.guideOriginalInteractionState = window.interactionsDisabled;
    window.interactionsDisabled = true;
  }

  showStep(0);
}

function endGuide(skipped = false) {
  if (!guideState.isActive) return;

  guideState.isActive = false;

  // Restore original interaction state
  if (window.guideOriginalInteractionState !== undefined) {
    window.interactionsDisabled = window.guideOriginalInteractionState;
    delete window.guideOriginalInteractionState;
  }

  // Remove guide elements
  [guideState.guideBubble, guideState.highlightOverlay, guideState.skipButton, guideState.guideCharacter]
    .forEach(element => {
      if (element && element.parentNode) {
        element.remove();
      }
    });

  // Reset state
  guideState.guideBubble = null;
  guideState.highlightOverlay = null;
  guideState.skipButton = null;
  guideState.guideCharacter = null;

  // Mark as completed if not skipped, or as dismissed if skipped
  if (!skipped && guideState.currentStep >= guideSteps.length - 1) {
    localStorage.setItem(GUIDE_CONFIG.STORAGE_KEY, 'true');
  } else if (skipped) {
    // User dismissed the guide, don't show it automatically again
    localStorage.setItem(GUIDE_CONFIG.DISMISSED_KEY, 'true');
  }

  // Create toggle button for future access
  if (!document.getElementById('guide-toggle')) {
    createGuideToggleButton();
  }
}

function showStep(stepIndex) {
  if (stepIndex >= guideSteps.length) {
    endGuide();
    return;
  }

  const step = guideSteps[stepIndex];
  guideState.currentStep = stepIndex;

  // Update bubble content
  updateBubbleContent(step);

  // Position bubble
  positionBubble(step.position);

  // Create highlight if needed
  if (guideState.highlightOverlay) {
    guideState.highlightOverlay.remove();
    guideState.highlightOverlay = null;
  }

  if (step.highlight) {
    guideState.highlightOverlay = createHighlightOverlay(step.highlight);
    setTimeout(() => {
      if (guideState.highlightOverlay) {
        guideState.highlightOverlay.style.opacity = '1';
      }
    }, 100);
  }

  // Show bubble with animation
  setTimeout(() => {
    if (guideState.guideBubble) {
      guideState.guideBubble.style.opacity = '1';
      guideState.guideBubble.style.transform = 'scale(1)';
    }
  }, 100);

  // Handle step-specific logic
  handleStepAction(step);
}

function updateBubbleContent(step) {
  if (!guideState.guideBubble) return;

  const showNextButton = step.action !== 'complete' && !step.waitForInteraction;
  const isInteractiveStep = step.waitForInteraction;
  const isCompleteStep = step.action === 'complete';

  guideState.guideBubble.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px;">
      <img src="./public/head.png" alt="Thomas Menu" style="
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid ${GUIDE_CONFIG.COLORS.PRIMARY};
        box-shadow: 0 2px 8px ${GUIDE_CONFIG.COLORS.SHADOW};
        flex-shrink: 0;
        object-fit: cover;
      ">
      <div style="flex: 1;">
        <div style="font-size: 18px; font-weight: bold; color: ${GUIDE_CONFIG.COLORS.PRIMARY}; margin-bottom: 8px;">
          ${step.title}
        </div>
        <div style="font-size: 14px; line-height: 1.5; color: ${GUIDE_CONFIG.COLORS.TEXT};">
          ${step.message}
        </div>
        ${isInteractiveStep ? `
          <div style="margin-top: 10px; padding: 8px; background: rgba(255, 212, 163, 0.1); border-radius: 8px; font-size: 12px; color: #ffd4a3; border: 1px solid rgba(255, 212, 163, 0.2);">
            💡 Interagissez avec l'élément pour continuer
          </div>
        ` : ''}
      </div>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 12px; color: #aaa;">
        Étape ${guideState.currentStep + 1} sur ${guideSteps.length}
      </div>
      <div>
        ${showNextButton ? 
          `<button id="guide-next-btn" style="
            background: ${GUIDE_CONFIG.COLORS.PRIMARY};
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
          ">Suivant</button>` : ''
        }
        ${isCompleteStep ? 
          `<button id="guide-complete-btn" style="
            background: #4caf50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s ease;
          ">Terminer</button>` : ''
        }
      </div>
    </div>
  `;

  // Add click handler for next button
  const nextBtn = guideState.guideBubble.querySelector('#guide-next-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => nextStep());
    nextBtn.addEventListener('mouseenter', () => {
      nextBtn.style.background = GUIDE_CONFIG.COLORS.SECONDARY;
      nextBtn.style.transform = 'scale(1.05)';
    });
    nextBtn.addEventListener('mouseleave', () => {
      nextBtn.style.background = GUIDE_CONFIG.COLORS.PRIMARY;
      nextBtn.style.transform = 'scale(1)';
    });
  }

  // Add click handler for complete button
  const completeBtn = guideState.guideBubble.querySelector('#guide-complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => endGuide());
    completeBtn.addEventListener('mouseenter', () => {
      completeBtn.style.background = '#45a049';
      completeBtn.style.transform = 'scale(1.05)';
    });
    completeBtn.addEventListener('mouseleave', () => {
      completeBtn.style.background = '#4caf50';
      completeBtn.style.transform = 'scale(1)';
    });
  }

  // Add arrow pointing to character (adjust based on position)
  const arrow = document.createElement('div');
  let arrowPosition = 'bottom'; // default
  
  // Determine arrow position based on bubble position
  if (step.position === 'top-center') {
    arrowPosition = 'top';
  } else if (step.position === 'center-right' || step.position === 'bottom-right') {
    arrowPosition = 'bottom';
  } else if (step.position === 'left-center') {
    arrowPosition = 'right';
  }
  
  switch (arrowPosition) {
    case 'top':
      arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 10px solid ${GUIDE_CONFIG.COLORS.BORDER};
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
      `;
      break;
    case 'right':
      arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
        border-left: 10px solid ${GUIDE_CONFIG.COLORS.BORDER};
        right: -10px;
        top: 50%;
        transform: translateY(-50%);
      `;
      break;
    default: // bottom
      arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-top: 10px solid ${GUIDE_CONFIG.COLORS.BORDER};
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
      `;
  }
  
  guideState.guideBubble.appendChild(arrow);
}

function positionBubble(position) {
  if (!guideState.guideBubble) return;

  const bubble = guideState.guideBubble;
  const character = guideState.guideCharacter;
  
  // Reset any previous positioning
  bubble.style.left = 'auto';
  bubble.style.right = 'auto';
  bubble.style.top = 'auto';
  bubble.style.bottom = 'auto';
  bubble.style.transform = 'scale(1)';

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isMobile = viewportWidth < 768;
  
  // On mobile, always use center position for better readability
  if (isMobile) {
    bubble.style.left = '50%';
    bubble.style.top = '50%';
    bubble.style.transform = 'translate(-50%, -50%) scale(1)';
    bubble.style.maxWidth = '90vw';
    bubble.style.minWidth = '280px';
    return;
  }
  
  switch (position) {
    case 'center':
      bubble.style.left = '50%';
      bubble.style.top = '50%';
      bubble.style.transform = 'translate(-50%, -50%) scale(1)';
      break;
      
    case 'bottom-right':
      // Position near the guide character
      if (character) {
        bubble.style.right = '110px';
        bubble.style.bottom = '110px';
      } else {
        bubble.style.right = '30px';
        bubble.style.bottom = '30px';
      }
      break;
      
    case 'center-right':
      // Position on the right side, vertically centered
      bubble.style.right = '30px';
      bubble.style.top = '50%';
      bubble.style.transform = 'translateY(-50%) scale(1)';
      break;
      
    case 'top-center':
      // Position at the top center
      bubble.style.left = '50%';
      bubble.style.top = '100px';
      bubble.style.transform = 'translateX(-50%) scale(1)';
      break;
      
    case 'left-center':
      // Position right next to the navigation sidebar
      bubble.style.left = '230px'; // Just right of the 220px navigation sidebar
      bubble.style.top = '50%';
      bubble.style.transform = 'translateY(-50%) scale(1)';
      break;
      
    default:
      // Default to bottom-right
      bubble.style.right = '110px';
      bubble.style.bottom = '110px';
  }
  
  // Ensure bubble stays within viewport bounds (but don't override intentional left positioning)
  setTimeout(() => {
    const rect = bubble.getBoundingClientRect();
    let adjustments = {};
    
    // Check if bubble goes outside viewport
    if (rect.right > viewportWidth - 10) {
      adjustments.right = '10px';
      adjustments.left = 'auto';
    }
    // Only adjust left position if it's not intentionally positioned there (left-center)
    if (rect.left < 230 && position !== 'left-center') { // Don't adjust if it's intentionally left-center
      adjustments.left = '240px';
      adjustments.right = 'auto';
    }
    if (rect.bottom > viewportHeight - 10) {
      adjustments.bottom = '10px';
      adjustments.top = 'auto';
    }
    if (rect.top < 10) {
      adjustments.top = '10px';
      adjustments.bottom = 'auto';
    }
    
    // Apply adjustments if needed
    Object.keys(adjustments).forEach(prop => {
      bubble.style[prop] = adjustments[prop];
    });
  }, 50);
}

function handleStepAction(step) {
  // Enable interactions for specific steps
  if (step.action === 'click_hex' || step.action === 'hover_object' || step.action === 'click_object') {
    if (window.interactionsDisabled !== undefined) {
      window.interactionsDisabled = false;
    }
  }

  // Set up event listeners for interactive steps
  if (step.waitForInteraction) {
    setupInteractionListeners(step);
  }
  
  // No automatic progression - user must click "Suivant" button or complete interaction
}

function setupInteractionListeners(step) {
  switch (step.action) {
    case 'click_hex':
      const hexClickHandler = () => {
        if (guideState.isActive && guideState.currentStep === guideSteps.indexOf(step)) {
          document.removeEventListener('click', hexClickHandler);
          setTimeout(() => nextStep(), 1000);
        }
      };
      document.addEventListener('click', hexClickHandler);
      break;

    case 'hover_object':
      const hoverHandler = () => {
        if (guideState.isActive && guideState.currentStep === guideSteps.indexOf(step)) {
          document.removeEventListener('mousemove', hoverHandler);
          setTimeout(() => nextStep(), 1500);
        }
      };
      // Check for drawer hover events
      const checkDrawerHover = setInterval(() => {
        if (guideState.isActive && guideState.currentStep === guideSteps.indexOf(step)) {
          const drawerLabel = document.getElementById('drawerLabel');
          if (drawerLabel && drawerLabel.style.display !== 'none') {
            clearInterval(checkDrawerHover);
            setTimeout(() => nextStep(), 2000);
          }
        } else {
          clearInterval(checkDrawerHover);
        }
      }, 500);
      break;

    case 'click_object':
      const objectClickHandler = (event) => {
        if (guideState.isActive && guideState.currentStep === guideSteps.indexOf(step)) {
          // Check if a modal was opened
          setTimeout(() => {
            const modals = document.querySelectorAll('[id*="Modal"]');
            if (modals.length > 0) {
              document.removeEventListener('click', objectClickHandler);
              setTimeout(() => nextStep(), 1000);
            }
          }, 500);
        }
      };
      document.addEventListener('click', objectClickHandler);
      break;
  }
}

function nextStep() {
  if (!guideState.isActive) return;

  // Hide current bubble
  if (guideState.guideBubble) {
    guideState.guideBubble.style.opacity = '0';
    guideState.guideBubble.style.transform = 'scale(0.8)';
  }

  // Hide highlight
  if (guideState.highlightOverlay) {
    guideState.highlightOverlay.style.opacity = '0';
  }

  setTimeout(() => {
    showStep(guideState.currentStep + 1);
  }, 300);
}

// === AUTO-INITIALIZATION ===
// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGuide);
} else {
  // DOM is already ready
  setTimeout(initializeGuide, 1000);
}

// Export for manual control
window.portfolioGuide = {
  start: startGuide,
  end: endGuide,
  restart: () => {
    localStorage.removeItem(GUIDE_CONFIG.STORAGE_KEY);
    startGuide();
  },
  isActive: () => guideState.isActive
};
