/**
 * Popup Script - UI logic for extension popup
 */

import { Chart, ChartConfiguration } from 'chart.js/auto';
import type { 
  UserStats, 
  ExtensionSettings, 
  AchievementMap,
  DailyStats,
  ExportData 
} from '@types/index';

// Chart instance
let statsChart: Chart | null = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Load and display stats
  await loadStats();
  
  // Set up toggle
  setupToggle();
  
  // Set up action buttons
  setupActions();
  
  // Initialize chart
  initializeChart();
  
  // Refresh stats periodically
  setInterval(loadStats, 5000);
});

/**
 * Load and display user statistics
 */
async function loadStats(): Promise<void> {
  try {
    // Get stats from background
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' }) as UserStats;
    
    if (response) {
      // Update balance
      updateElement('balance', response.balance.toLocaleString());
      
      // Update today's stats
      updateElement('today-ads', response.today.adsSubmitted);
      updateElement('today-points', response.today.pointsEarned);
      updateElement('daily-remaining', response.today.remaining);
      
      // Update total stats
      updateElement('total-ads', response.total.adsSubmitted);
      updateElement('total-points', response.total.pointsEarned);
      
      // Update streak
      updateElement('current-streak', response.currentStreak);
      
      // Update progress bar
      const progress = (response.today.adsSubmitted / 50) * 100;
      const progressBar = document.getElementById('progress-fill') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', response.today.adsSubmitted.toString());
      }
      
      // Update achievements count
      updateElement('achievements-count', response.achievements);
      
      // Show recent achievements
      if (response.allAchievements) {
        displayAchievements(response.allAchievements);
      }
      
      // Update chart
      if (statsChart && response.dailyStats) {
        updateChart(response.dailyStats);
      }
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
    showError('Failed to load statistics');
  }
}

/**
 * Setup extension toggle
 */
async function setupToggle(): Promise<void> {
  const toggle = document.getElementById('extension-toggle') as HTMLInputElement;
  if (!toggle) return;
  
  try {
    // Get current state
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }) as ExtensionSettings;
    toggle.checked = settings.enabled;
    
    // Handle toggle change
    toggle.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const enabled = target.checked;
      
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { enabled }
      });
      
      // Update UI state
      document.body.classList.toggle('extension-disabled', !enabled);
      showNotification(enabled ? 'Extension enabled' : 'Extension disabled');
    });
  } catch (error) {
    console.error('Failed to setup toggle:', error);
  }
}

/**
 * Setup action buttons
 */
function setupActions(): void {
  // Export data button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
  
  // Clear data button
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearData);
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Help button
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/adintel-dao/adintel-dao/wiki' });
    });
  }
}

/**
 * Initialize statistics chart
 */
function initializeChart(): void {
  const ctx = document.getElementById('stats-chart') as HTMLCanvasElement;
  if (!ctx) return;
  
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Points Earned',
        data: [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4
      }, {
        label: 'Ads Detected',
        data: [],
        borderColor: '#764ba2',
        backgroundColor: 'rgba(118, 75, 162, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };
  
  statsChart = new Chart(ctx, config);
}

/**
 * Update chart with daily stats
 * @param dailyStats - Daily statistics
 */
function updateChart(dailyStats: Record<string, DailyStats>): void {
  if (!statsChart) return;
  
  // Get last 7 days
  const days = Object.keys(dailyStats)
    .sort()
    .slice(-7);
  
  const labels = days.map(day => {
    const date = new Date(day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  const pointsData = days.map(day => dailyStats[day]?.pointsEarned || 0);
  const adsData = days.map(day => dailyStats[day]?.adsSubmitted || 0);
  
  statsChart.data.labels = labels;
  statsChart.data.datasets[0].data = pointsData;
  statsChart.data.datasets[1].data = adsData;
  statsChart.update();
}

/**
 * Display achievements
 * @param achievements - All achievements
 */
function displayAchievements(achievements: AchievementMap): void {
  const container = document.getElementById('achievements-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Sort achievements: unlocked first, then by threshold
  const sortedAchievements = Object.entries(achievements)
    .sort(([, a], [, b]) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return a.threshold - b.threshold;
    });
  
  sortedAchievements.forEach(([key, achievement]) => {
    const achievementEl = document.createElement('div');
    achievementEl.className = `achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    achievementEl.innerHTML = `
      <div class="achievement-icon">${achievement.unlocked ? '🏆' : '🔒'}</div>
      <div class="achievement-info">
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-description">
          ${achievement.unlocked && achievement.unlockedAt
            ? `Unlocked ${new Date(achievement.unlockedAt).toLocaleDateString()}`
            : `Requirement: ${achievement.threshold}`
          }
        </div>
      </div>
      <div class="achievement-points">+${achievement.points} pts</div>
    `;
    container.appendChild(achievementEl);
  });
}

/**
 * Export user data
 */
async function exportData(): Promise<void> {
  try {
    const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }) as ExportData;
    
    // Create download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `adintel-dao-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully');
  } catch (error) {
    console.error('Failed to export data:', error);
    showError('Failed to export data');
  }
}

/**
 * Clear all user data
 */
async function clearData(): Promise<void> {
  if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    return;
  }
  
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
    showNotification('All data cleared');
    
    // Reload stats
    setTimeout(loadStats, 500);
  } catch (error) {
    console.error('Failed to clear data:', error);
    showError('Failed to clear data');
  }
}

/**
 * Update element text content
 * @param id - Element ID
 * @param value - Value to display
 */
function updateElement(id: string, value: string | number): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value.toString();
  }
}

/**
 * Show notification
 * @param message - Notification message
 */
function showNotification(message: string): void {
  const notification = document.createElement('div');
  notification.className = 'notification success';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Show error notification
 * @param message - Error message
 */
function showError(message: string): void {
  const notification = document.createElement('div');
  notification.className = 'notification error';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}