/**
 * Popup Script - UI logic for extension popup
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display stats
  await loadStats();
  
  // Set up toggle
  setupToggle();
  
  // Set up links
  setupLinks();
  
  // Refresh stats periodically
  setInterval(loadStats, 5000);
});

/**
 * Load and display user statistics
 */
async function loadStats() {
  try {
    // Get stats from background
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    
    if (response) {
      // Update balance
      document.getElementById('balance').textContent = response.balance.toLocaleString();
      
      // Update today's stats
      document.getElementById('today-ads').textContent = response.today.adsSubmitted;
      document.getElementById('today-points').textContent = response.today.pointsEarned;
      document.getElementById('ads-count').textContent = response.today.adsSubmitted;
      
      // Update progress bar
      const progress = (response.today.adsSubmitted / 50) * 100;
      document.getElementById('progress-fill').style.width = `${progress}%`;
      
      // Show achievements if any
      if (response.achievements && response.achievements.length > 0) {
        showAchievements(response.achievements);
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/**
 * Show recent achievements
 */
function showAchievements(achievements) {
  const container = document.getElementById('achievements-container');
  const list = document.getElementById('achievements-list');
  
  // Clear existing
  list.innerHTML = '';
  
  // Show last 3 achievements
  const recent = achievements.slice(-3).reverse();
  
  recent.forEach(achievement => {
    const el = document.createElement('div');
    el.className = 'achievement';
    el.innerHTML = `
      <div class="achievement-icon">${getAchievementIcon(achievement.id)}</div>
      <div class="achievement-info">
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
    list.appendChild(el);
  });
  
  container.style.display = 'block';
}

/**
 * Get icon for achievement
 */
function getAchievementIcon(achievementId) {
  const icons = {
    'first_10_ads': '🌟',
    'ad_hunter': '🎯',
    'week_streak': '🔥',
    'rare_finder': '💎',
    'early_bird': '🌅'
  };
  return icons[achievementId] || '🏆';
}

/**
 * Set up extension toggle
 */
function setupToggle() {
  const toggle = document.getElementById('toggle');
  
  // Load current state
  chrome.storage.local.get('enabled', (result) => {
    const enabled = result.enabled !== false;
    toggle.classList.toggle('active', enabled);
  });
  
  // Handle click
  toggle.addEventListener('click', async () => {
    const isActive = toggle.classList.contains('active');
    const newState = !isActive;
    
    // Update UI
    toggle.classList.toggle('active', newState);
    
    // Save state
    await chrome.storage.local.set({ enabled: newState });
    
    // Notify content scripts
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'TOGGLE_DETECTION',
        enabled: newState
      });
    }
  });
}

/**
 * Set up footer links
 */
function setupLinks() {
  document.getElementById('learn-more').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://adintel-dao.com' }); // TODO: Update URL
  });
  
  document.getElementById('privacy').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://adintel-dao.com/privacy' }); // TODO: Update URL
  });
}