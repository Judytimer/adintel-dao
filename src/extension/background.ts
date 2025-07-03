/**
 * Background Service Worker
 * Handles ad data storage and reward calculations
 */

import RewardSystem from '@modules/RewardSystem';
import type {
  AdData,
  ExtensionMessage,
  ExtensionSettings,
  UserStats,
  ExportData,
  StorageData,
  SubmissionResult
} from '@types/index';

// Initialize reward system
let rewardSystem: RewardSystem;

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('AdIntel DAO Extension installed');
  
  // Set default settings
  const defaultSettings: StorageData = {
    enabled: true,
    point_balance: 0,
    daily_stats: {},
    submitted_ads: {},
    achievements: {}
  };
  
  chrome.storage.local.set(defaultSettings);
});

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener(
  (request: ExtensionMessage, sender, sendResponse) => {
    // Handle async operations
    (async () => {
      try {
        switch (request.type) {
          case 'AD_DETECTED':
            const result = await handleAdDetection(request.data as AdData);
            sendResponse(result);
            break;
            
          case 'GET_STATS':
            const stats = await getStats();
            sendResponse(stats);
            break;
            
          case 'GET_SETTINGS':
            const settings = await getSettings();
            sendResponse(settings);
            break;
            
          case 'UPDATE_SETTINGS':
            const updateResult = await updateSettings(request.settings!);
            sendResponse(updateResult);
            break;
            
          case 'EXPORT_DATA':
            const exportData = await exportData();
            sendResponse(exportData);
            break;
            
          case 'CLEAR_DATA':
            const clearResult = await clearData();
            sendResponse(clearResult);
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Message handler error:', error);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    })();
    
    return true; // Keep channel open for async response
  }
);

/**
 * Handle detected ad
 * @param adData - Ad metadata
 * @returns Processing result
 */
async function handleAdDetection(adData: AdData): Promise<SubmissionResult> {
  try {
    // Initialize reward system if needed
    if (!rewardSystem) {
      rewardSystem = new RewardSystem(chrome.storage.local);
    }

    // Validate ad data
    if (!validateAdData(adData)) {
      return { success: false, reason: 'invalid_data' };
    }

    // Process with reward system
    const result = await rewardSystem.submitAd(adData);
    
    // Store ad data locally (limited storage)
    if (result.success) {
      await storeAdData(adData);
      
      // Show notification for achievements
      if (result.newAchievements && result.newAchievements.length > 0) {
        for (const achievement of result.newAchievements) {
          showAchievementNotification(achievement);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error handling ad detection:', error);
    return { 
      success: false, 
      reason: 'processing_error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate ad data structure
 * @param adData - Ad data to validate
 * @returns Is valid
 */
function validateAdData(adData: AdData): boolean {
  if (!adData || typeof adData !== 'object') return false;
  
  // Required fields
  const requiredFields: (keyof AdData)[] = ['id', 'timestamp', 'platform', 'type'];
  for (const field of requiredFields) {
    if (!adData[field]) return false;
  }
  
  // Validate timestamp
  const timestamp = new Date(adData.timestamp);
  if (isNaN(timestamp.getTime())) return false;
  
  // Validate platform
  const validPlatforms: AdData['platform'][] = ['facebook', 'google', 'linkedin', 'twitter', 'other'];
  if (!validPlatforms.includes(adData.platform)) return false;
  
  return true;
}

/**
 * Store ad data with size limit
 * @param adData - Ad data to store
 */
async function storeAdData(adData: AdData): Promise<void> {
  const MAX_STORED_ADS = 100; // Limit local storage
  
  const storedAds = await chrome.storage.local.get('ad_data_cache');
  const adCache: AdData[] = storedAds.ad_data_cache || [];
  
  // Add new ad (store minimal data)
  adCache.push({
    id: adData.id,
    timestamp: adData.timestamp,
    platform: adData.platform,
    type: adData.type,
    position: adData.position,
    size: adData.size,
    textFeatures: adData.textFeatures
  });
  
  // Keep only recent ads
  if (adCache.length > MAX_STORED_ADS) {
    adCache.splice(0, adCache.length - MAX_STORED_ADS);
  }
  
  await chrome.storage.local.set({ ad_data_cache: adCache });
}

/**
 * Get user statistics
 * @returns User stats
 */
async function getStats(): Promise<UserStats> {
  if (!rewardSystem) {
    rewardSystem = new RewardSystem(chrome.storage.local);
  }
  
  const stats = await rewardSystem.getStats();
  const achievements = await rewardSystem.getAchievements();
  
  return {
    ...stats,
    allAchievements: achievements
  };
}

/**
 * Get extension settings
 * @returns Settings
 */
async function getSettings(): Promise<ExtensionSettings> {
  const settings = await chrome.storage.local.get(['enabled', 'notifications', 'privacy_mode']);
  return {
    enabled: settings.enabled !== false,
    notifications: settings.notifications !== false,
    privacy_mode: settings.privacy_mode || 'balanced'
  };
}

/**
 * Update extension settings
 * @param settings - New settings
 * @returns Update result
 */
async function updateSettings(settings: Partial<ExtensionSettings>): Promise<{ success: boolean }> {
  await chrome.storage.local.set(settings);
  
  // Notify content scripts of settings change
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings
        });
      } catch (error) {
        // Tab might not have content script
      }
    }
  }
  
  return { success: true };
}

/**
 * Export user data
 * @returns Exported data
 */
async function exportData(): Promise<ExportData> {
  if (!rewardSystem) {
    rewardSystem = new RewardSystem(chrome.storage.local);
  }
  
  const exportedData = await rewardSystem.exportData();
  const adCache = await chrome.storage.local.get('ad_data_cache');
  
  return {
    ...exportedData,
    adDataSummary: {
      cachedAds: adCache.ad_data_cache?.length || 0
    }
  };
}

/**
 * Clear all user data
 * @returns Clear result
 */
async function clearData(): Promise<{ success: boolean }> {
  if (!rewardSystem) {
    rewardSystem = new RewardSystem(chrome.storage.local);
  }
  
  await rewardSystem.clearData();
  await chrome.storage.local.remove('ad_data_cache');
  
  // Reset to defaults
  const defaultSettings: StorageData = {
    enabled: true,
    point_balance: 0,
    daily_stats: {},
    submitted_ads: {},
    achievements: {}
  };
  
  await chrome.storage.local.set(defaultSettings);
  
  return { success: true };
}

/**
 * Show achievement notification
 * @param achievement - Achievement data
 */
function showAchievementNotification(achievement: { title: string; points: number }): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/assets/icon128.png',
    title: 'Achievement Unlocked!',
    message: `${achievement.title} - Earned ${achievement.points} points!`,
    priority: 2
  });
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener(() => {
  // Open popup when icon is clicked
  chrome.action.openPopup();
});

/**
 * Handle alarms for periodic tasks
 */
chrome.alarms.create('daily_reset', {
  when: getNextMidnight(),
  periodInMinutes: 24 * 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'daily_reset') {
    handleDailyReset();
  }
});

/**
 * Get next midnight timestamp
 * @returns Timestamp
 */
function getNextMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

/**
 * Handle daily reset tasks
 */
async function handleDailyReset(): Promise<void> {
  console.log('Performing daily reset tasks');
  
  // Clean up old ad cache
  const adCache = await chrome.storage.local.get('ad_data_cache');
  if (adCache.ad_data_cache && adCache.ad_data_cache.length > 0) {
    // Keep only last 7 days of ads
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filteredAds = adCache.ad_data_cache.filter((ad: AdData) => 
      new Date(ad.timestamp).getTime() > sevenDaysAgo
    );
    await chrome.storage.local.set({ ad_data_cache: filteredAds });
  }
}