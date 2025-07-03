/**
 * AdDetector unit tests
 */

import AdDetector from '@modules/AdDetector';
import type { AdData } from '@types/index';

describe('AdDetector', () => {
  let adDetector: AdDetector;
  let mockElement: HTMLElement;
  
  beforeEach(() => {
    adDetector = new AdDetector();
    mockElement = document.createElement('div');
  });
  
  describe('isAd', () => {
    it('should detect Facebook ads', () => {
      mockElement.innerText = 'Sponsored post content';
      expect(adDetector.isAd(mockElement)).toBe(true);
      
      mockElement.innerText = 'Regular content';
      mockElement.classList.add('sponsored-post');
      expect(adDetector.isAd(mockElement)).toBe(true);
    });
    
    it('should detect Google ads', () => {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://googlesyndication.com/ad';
      expect(adDetector.isAd(iframe)).toBe(true);
      
      mockElement.classList.add('adsbygoogle');
      expect(adDetector.isAd(mockElement)).toBe(true);
      
      mockElement.dataset.adClient = 'ca-pub-123456';
      expect(adDetector.isAd(mockElement)).toBe(true);
    });
    
    it('should detect generic ads', () => {
      mockElement.innerText = 'advertisement content';
      expect(adDetector.isAd(mockElement)).toBe(true);
      
      mockElement.className = 'banner-ad';
      expect(adDetector.isAd(mockElement)).toBe(true);
      
      mockElement.id = 'sponsor-content';
      expect(adDetector.isAd(mockElement)).toBe(true);
    });
    
    it('should not detect non-ads', () => {
      mockElement.innerText = 'Regular content';
      expect(adDetector.isAd(mockElement)).toBe(false);
      
      mockElement.className = 'article-content';
      expect(adDetector.isAd(mockElement)).toBe(false);
    });
  });
  
  describe('extractAdData', () => {
    beforeEach(() => {
      // Mock window location
      Object.defineProperty(window, 'location', {
        value: { hostname: 'facebook.com' },
        writable: true,
      });
      
      // Setup element properties
      mockElement.innerText = 'Sponsored: Buy now!';
      mockElement.classList.add('sponsored-post');
      Object.defineProperty(mockElement, 'offsetTop', { value: 100 });
      Object.defineProperty(mockElement, 'offsetLeft', { value: 50 });
      Object.defineProperty(mockElement, 'offsetWidth', { value: 300 });
      Object.defineProperty(mockElement, 'offsetHeight', { value: 250 });
    });
    
    it('should extract valid ad data', () => {
      const adData = adDetector.extractAdData(mockElement);
      
      expect(adData).toBeDefined();
      expect(adData).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(String),
        platform: 'facebook',
        type: 'sponsored',
        position: {
          top: expect.any(Number),
          left: expect.any(Number),
          viewportPosition: expect.any(String),
        },
        size: {
          width: 300,
          height: 250,
          category: 'large',
        },
        textFeatures: {
          wordCount: expect.any(Number),
          hasCallToAction: true,
          sentiment: expect.any(String),
          industry: expect.any(String),
        },
      });
    });
    
    it('should respect rate limiting', () => {
      // Extract 5 ads (the limit)
      for (let i = 0; i < 5; i++) {
        const element = document.createElement('div');
        element.innerText = `Ad ${i}`;
        element.classList.add('sponsored-post');
        expect(adDetector.extractAdData(element)).toBeDefined();
      }
      
      // 6th should be rate limited
      expect(adDetector.extractAdData(mockElement)).toBeNull();
    });
    
    it('should not extract duplicate ads', () => {
      const firstExtract = adDetector.extractAdData(mockElement);
      expect(firstExtract).toBeDefined();
      
      // Same element should return null
      const secondExtract = adDetector.extractAdData(mockElement);
      expect(secondExtract).toBeNull();
    });
  });
  
  describe('text analysis', () => {
    it('should detect call to action', () => {
      mockElement.innerText = 'Buy now and save!';
      const adData = adDetector.extractAdData(mockElement);
      expect(adData?.textFeatures.hasCallToAction).toBe(true);
      
      adDetector.clearCache();
      mockElement.innerText = 'This is just information';
      const adData2 = adDetector.extractAdData(mockElement);
      expect(adData2?.textFeatures.hasCallToAction).toBe(false);
    });
    
    it('should detect sentiment', () => {
      mockElement.innerText = 'Amazing product, best quality!';
      const adData = adDetector.extractAdData(mockElement);
      expect(adData?.textFeatures.sentiment).toBe('positive');
      
      adDetector.clearCache();
      mockElement.innerText = 'Terrible service, worst experience';
      const adData2 = adDetector.extractAdData(mockElement);
      expect(adData2?.textFeatures.sentiment).toBe('negative');
    });
    
    it('should detect industry', () => {
      mockElement.innerText = 'Cloud software solutions';
      const adData = adDetector.extractAdData(mockElement);
      expect(adData?.textFeatures.industry).toBe('technology');
      
      adDetector.clearCache();
      mockElement.innerText = 'Bank loans available';
      const adData2 = adDetector.extractAdData(mockElement);
      expect(adData2?.textFeatures.industry).toBe('finance');
    });
  });
  
  describe('getStats', () => {
    it('should return detection statistics', () => {
      const stats = adDetector.getStats();
      expect(stats).toEqual({
        enabled: true,
        processedAds: 0,
        rateLimitRemaining: 5,
      });
      
      // Process an ad
      mockElement.innerText = 'Sponsored';
      adDetector.extractAdData(mockElement);
      
      const stats2 = adDetector.getStats();
      expect(stats2).toEqual({
        enabled: true,
        processedAds: 1,
        rateLimitRemaining: 4,
      });
    });
  });
  
  describe('setEnabled', () => {
    it('should enable/disable detection', () => {
      expect(adDetector.getStats().enabled).toBe(true);
      
      adDetector.setEnabled(false);
      expect(adDetector.getStats().enabled).toBe(false);
      
      adDetector.setEnabled(true);
      expect(adDetector.getStats().enabled).toBe(true);
    });
  });
  
  describe('clearCache', () => {
    it('should clear processed ads cache', () => {
      mockElement.innerText = 'Sponsored';
      adDetector.extractAdData(mockElement);
      expect(adDetector.getStats().processedAds).toBe(1);
      
      adDetector.clearCache();
      expect(adDetector.getStats().processedAds).toBe(0);
      
      // Should be able to process same element again
      const adData = adDetector.extractAdData(mockElement);
      expect(adData).toBeDefined();
    });
  });
});