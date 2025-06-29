/**
 * Reward System Module
 * Manages user points and achievements for contributing ad data
 */

class RewardSystem {
  constructor(storage) {
    this.storage = storage || chrome.storage.local;
    this.DAILY_LIMIT = 50;
    this.BASE_POINTS = 10;
    this.RARE_PLATFORM_BONUS = 10;
  }

  /**
   * Calculate points for an ad contribution
   */
  async calculatePoints(adData) {
    // Check if duplicate
    const isDuplicate = await this.isDuplicateAd(adData.id);
    if (isDuplicate) return 0;

    let points = this.BASE_POINTS;

    // Bonus for rare platforms
    const rarePlatforms = ['linkedin', 'twitter', 'reddit'];
    if (rarePlatforms.includes(adData.platform)) {
      points += this.RARE_PLATFORM_BONUS;
    }

    // Bonus for video ads (harder to detect)
    if (adData.type === 'video_ad') {
      points += 5;
    }

    return points;
  }

  /**
   * Submit an ad and earn points
   */
  async submitAd(adData) {
    // Check daily limit
    const canSubmit = await this.canSubmitAd();
    if (!canSubmit) return { success: false, reason: 'daily_limit_reached' };

    // Calculate points
    const points = await this.calculatePoints(adData);
    if (points === 0) return { success: false, reason: 'duplicate_ad' };

    // Record submission
    await this.recordAdSubmission(adData);
    
    // Add points
    await this.addPoints(points);

    // Check for achievements
    await this.checkAchievements();

    return { success: true, points };
  }

  /**
   * Check if ad is duplicate
   */
  async isDuplicateAd(adId) {
    const submittedAds = await this.storage.get('submitted_ads') || {};
    return submittedAds[adId] === true;
  }

  /**
   * Record ad submission
   */
  async recordAdSubmission(adData) {
    // Mark as submitted
    const submittedAds = await this.storage.get('submitted_ads') || {};
    submittedAds[adData.id] = true;
    await this.storage.set('submitted_ads', submittedAds);

    // Update daily stats
    const today = this.getTodayKey();
    const dailyStats = await this.storage.get('daily_stats') || {};
    
    if (!dailyStats[today]) {
      dailyStats[today] = { adsSubmitted: 0, pointsEarned: 0 };
    }
    
    dailyStats[today].adsSubmitted++;
    await this.storage.set('daily_stats', dailyStats);
  }

  /**
   * Add points to user balance
   */
  async addPoints(points) {
    const balance = await this.getBalance();
    const newBalance = balance + points;
    await this.storage.set('point_balance', newBalance);

    // Update daily points
    const today = this.getTodayKey();
    const dailyStats = await this.storage.get('daily_stats') || {};
    if (dailyStats[today]) {
      dailyStats[today].pointsEarned += points;
      await this.storage.set('daily_stats', dailyStats);
    }
  }

  /**
   * Get current point balance
   */
  async getBalance() {
    const balance = await this.storage.get('point_balance');
    return balance || 0;
  }

  /**
   * Check if user can submit more ads today
   */
  async canSubmitAd() {
    const stats = await this.getDailyStats();
    return stats.adsSubmitted < this.DAILY_LIMIT;
  }

  /**
   * Get today's statistics
   */
  async getDailyStats() {
    const today = this.getTodayKey();
    const dailyStats = await this.storage.get('daily_stats') || {};
    
    if (!dailyStats[today]) {
      return { adsSubmitted: 0, pointsEarned: 0, limitReached: false };
    }

    const stats = dailyStats[today];
    stats.limitReached = stats.adsSubmitted >= this.DAILY_LIMIT;
    return stats;
  }

  /**
   * Get date key for today
   */
  getTodayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  /**
   * Check and unlock achievements
   */
  async checkAchievements() {
    const achievements = await this.storage.get('achievements') || [];
    const stats = await this.getLifetimeStats();

    // First 10 ads achievement
    if (stats.totalAds >= 10 && !this.hasAchievement(achievements, 'first_10_ads')) {
      const achievement = {
        id: 'first_10_ads',
        title: 'Getting Started',
        description: 'Contributed 10 ads',
        points: 50,
        unlockedAt: new Date()
      };
      achievements.push(achievement);
      await this.addPoints(achievement.points);
    }

    // First 100 ads achievement
    if (stats.totalAds >= 100 && !this.hasAchievement(achievements, 'ad_hunter')) {
      const achievement = {
        id: 'ad_hunter',
        title: 'Ad Hunter',
        description: 'Contributed 100 ads',
        points: 200,
        unlockedAt: new Date()
      };
      achievements.push(achievement);
      await this.addPoints(achievement.points);
    }

    // Week streak achievement
    if (stats.currentStreak >= 7 && !this.hasAchievement(achievements, 'week_streak')) {
      const achievement = {
        id: 'week_streak',
        title: 'Dedicated Contributor',
        description: '7 day contribution streak',
        points: 100,
        unlockedAt: new Date()
      };
      achievements.push(achievement);
      await this.addPoints(achievement.points);
    }

    await this.storage.set('achievements', achievements);
  }

  /**
   * Get lifetime statistics
   */
  async getLifetimeStats() {
    const dailyStats = await this.storage.get('daily_stats') || {};
    let totalAds = 0;
    let totalPoints = 0;
    let currentStreak = 0;
    let lastDate = null;

    // Sort dates
    const dates = Object.keys(dailyStats).sort();

    dates.forEach(date => {
      totalAds += dailyStats[date].adsSubmitted;
      totalPoints += dailyStats[date].pointsEarned;

      // Calculate streak
      if (lastDate) {
        const last = new Date(lastDate);
        const current = new Date(date);
        const diffDays = Math.floor((current - last) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      lastDate = date;
    });

    return { totalAds, totalPoints, currentStreak };
  }

  /**
   * Check if user has achievement
   */
  hasAchievement(achievements, achievementId) {
    return achievements.some(a => a.id === achievementId);
  }

  /**
   * Get all achievements
   */
  async getAchievements() {
    return await this.storage.get('achievements') || [];
  }

  /**
   * Export data for user (privacy compliance)
   */
  async exportUserData() {
    const data = {
      balance: await this.getBalance(),
      achievements: await this.getAchievements(),
      dailyStats: await this.storage.get('daily_stats') || {},
      lifetimeStats: await this.getLifetimeStats()
    };
    return data;
  }

  /**
   * Clear all user data (privacy compliance)
   */
  async clearUserData() {
    await this.storage.clear();
  }
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RewardSystem;
}