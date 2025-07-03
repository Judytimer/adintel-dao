/**
 * RewardSystem unit tests
 */

import RewardSystem from '@modules/RewardSystem';
import type { AdData, SubmissionResult } from '@types/index';

describe('RewardSystem', () => {
  let rewardSystem: RewardSystem;
  let mockStorage: any;
  let storageData: Record<string, any>;
  
  beforeEach(() => {
    // Mock storage
    storageData = {};
    mockStorage = {
      get: jest.fn((keys, callback) => {
        const result: any = {};
        if (typeof keys === 'string') {
          result[keys] = storageData[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = storageData[key];
          });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        Object.assign(storageData, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (typeof keys === 'string') {
          delete storageData[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => delete storageData[key]);
        }
        if (callback) callback();
        return Promise.resolve();
      }),
    };
    
    rewardSystem = new RewardSystem(mockStorage);
  });
  
  const createMockAdData = (overrides?: Partial<AdData>): AdData => ({
    id: 'ad123',
    timestamp: new Date().toISOString(),
    platform: 'facebook',
    type: 'display',
    position: { top: 100, left: 50, viewportPosition: 'top' },
    size: { width: 300, height: 250, category: 'medium' },
    textFeatures: {
      wordCount: 20,
      hasCallToAction: true,
      sentiment: 'positive',
      industry: 'technology',
    },
    ...overrides,
  });
  
  describe('calculatePoints', () => {
    it('should calculate base points', async () => {
      const adData = createMockAdData();
      const points = await rewardSystem.calculatePoints(adData);
      expect(points).toBe(13); // 10 base + 3 for detailed industry
    });
    
    it('should add bonus for rare platforms', async () => {
      const adData = createMockAdData({ platform: 'linkedin' });
      const points = await rewardSystem.calculatePoints(adData);
      expect(points).toBe(23); // 10 base + 10 rare + 3 industry
    });
    
    it('should add bonus for video ads', async () => {
      const adData = createMockAdData({ type: 'video' });
      const points = await rewardSystem.calculatePoints(adData);
      expect(points).toBe(18); // 10 base + 5 video + 3 industry
    });
    
    it('should return 0 for duplicate ads', async () => {
      const adData = createMockAdData();
      storageData.submitted_ads = { [adData.id]: true };
      
      const points = await rewardSystem.calculatePoints(adData);
      expect(points).toBe(0);
    });
  });
  
  describe('submitAd', () => {
    it('should successfully submit new ad', async () => {
      const adData = createMockAdData();
      const result = await rewardSystem.submitAd(adData);
      
      expect(result).toMatchObject({
        success: true,
        points: expect.any(Number),
        totalBalance: expect.any(Number),
        newAchievements: expect.any(Array),
      });
      
      // Check storage was updated
      expect(storageData.submitted_ads).toHaveProperty(adData.id, true);
      expect(storageData.point_balance).toBeGreaterThan(0);
    });
    
    it('should reject duplicate ads', async () => {
      const adData = createMockAdData();
      
      // Submit first time
      await rewardSystem.submitAd(adData);
      
      // Submit again
      const result = await rewardSystem.submitAd(adData);
      expect(result).toMatchObject({
        success: false,
        reason: 'duplicate_ad',
        adId: adData.id,
      });
    });
    
    it('should enforce daily limit', async () => {
      // Set up daily stats at limit
      const today = new Date().toISOString().split('T')[0];
      storageData.daily_stats = {
        [today]: { adsSubmitted: 50, pointsEarned: 500 },
      };
      
      const adData = createMockAdData();
      const result = await rewardSystem.submitAd(adData);
      
      expect(result).toMatchObject({
        success: false,
        reason: 'daily_limit_reached',
        dailyLimit: 50,
        submitted: 50,
      });
    });
    
    it('should unlock first ad achievement', async () => {
      const adData = createMockAdData();
      const result = await rewardSystem.submitAd(adData);
      
      expect(result.newAchievements).toHaveLength(1);
      expect(result.newAchievements![0]).toMatchObject({
        title: 'First Ad Detected',
        points: 50,
      });
      
      // Achievement points should be added
      expect(storageData.point_balance).toBeGreaterThan(50);
    });
  });
  
  describe('getStats', () => {
    it('should return complete user stats', async () => {
      // Set up some data
      storageData.point_balance = 1000;
      const today = new Date().toISOString().split('T')[0];
      storageData.daily_stats = {
        [today]: { adsSubmitted: 10, pointsEarned: 150 },
      };
      storageData.total_stats = {
        totalAds: 100,
        totalPoints: 1500,
        startDate: '2024-01-01',
      };
      storageData.achievements = {
        first_ad: { unlocked: true },
        ad_hunter: { unlocked: true },
      };
      
      const stats = await rewardSystem.getStats();
      
      expect(stats).toMatchObject({
        balance: 1000,
        today: {
          adsSubmitted: 10,
          pointsEarned: 150,
          remaining: 40,
        },
        total: {
          adsSubmitted: 100,
          pointsEarned: 1500,
          startDate: '2024-01-01',
        },
        achievements: 2,
        currentStreak: expect.any(Number),
      });
    });
  });
  
  describe('getCurrentStreak', () => {
    it('should calculate consecutive days correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
      
      storageData.daily_stats = {
        [today.toISOString().split('T')[0]]: { adsSubmitted: 5, pointsEarned: 50 },
        [yesterday.toISOString().split('T')[0]]: { adsSubmitted: 3, pointsEarned: 30 },
        [twoDaysAgo.toISOString().split('T')[0]]: { adsSubmitted: 4, pointsEarned: 40 },
      };
      
      const stats = await rewardSystem.getStats();
      expect(stats.currentStreak).toBe(3);
    });
    
    it('should return 0 for no activity', async () => {
      const stats = await rewardSystem.getStats();
      expect(stats.currentStreak).toBe(0);
    });
    
    it('should break streak on missed day', async () => {
      const today = new Date();
      const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
      
      storageData.daily_stats = {
        [today.toISOString().split('T')[0]]: { adsSubmitted: 5, pointsEarned: 50 },
        // Yesterday is missing
        [twoDaysAgo.toISOString().split('T')[0]]: { adsSubmitted: 4, pointsEarned: 40 },
      };
      
      const stats = await rewardSystem.getStats();
      expect(stats.currentStreak).toBe(1);
    });
  });
  
  describe('exportData', () => {
    it('should export all user data', async () => {
      // Set up some data
      storageData.point_balance = 500;
      storageData.daily_stats = { '2024-01-01': { adsSubmitted: 5, pointsEarned: 50 } };
      storageData.total_stats = { totalAds: 50, totalPoints: 500 };
      storageData.achievements = { first_ad: { unlocked: true } };
      storageData.submitted_ads = { ad1: true, ad2: true, ad3: true };
      
      const exportData = await rewardSystem.exportData();
      
      expect(exportData).toMatchObject({
        exportDate: expect.any(String),
        balance: 500,
        stats: {
          daily: expect.any(Object),
          total: expect.any(Object),
        },
        achievements: expect.any(Object),
        adsCount: 3,
      });
    });
  });
  
  describe('clearData', () => {
    it('should clear all user data', async () => {
      // Set up some data
      storageData.point_balance = 500;
      storageData.daily_stats = { '2024-01-01': { adsSubmitted: 5, pointsEarned: 50 } };
      storageData.total_stats = { totalAds: 50, totalPoints: 500 };
      storageData.achievements = { first_ad: { unlocked: true } };
      storageData.submitted_ads = { ad1: true, ad2: true };
      
      await rewardSystem.clearData();
      
      expect(storageData.point_balance).toBeUndefined();
      expect(storageData.daily_stats).toBeUndefined();
      expect(storageData.total_stats).toBeUndefined();
      expect(storageData.achievements).toBeUndefined();
      expect(storageData.submitted_ads).toBeUndefined();
    });
  });
});