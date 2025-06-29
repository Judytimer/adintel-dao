/**
 * Background Service Worker
 * Handles ad data storage and reward calculations
 */

// Initialize reward system
let rewardSystem;

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('AdIntel DAO Extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    point_balance: 0,
    daily_stats: {},
    submitted_ads: {},
    achievements: []
  });
});

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AD_DETECTED') {
    handleAdDetection(request.data).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'GET_STATS') {
    getStats().then(sendResponse);
    return true;
  }
});

/**
 * Handle detected ad
 */
async function handleAdDetection(adData) {
  try {
    // Initialize reward system if needed
    if (!rewardSystem) {
      rewardSystem = new RewardSystem(chrome.storage.local);
    }

    // Validate ad data
    if (!validateAdData(adData)) {
      return { success: false, reason: 'invalid_data' };
    }

    // Submit ad and calculate rewards
    const result = await rewardSystem.submitAd(adData);
    
    if (result.success) {
      // Store ad data locally (for now)
      await storeAdData(adData);
      
      // TODO: Send to backend API when ready
      // await sendToBackend(adData);
      
      return { success: true, points: result.points };
    }
    
    return result;
  } catch (error) {
    console.error('Error handling ad:', error);
    return { success: false, reason: 'error' };
  }
}

/**
 * Validate ad data
 */
function validateAdData(adData) {
  // Check required fields
  if (!adData.id || !adData.platform || !adData.type) {
    return false;
  }
  
  // Check data size (prevent abuse)
  const dataSize = JSON.stringify(adData).length;
  if (dataSize > 5000) { // 5KB limit per ad
    return false;
  }
  
  return true;
}

/**
 * Store ad data locally
 */
async function storeAdData(adData) {
  // Get existing ads
  const result = await chrome.storage.local.get('collected_ads');
  const collectedAds = result.collected_ads || [];
  
  // Add new ad (keep last 100 for space)
  collectedAds.push(adData);
  if (collectedAds.length > 100) {
    collectedAds.shift();
  }
  
  await chrome.storage.local.set({ collected_ads: collectedAds });
}

/**
 * Get user statistics
 */
async function getStats() {
  if (!rewardSystem) {
    rewardSystem = new RewardSystem(chrome.storage.local);
  }
  
  const balance = await rewardSystem.getBalance();
  const dailyStats = await rewardSystem.getDailyStats();
  const achievements = await rewardSystem.getAchievements();
  const lifetimeStats = await rewardSystem.getLifetimeStats();
  
  return {
    balance,
    today: dailyStats,
    lifetime: lifetimeStats,
    achievements
  };
}

/**
 * RewardSystem class (copied for service worker)
 */
class RewardSystem {
  constructor(storage) {
    this.storage = storage;
    this.DAILY_LIMIT = 50;
    this.BASE_POINTS = 10;
    this.RARE_PLATFORM_BONUS = 10;
  }

  async calculatePoints(adData) {
    const isDuplicate = await this.isDuplicateAd(adData.id);
    if (isDuplicate) return 0;

    let points = this.BASE_POINTS;
    
    const rarePlatforms = ['linkedin', 'twitter', 'reddit'];
    if (rarePlatforms.includes(adData.platform)) {
      points += this.RARE_PLATFORM_BONUS;
    }
    
    if (adData.type === 'video_ad') {
      points += 5;
    }

    return points;
  }

  async submitAd(adData) {
    const canSubmit = await this.canSubmitAd();
    if (!canSubmit) return { success: false, reason: 'daily_limit_reached' };

    const points = await this.calculatePoints(adData);
    if (points === 0) return { success: false, reason: 'duplicate_ad' };

    await this.recordAdSubmission(adData);
    await this.addPoints(points);
    await this.checkAchievements();

    return { success: true, points };
  }

  async isDuplicateAd(adId) {
    const result = await this.storage.get('submitted_ads');
    const submittedAds = result.submitted_ads || {};
    return submittedAds[adId] === true;
  }

  async recordAdSubmission(adData) {
    const result = await this.storage.get(['submitted_ads', 'daily_stats']);
    const submittedAds = result.submitted_ads || {};
    const dailyStats = result.daily_stats || {};
    
    submittedAds[adData.id] = true;
    
    const today = this.getTodayKey();
    if (!dailyStats[today]) {
      dailyStats[today] = { adsSubmitted: 0, pointsEarned: 0 };
    }
    dailyStats[today].adsSubmitted++;
    
    await this.storage.set({ submitted_ads: submittedAds, daily_stats: dailyStats });
  }

  async addPoints(points) {
    const result = await this.storage.get(['point_balance', 'daily_stats']);
    const balance = result.point_balance || 0;
    const dailyStats = result.daily_stats || {};
    
    const newBalance = balance + points;
    
    const today = this.getTodayKey();
    if (dailyStats[today]) {
      dailyStats[today].pointsEarned += points;
    }
    
    await this.storage.set({ point_balance: newBalance, daily_stats: dailyStats });
  }

  async getBalance() {
    const result = await this.storage.get('point_balance');
    return result.point_balance || 0;
  }

  async canSubmitAd() {
    const stats = await this.getDailyStats();
    return stats.adsSubmitted < this.DAILY_LIMIT;
  }

  async getDailyStats() {
    const today = this.getTodayKey();
    const result = await this.storage.get('daily_stats');
    const dailyStats = result.daily_stats || {};
    
    if (!dailyStats[today]) {
      return { adsSubmitted: 0, pointsEarned: 0, limitReached: false };
    }

    const stats = dailyStats[today];
    stats.limitReached = stats.adsSubmitted >= this.DAILY_LIMIT;
    return stats;
  }

  getTodayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  async checkAchievements() {
    const result = await this.storage.get('achievements');
    const achievements = result.achievements || [];
    const stats = await this.getLifetimeStats();

    if (stats.totalAds >= 10 && !this.hasAchievement(achievements, 'first_10_ads')) {
      const achievement = {
        id: 'first_10_ads',
        title: 'Getting Started',
        description: 'Contributed 10 ads',
        points: 50,
        unlockedAt: new Date().toISOString()
      };
      achievements.push(achievement);
      await this.addPoints(achievement.points);
      await this.storage.set({ achievements });
    }
  }

  async getLifetimeStats() {
    const result = await this.storage.get('daily_stats');
    const dailyStats = result.daily_stats || {};
    let totalAds = 0;
    let totalPoints = 0;

    Object.values(dailyStats).forEach(day => {
      totalAds += day.adsSubmitted || 0;
      totalPoints += day.pointsEarned || 0;
    });

    return { totalAds, totalPoints };
  }

  hasAchievement(achievements, achievementId) {
    return achievements.some(a => a.id === achievementId);
  }

  async getAchievements() {
    const result = await this.storage.get('achievements');
    return result.achievements || [];
  }
}