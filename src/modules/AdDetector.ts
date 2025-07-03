/**
 * Ad Detection Module
 * Detects and extracts metadata from ads while respecting privacy
 */

import RateLimiter from './RateLimiter';
import type { 
  Platform, 
  AdType, 
  AdData, 
  AdPosition, 
  AdSize, 
  TextFeatures, 
  ViewportPosition, 
  SizeCategory,
  Sentiment,
  Industry 
} from '../types';

export class AdDetector {
  private enabled: boolean;
  private processedAds: Set<string>;
  private rateLimiter: RateLimiter;

  constructor() {
    this.enabled = true;
    this.processedAds = new Set();
    this.rateLimiter = new RateLimiter(5, 60000); // 5 ads per minute
  }

  /**
   * Check if an element is an advertisement
   * @param element - DOM element to check
   * @returns True if element is an ad
   */
  isAd(element: HTMLElement): boolean {
    if (!element) return false;

    // Facebook ads
    if (this.isFacebookAd(element)) return true;
    
    // Google ads
    if (this.isGoogleAd(element)) return true;
    
    // Generic ad patterns
    if (this.isGenericAd(element)) return true;

    return false;
  }

  /**
   * Check if element is a Facebook ad
   * @param element - DOM element to check
   * @returns True if Facebook ad
   */
  private isFacebookAd(element: HTMLElement): boolean {
    // Check for sponsored label
    const sponsoredLabels = ['Sponsored', 'Реклама', 'Publicité', 'Patrocinado', 'Gesponsert'];
    const text = element.innerText || '';
    
    if (sponsoredLabels.some(label => text.includes(label))) {
      return true;
    }

    // Check for Facebook ad classes
    const adClasses = ['sponsored-post', 'ego_unit', 'pagelet_ego_pane'];
    if (element.classList && adClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }

    return false;
  }

  /**
   * Check if element is a Google ad
   * @param element - DOM element to check
   * @returns True if Google ad
   */
  private isGoogleAd(element: HTMLElement): boolean {
    // Check for Google ad iframes
    if (element.tagName === 'IFRAME' && 
        element instanceof HTMLIFrameElement && 
        element.src && 
        element.src.includes('googlesyndication.com')) {
      return true;
    }

    // Check for Google ad classes
    const googleAdClasses = ['google-ad', 'adsbygoogle', 'googleads'];
    if (element.classList && googleAdClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }

    // Check for data attributes
    if (element.dataset && element.dataset.adClient) {
      return true;
    }

    return false;
  }

