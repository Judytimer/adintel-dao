/**
 * TDD Tests for User Reward System
 * Users earn points for contributing ad data
 */

describe('RewardSystem', () => {
  let rewardSystem;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new MockChromeStorage();
    rewardSystem = new RewardSystem(mockStorage);
  });

  describe('Point Calculation', () => {
    test('should award points for new ad contribution', async () => {
      const adData = {
        id: 'ad_123',
        platform: 'facebook',
        type: 'sponsored_post'
      };

      const points = await rewardSystem.calculatePoints(adData);
      
      expect(points).toBe(10); // Base points for new ad
    });

    test('should give bonus points for rare ads', async () => {
      const rareAdData = {
        id: 'ad_456',
        platform: 'linkedin',
        type: 'sponsored_inmail'
      };

      const points = await rewardSystem.calculatePoints(rareAdData);
      
      expect(points).toBe(20); // Bonus for rare platform
    });

    test('should not award points for duplicate ads', async () => {
      const adData = {
        id: 'ad_789',
        platform: 'facebook'
      };

      // First submission
      await rewardSystem.submitAd(adData);
      
      // Duplicate submission
      const points = await rewardSystem.calculatePoints(adData);
      
      expect(points).toBe(0); // No points for duplicates
    });
  });

  describe('User Balance', () => {
    test('should track user point balance', async () => {
      await rewardSystem.addPoints(50);
      await rewardSystem.addPoints(30);

      const balance = await rewardSystem.getBalance();
      
      expect(balance).toBe(80);
    });

    test('should persist balance in Chrome storage', async () => {
      await rewardSystem.addPoints(100);
      
      // Create new instance (simulating browser restart)
      const newRewardSystem = new RewardSystem(mockStorage);
      const balance = await newRewardSystem.getBalance();
      
      expect(balance).toBe(100);
    });
  });

  describe('Daily Limits', () => {
    test('should enforce daily contribution limit', async () => {
      // Submit 50 ads (daily limit)
      for (let i = 0; i < 60; i++) {
        await rewardSystem.submitAd({
          id: `ad_${i}`,
          platform: 'facebook'
        });
      }

      const stats = await rewardSystem.getDailyStats();
      
      expect(stats.adsSubmitted).toBe(50); // Capped at daily limit
      expect(stats.limitReached).toBe(true);
    });

    test('should reset daily limits at midnight', async () => {
      // Mock date to 11:59 PM
      const mockDate = new Date('2024-01-01T23:59:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      await rewardSystem.submitAd({ id: 'ad_1' });
      
      // Move to next day
      mockDate.setDate(mockDate.getDate() + 1);
      
      const canSubmit = await rewardSystem.canSubmitAd();
      expect(canSubmit).toBe(true);
    });
  });

  describe('Achievements', () => {
    test('should unlock achievements for milestones', async () => {
      // Submit 10 ads
      for (let i = 0; i < 10; i++) {
        await rewardSystem.submitAd({
          id: `ad_${i}`,
          platform: 'facebook'
        });
      }

      const achievements = await rewardSystem.getAchievements();
      
      expect(achievements).toContainEqual({
        id: 'first_10_ads',
        title: 'Getting Started',
        description: 'Contributed 10 ads',
        points: 50
      });
    });
  });
});

// Mock Chrome Storage API
class MockChromeStorage {
  constructor() {
    this.data = {};
  }

  async get(key) {
    return this.data[key] || null;
  }

  async set(key, value) {
    this.data[key] = value;
  }

  async clear() {
    this.data = {};
  }
}