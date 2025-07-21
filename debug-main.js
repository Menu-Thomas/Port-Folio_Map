// Badge debugging helper
console.log('=== BADGE DEBUG SCRIPT LOADED ===');

// Wait for the main script to load
setTimeout(() => {
    // Get functions from window
    const getUnreadCountForTheme = window.getUnreadCountForTheme;
    const getUnreadDrawers = window.getUnreadDrawers;
    
    if (!getUnreadCountForTheme) {
        console.log('ERROR: getUnreadCountForTheme not found');
        return;
    }
    
    const unreadDrawers = getUnreadDrawers();
    console.log('Current unread drawers:', Array.from(unreadDrawers));
    
    // Test theme counts
    const themes = ['home', 'forge', 'contact', 'projects', 'cv'];
    themes.forEach(themeId => {
        const count = getUnreadCountForTheme(themeId);
        console.log(`Theme "${themeId}": ${count} unread items`);
        
        // Check if badge exists
        const badge = document.getElementById(`unread-badge-${themeId}`);
        console.log(`Badge element for "${themeId}": ${badge ? 'EXISTS' : 'MISSING'}`);
        if (badge) {
            console.log(`  Badge text: "${badge.textContent}", opacity: ${badge.style.opacity}`);
        }
    });
    
    // Check nav list
    const navList = document.getElementById('zoneNavList');
    console.log(`Navigation list: ${navList ? 'EXISTS' : 'MISSING'}`);
    if (navList) {
        const listItems = navList.querySelectorAll('li');
        console.log(`Navigation items found: ${listItems.length}`);
    }
    
    // Show debug on screen
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: rgba(0,0,0,0.8); color: white; padding: 20px;
        border-radius: 8px; font-family: monospace; font-size: 12px;
        max-width: 300px; line-height: 1.4;
    `;
    
    let debugContent = '<strong>Badge Status:</strong><br>';
    themes.forEach(themeId => {
        const count = getUnreadCountForTheme(themeId);
        const badge = document.getElementById(`unread-badge-${themeId}`);
        debugContent += `${themeId}: ${count} items, badge: ${badge ? 'OK' : 'MISSING'}<br>`;
    });
    
    debugDiv.innerHTML = debugContent;
    document.body.appendChild(debugDiv);
    
}, 3000); // Wait 3 seconds for everything to load