  /**
   * Check for generic ad patterns
   * @param element - DOM element to check
   * @returns True if generic ad
   */
  private isGenericAd(element: HTMLElement): boolean {
    const adKeywords = [
      'advertisement', 'publicité', 'anuncio', 'реклама',
      'sponsored', 'promoted', 'partner content'
    ];
    
    const text = (element.innerText || '').toLowerCase();
    const className = (element.className || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    
    // Check text content
    if (adKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }
    
    // Check class names
    if (className.match(/\b(ad|ads|banner|sponsor)\b/)) {
      return true;
    }
    
    // Check IDs
    if (id.match(/\b(ad|ads|banner|sponsor)\b/)) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract metadata from an ad element
   * @param element - Ad element
   * @returns Ad metadata (privacy-safe) or null
   */
  extractAdData(element: HTMLElement): AdData | null {
    if (!this.rateLimiter.canMakeRequest()) {
      console.log('Rate limit reached for ad detection');
      return null;
    }

    // Generate unique ID for this ad
    const adId = this.generateAdId(element);
    
    // Skip if already processed
    if (this.processedAds.has(adId)) {
      return null;
    }

    this.processedAds.add(adId);

    // Extract privacy-safe metadata
    const metadata: AdData = {
      id: adId,
      timestamp: new Date().toISOString(),
      platform: this.detectPlatform(),
      type: this.detectAdType(element),
      position: this.getElementPosition(element),
      size: this.getElementSize(element),
      // Privacy-safe text analysis
      textFeatures: this.extractTextFeatures(element),
      // No personal data, URLs, or identifiers
    };

    return metadata;
  }

  /**
   * Generate unique ID for an ad
   * @param element - Ad element
   * @returns Unique ID
   */
  private generateAdId(element: HTMLElement): string {
    const text = element.innerText || '';
    const position = `${element.offsetTop}-${element.offsetLeft}`;
    const size = `${element.offsetWidth}x${element.offsetHeight}`;
    
    // Create hash from ad characteristics
    const hashInput = `${text.substring(0, 100)}-${position}-${size}`;
    return this.simpleHash(hashInput);
  }

  /**
   * Simple hash function
   * @param str - Input string
   * @returns Hash
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Detect current platform
   * @returns Platform name
   */
  private detectPlatform(): Platform {
    const hostname = window.location.hostname;
    
    if (hostname.includes('facebook.com')) return 'facebook';
    if (hostname.includes('google.com')) return 'google';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    
    return 'other';
  }

  /**
   * Detect ad type
   * @param element - Ad element
   * @returns Ad type
   */
  private detectAdType(element: HTMLElement): AdType {
    const text = (element.innerText || '').toLowerCase();
    
    if (element.tagName === 'VIDEO' || element.querySelector('video')) {
      return 'video';
    }
    
    if (element.querySelector('img') || element.tagName === 'IMG') {
      return 'image';
    }
    
    if (text.includes('sponsored') || text.includes('promoted')) {
      return 'sponsored';
    }
    
    return 'display';
  }

  /**
   * Get element position (privacy-safe)
   * @param element - Element
   * @returns Position data
   */
  private getElementPosition(element: HTMLElement): AdPosition {
    const rect = element.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      viewportPosition: this.getViewportPosition(rect)
    };
  }

  /**
   * Get viewport position
   * @param rect - Element rectangle
   * @returns Position description
   */
  private getViewportPosition(rect: DOMRect): ViewportPosition {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    if (rect.top < viewportHeight / 3) return 'top';
    if (rect.top > viewportHeight * 2 / 3) return 'bottom';
    if (rect.left < viewportWidth / 3) return 'left';
    if (rect.left > viewportWidth * 2 / 3) return 'right';
    
    return 'center';
  }

  /**
   * Get element size
   * @param element - Element
   * @returns Size data
   */
  private getElementSize(element: HTMLElement): AdSize {
    return {
      width: element.offsetWidth,
      height: element.offsetHeight,
      category: this.getSizeCategory(element.offsetWidth, element.offsetHeight)
    };
  }

  /**
   * Get size category
   * @param width - Width
   * @param height - Height
   * @returns Size category
   */
  private getSizeCategory(width: number, height: number): SizeCategory {
    const area = width * height;
    
    if (area < 10000) return 'small';
    if (area < 50000) return 'medium';
    if (area < 200000) return 'large';
    
    return 'extra-large';
  }

  /**
   * Extract text features (privacy-safe)
   * @param element - Element
   * @returns Text features
   */
  private extractTextFeatures(element: HTMLElement): TextFeatures {
    const text = (element.innerText || '').toLowerCase();
    
    return {
      wordCount: text.split(/\s+/).length,
      hasCallToAction: this.detectCallToAction(text),
      sentiment: this.detectSentiment(text),
      industry: this.detectIndustry(text)
    };
  }

  /**
   * Detect call to action
   * @param text - Text content
   * @returns Has CTA
   */
  private detectCallToAction(text: string): boolean {
    const ctaKeywords = [
      'buy now', 'sign up', 'learn more', 'get started', 'try free',
      'download', 'subscribe', 'join', 'register', 'click here'
    ];
    
    return ctaKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Detect sentiment (simplified)
   * @param text - Text content
   * @returns Sentiment
   */
  private detectSentiment(text: string): Sentiment {
    const positiveWords = ['best', 'amazing', 'great', 'excellent', 'love', 'perfect', 'wonderful'];
    const negativeWords = ['worst', 'bad', 'terrible', 'awful', 'hate', 'poor', 'disappointing'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    
    return 'neutral';
  }

  /**
   * Detect industry (simplified)
   * @param text - Text content
   * @returns Industry
   */
  private detectIndustry(text: string): Industry {
    const industries: Record<Industry, string[]> = {
      'technology': ['software', 'app', 'cloud', 'digital', 'tech', 'data'],
      'finance': ['bank', 'loan', 'credit', 'invest', 'money', 'financial'],
      'retail': ['shop', 'buy', 'sale', 'discount', 'store', 'product'],
      'health': ['health', 'medical', 'doctor', 'medicine', 'wellness', 'care'],
      'education': ['learn', 'course', 'school', 'university', 'education', 'training'],
      'other': []
    };
    
    for (const [industry, keywords] of Object.entries(industries)) {
      if (industry !== 'other' && keywords.some(keyword => text.includes(keyword))) {
        return industry as Industry;
      }
    }
    
    return 'other';
  }

  /**
   * Enable/disable ad detection
   * @param enabled - Enable state
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Clear processed ads cache
   */
  clearCache(): void {
    this.processedAds.clear();
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      processedAds: this.processedAds.size,
      rateLimitRemaining: this.rateLimiter.getRemainingRequests()
    };
  }
}

export default AdDetector;