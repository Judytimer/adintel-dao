/**
 * Ad Detection Module
 * Detects and extracts metadata from ads while respecting privacy
 */

class AdDetector {
  constructor() {
    this.enabled = true;
    this.processedAds = new Set();
    this.rateLimiter = new RateLimiter(5, 60000); // 5 ads per minute
  }

  /**
   * Check if an element is an advertisement
   */
  isAd(element) {
    if (!element) return false;

    // Facebook ads
    if (this.isFacebookAd(element)) return true;
    
    // Google ads
    if (this.isGoogleAd(element)) return true;
    
    // Generic ad patterns
    if (this.isGenericAd(element)) return true;

    return false;
  }

  isFacebookAd(element) {
    // Check for sponsored label
    const sponsoredLabels = ['Sponsored', 'Реклама', '赞助内容', 'Publicité'];
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

  isGoogleAd(element) {
    // Check for Google ad iframes
    if (element.tagName === 'IFRAME' && element.id && element.id.includes('google_ads')) {
      return true;
    }

    // Check for AdSense containers
    if (element.classList && element.classList.contains('adsbygoogle')) {
      return true;
    }

    return false;
  }

  isGenericAd(element) {
    // Common ad indicators
    const adIndicators = [
      'advertisement',
      'ad-container',
      'ad-wrapper',
      'banner-ad',
      'display-ad'
    ];

    const classList = element.classList || [];
    const id = element.id || '';
    
    return adIndicators.some(indicator => 
      Array.from(classList).some(cls => cls.toLowerCase().includes(indicator)) ||
      id.toLowerCase().includes(indicator)
    );
  }

  /**
   * Extract metadata from ad element (no personal data)
   */
  extractMetadata(element) {
    const metadata = {
      platform: this.detectPlatform(element),
      type: this.detectAdType(element),
      detected_at: new Date(),
    };

    // Extract text content
    const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6');
    if (titleElement) {
      metadata.title = this.sanitizeText(titleElement.innerText);
    }

    // Extract description
    const textElements = element.querySelectorAll('p, span');
    const texts = Array.from(textElements)
      .map(el => el.innerText)
      .filter(text => text && text.length > 20)
      .slice(0, 3); // Limit to avoid too much data
    
    if (texts.length > 0) {
      metadata.text = this.sanitizeText(texts.join(' '));
    }

    // Extract landing URL (if available)
    const linkElement = element.querySelector('a[href]');
    if (linkElement) {
      metadata.landing_url = this.sanitizeUrl(linkElement.href);
    }

    // Important: Do NOT extract any user information
    this.removePersonalData(metadata);

    return metadata;
  }

  detectPlatform(element) {
    const url = window.location.hostname;
    
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('google.com')) return 'google';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('twitter.com')) return 'twitter';
    
    return 'unknown';
  }

  detectAdType(element) {
    if (element.tagName === 'IFRAME') return 'display_ad';
    if (element.querySelector('video')) return 'video_ad';
    if (this.isFacebookAd(element)) return 'sponsored_post';
    
    return 'unknown';
  }

  sanitizeText(text) {
    // Remove extra whitespace and limit length
    return text.trim().replace(/\s+/g, ' ').substring(0, 500);
  }

  sanitizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters
      const cleanParams = new URLSearchParams();
      for (const [key, value] of urlObj.searchParams) {
        if (!this.isTrackingParam(key)) {
          cleanParams.set(key, value);
        }
      }
      urlObj.search = cleanParams.toString();
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  isTrackingParam(param) {
    const trackingParams = ['fbclid', 'gclid', 'utm_', 'ref', 'source'];
    return trackingParams.some(tp => param.toLowerCase().includes(tp));
  }

  removePersonalData(metadata) {
    // Remove any fields that might contain personal data
    const personalFields = ['user_id', 'profile', 'email', 'name', 'cookies'];
    personalFields.forEach(field => {
      delete metadata[field];
    });
  }

  /**
   * Check if element should be processed
   */
  shouldProcess(element) {
    // Only process visible elements
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;

    return true;
  }

  /**
   * Process an ad element
   */
  processAd(element) {
    if (!this.enabled) return null;
    if (!this.shouldProcess(element)) return null;
    
    // Rate limiting
    if (!this.rateLimiter.tryAcquire()) return null;

    // Extract metadata
    const metadata = this.extractMetadata(element);
    
    // Generate unique ID for deduplication
    metadata.id = this.generateAdId(metadata);
    
    // Check if already processed
    if (this.processedAds.has(metadata.id)) return null;
    
    this.processedAds.add(metadata.id);
    return metadata;
  }

  generateAdId(metadata) {
    // Create unique ID based on content
    const content = `${metadata.platform}_${metadata.title}_${metadata.text}`;
    return this.simpleHash(content);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  setUserPreference(prefs) {
    this.enabled = prefs.enabled !== false;
  }
}

/**
 * Simple rate limiter
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  tryAcquire() {
    const now = Date.now();
    
    // Remove old requests
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdDetector;
}