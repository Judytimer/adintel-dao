/**
 * Reward System Module
 * Manages user points and achievements for contributing ad data
 */

import type {
  AdData,
  Achievement,
  AchievementMap,
  DailyStats,
  TotalStats,
  UserStats,
  SubmissionResult,
  ExportData,
  StorageData
} from '../types';

interface RewardSystemStorage {
  get(keys: string | string[]): Promise<any>;
  set(items: Record<string, any>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export class RewardSystem {
  private storage: RewardSystemStorage;
  private readonly DAILY_LIMIT = 50;
  private readonly BASE_POINTS = 10;
  private readonly RARE_PLATFORM_BONUS = 10;
  
  // Achievement thresholds
  private readonly ACHIEVEMENTS: AchievementMap = {
    first_ad: { threshold: 1, title: 'First Ad Detected', points: 50 },
    ad_hunter: { threshold: 100, title: 'Ad Hunter', points: 100 },
    ad_expert: { threshold: 500, title: 'Ad Expert', points: 250 },
    ad_master: { threshold: 1000, title: 'Ad Master', points: 500 },
    week_streak: { threshold: 7, title: '7-Day Streak', points: 200 },
    month_streak: { threshold: 30, title: '30-Day Streak', points: 1000 }
  };

  /**
   * Create a reward system
   * @param storage - Storage interface (chrome.storage.local or compatible)
   */
  constructor(storage?: RewardSystemStorage) {
    this.storage = storage || (typeof chrome !== 'undefined' ? chrome.storage.local : null as any);
    
    if (!this.storage) {
      throw new Error('Storage interface is required');
    }
  }

  /**
   * Calculate points for an ad contribution
   * @param adData - Ad metadata
   * @returns Points earned
   */
  async calculatePoints(adData: AdData): Promise<number> {
    // Check if duplicate
    const isDuplicate = await this.isDuplicateAd(adData.id);
    if (isDuplicate) return 0;

    let points = this.BASE_POINTS;

    // Bonus for rare platforms
    const rarePlatforms: AdData['platform'][] = ['linkedin', 'twitter'];
    if (rarePlatforms.includes(adData.platform)) {
      points += this.RARE_PLATFORM_BONUS;
    }

    // Bonus for video ads (harder to detect)
    if (adData.type === 'video') {
      points += 5;
    }

    // Bonus for detailed metadata
    if (adData.textFeatures && adData.textFeatures.industry !== 'other') {
      points += 3;
    }

    return points;
  }

  /**
   * Submit an ad and earn points
   * @param adData - Ad metadata
   * @returns Submission result
   */
  async submitAd(adData: AdData): Promise<SubmissionResult> {
    // Check daily limit
    const canSubmit = await this.canSubmitAd();
    if (!canSubmit) {
      const submitted = await this.getTodaySubmissions();
      return { 
        success: false, 
        reason: 'daily_limit_reached',
        dailyLimit: this.DAILY_LIMIT,
        submitted
      };
    }

    // Calculate points
    const points = await this.calculatePoints(adData);
    if (points === 0) {
      return { 
        success: false, 
        reason: 'duplicate_ad',
        adId: adData.id
      };
    }

    // Record submission
    await this.recordAdSubmission(adData);
    
    // Add points
    await this.addPoints(points);

    // Check for achievements
    const newAchievements = await this.checkAchievements();

    return { 
      success: true, 
      points,
      totalBalance: await this.getBalance(),
      newAchievements
    };
  }

  /**
   * Check if user can submit more ads today
   * @returns Can submit
   */
  async canSubmitAd(): Promise<boolean> {
    const todaySubmissions = await this.getTodaySubmissions();
    return todaySubmissions < this.DAILY_LIMIT;
  }

  /**
   * Get today's submission count
   * @returns Submission count
   */
  async getTodaySubmissions(): Promise<number> {
    const today = this.getTodayKey();
    const dailyStats = await this.getFromStorage<Record<string, DailyStats>>('daily_stats') || {};
    return dailyStats[today]?.adsSubmitted || 0;
  }

  /**
   * Check if ad is duplicate
   * @param adId - Ad ID
   * @returns Is duplicate
   */
  async isDuplicateAd(adId: string): Promise<boolean> {
    const submittedAds = await this.getFromStorage<Record<string, boolean>>('submitted_ads') || {};
    return submittedAds[adId] === true;
  }

  /**
   * Record ad submission
   * @param adData - Ad metadata
   */
  async recordAdSubmission(adData: AdData): Promise<void> {
    // Mark as submitted
    const submittedAds = await this.getFromStorage<Record<string, boolean>>('submitted_ads') || {};
    submittedAds[adData.id] = true;
    await this.setInStorage('submitted_ads', submittedAds);

    // Update daily stats
    const today = this.getTodayKey();
    const dailyStats = await this.getFromStorage<Record<string, DailyStats>>('daily_stats') || {};
    
    if (!dailyStats[today]) {
      dailyStats[today] = { adsSubmitted: 0, pointsEarned: 0 };
    }
    
    dailyStats[today].adsSubmitted++;
    await this.setInStorage('daily_stats', dailyStats);

    // Update total stats
    const totalStats = await this.getFromStorage<TotalStats>('total_stats') || {
      totalAds: 0,
      totalPoints: 0,
      startDate: new Date().toISOString()
    };
    
    totalStats.totalAds++;
    await this.setInStorage('total_stats', totalStats);
  }

  /**
   * Add points to user balance
   * @param points - Points to add
   */
  async addPoints(points: number): Promise<void> {
    const balance = await this.getBalance();
    const newBalance = balance + points;
    await this.setInStorage('point_balance', newBalance);

    // Update daily points
    const today = this.getTodayKey();
    const dailyStats = await this.getFromStorage<Record<string, DailyStats>>('daily_stats') || {};
    
    if (!dailyStats[today]) {
      dailyStats[today] = { adsSubmitted: 0, pointsEarned: 0 };
    }
    
    dailyStats[today].pointsEarned += points;
    await this.setInStorage('daily_stats', dailyStats);

    // Update total points
    const totalStats = await this.getFromStorage<TotalStats>('total_stats') || {
      totalAds: 0,
      totalPoints: 0,
      startDate: new Date().toISOString()
    };
    totalStats.totalPoints = (totalStats.totalPoints || 0) + points;
    await this.setInStorage('total_stats', totalStats);
  }

  /**
   * Get current point balance
   * @returns Point balance
   */
  async getBalance(): Promise<number> {
    return await this.getFromStorage<number>('point_balance') || 0;
  }

  /**
   * Get user statistics
   * @returns User stats
   */
  async getStats(): Promise<UserStats> {
    const [balance, dailyStats, totalStats, achievements, streak] = await Promise.all([
      this.getBalance(),
      this.getFromStorage<Record<string, DailyStats>>('daily_stats') || {},
      this.getFromStorage<TotalStats>('total_stats') || {
        totalAds: 0,
        totalPoints: 0,
        startDate: new Date().toISOString()
      },
      this.getFromStorage<AchievementMap>('achievements') || {},
      this.getCurrentStreak()
    ]);

    const today = this.getTodayKey();
    const todayStats = dailyStats[today] || { adsSubmitted: 0, pointsEarned: 0 };

    return {
      balance,
      today: {
        adsSubmitted: todayStats.adsSubmitted,
        pointsEarned: todayStats.pointsEarned,
        remaining: this.DAILY_LIMIT - todayStats.adsSubmitted
      },
      total: {
        adsSubmitted: totalStats.totalAds || 0,
        pointsEarned: totalStats.totalPoints || 0,
        startDate: totalStats.startDate
      },
      achievements: Object.keys(achievements).length,
      currentStreak: streak,
      dailyStats
    };
  }

  /**
   * Check and unlock achievements
   * @returns Newly unlocked achievements
   */
  async checkAchievements(): Promise<Achievement[]> {
    const achievements = await this.getFromStorage<AchievementMap>('achievements') || {};
    const totalStats = await this.getFromStorage<TotalStats>('total_stats') || {
      totalAds: 0,
      totalPoints: 0,
      startDate: new Date().toISOString()
    };
    const newAchievements: Achievement[] = [];

    // Check ad count achievements
    const adCount = totalStats.totalAds || 0;
    
    for (const [key, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      if (!achievements[key]) {
        let shouldUnlock = false;
        
        // Check different achievement types
        if (key === 'first_ad' && adCount >= 1) {
          shouldUnlock = true;
        } else if (key.includes('ad_') && adCount >= achievement.threshold) {
          shouldUnlock = true;
        } else if (key.includes('streak')) {
          const streak = await this.getCurrentStreak();
          if (streak >= achievement.threshold) {
            shouldUnlock = true;
          }
        }
        
        if (shouldUnlock) {
          achievements[key] = {
            ...achievement,
            unlocked: true,
            unlockedAt: new Date().toISOString()
          };
          newAchievements.push(achievements[key]);
          await this.addPoints(achievement.points);
        }
      }
    }

    await this.setInStorage('achievements', achievements);
    return newAchievements;
  }

  /**
   * Get current streak
   * @returns Current streak in days
   */
  async getCurrentStreak(): Promise<number> {
    const dailyStats = await this.getFromStorage<Record<string, DailyStats>>('daily_stats') || {};
    const dates = Object.keys(dailyStats).sort().reverse();
    
    if (dates.length === 0) return 0;

    let streak = 0;
    const today = this.getTodayKey();
    
    // Check if user has submitted today
    if (!dailyStats[today] || dailyStats[today].adsSubmitted === 0) {
      // Check yesterday
      const yesterday = this.getDateKey(new Date(Date.now() - 86400000));
      if (!dailyStats[yesterday] || dailyStats[yesterday].adsSubmitted === 0) {
        return 0;
      }
    }

    // Count consecutive days
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      if (dailyStats[date].adsSubmitted > 0) {
        streak++;
        
        // Check if next date is consecutive
        if (i < dates.length - 1) {
          const currentDate = new Date(date);
          const nextDate = new Date(dates[i + 1]);
          const daysDiff = (currentDate.getTime() - nextDate.getTime()) / 86400000;
          
          if (daysDiff > 1) break;
        }
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get all achievements
   * @returns All achievements with status
   */
  async getAchievements(): Promise<AchievementMap> {
    const unlockedAchievements = await this.getFromStorage<AchievementMap>('achievements') || {};
    const allAchievements: AchievementMap = {};

    for (const [key, achievement] of Object.entries(this.ACHIEVEMENTS)) {
      allAchievements[key] = {
        ...achievement,
        unlocked: !!unlockedAchievements[key],
        unlockedAt: unlockedAchievements[key]?.unlockedAt
      };
    }

    return allAchievements;
  }

  /**
   * Export user data
   * @returns Exported data
   */
  async exportData(): Promise<ExportData> {
    const [balance, dailyStats, totalStats, achievements, submittedAds] = await Promise.all([
      this.getBalance(),
      this.getFromStorage<Record<string, DailyStats>>('daily_stats') || {},
      this.getFromStorage<TotalStats>('total_stats') || {
        totalAds: 0,
        totalPoints: 0,
        startDate: new Date().toISOString()
      },
      this.getFromStorage<AchievementMap>('achievements') || {},
      this.getFromStorage<Record<string, boolean>>('submitted_ads') || {}
    ]);

    return {
      exportDate: new Date().toISOString(),
      balance,
      stats: {
        daily: dailyStats,
        total: totalStats
      },
      achievements,
      adsCount: Object.keys(submittedAds).length
    };
  }

  /**
   * Clear all data (for testing or user request)
   */
  async clearData(): Promise<void> {
    const keys = [
      'point_balance',
      'daily_stats',
      'total_stats',
      'achievements',
      'submitted_ads'
    ];

    for (const key of keys) {
      await this.removeFromStorage(key);
    }
  }

  /**
   * Get today's date key
   * @returns Date key (YYYY-MM-DD)
   */
  private getTodayKey(): string {
    return this.getDateKey(new Date());
  }

  /**
   * Get date key for a specific date
   * @param date - Date object
   * @returns Date key (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Storage wrapper methods
   */
  private async getFromStorage<T>(key: string): Promise<T | null> {
    if (!this.storage) return null;
    
    return new Promise((resolve) => {
      this.storage.get(key, (result: any) => {
        resolve(result[key] as T);
      });
    });
  }

  private async setInStorage(key: string, value: any): Promise<void> {
    if (!this.storage) return;
    
    return new Promise((resolve) => {
      this.storage.set({ [key]: value }, () => resolve());
    });
  }

  private async removeFromStorage(key: string): Promise<void> {
    if (!this.storage) return;
    
    return new Promise((resolve) => {
      this.storage.remove(key, () => resolve());
    });
  }
}

export default RewardSystem;