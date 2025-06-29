/**
 * Content Script - Runs on web pages to detect ads
 * Legal compliance: Only collects public ad data, no user info
 */

// Initialize detector
const adDetector = new AdDetector();
const rewardSystem = new RewardSystem();

// Track observed ads to avoid duplicates
const observedAds = new WeakSet();

/**
 * Main function to scan for ads
 */
function scanForAds() {
  // Common ad selectors
  const adSelectors = [
    // Facebook
    '[aria-label="Sponsored"]',
    'span:contains("Sponsored")',
    'a[href*="/ads/about"]',
    // Google
    'iframe[id*="google_ads"]',
    '.adsbygoogle',
    '[data-ad-client]',
    // Generic
    '[class*="advertisement"]',
    '[class*="ad-container"]',
    '[id*="banner-ad"]',
    'div[class*="promoted"]'
  ];

  // Find potential ad elements
  const potentialAds = [];
  adSelectors.forEach(selector => {
    try {
      // Handle jQuery-style selectors
      if (selector.includes(':contains')) {
        const [tag, text] = selector.match(/(\w+):contains\("(.+)"\)/).slice(1);
        document.querySelectorAll(tag).forEach(el => {
          if (el.textContent.includes(text)) {
            potentialAds.push(el);
          }
        });
      } else {
        document.querySelectorAll(selector).forEach(el => potentialAds.push(el));
      }
    } catch (e) {
      // Ignore invalid selectors
    }
  });

  // Process each potential ad
  potentialAds.forEach(element => {
    processAdElement(element);
  });
}

/**
 * Process a potential ad element
 */
async function processAdElement(element) {
  // Skip if already processed
  if (observedAds.has(element)) return;
  
  // Check if it's actually an ad
  if (!adDetector.isAd(element)) return;

  // Mark as observed
  observedAds.add(element);

  // Process the ad
  const adData = adDetector.processAd(element);
  if (!adData) return;

  // Send to background script for storage
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'AD_DETECTED',
      data: adData
    });

    if (response.success) {
      // Show subtle notification
      showNotification(`+${response.points} points earned!`);
    }
  } catch (error) {
    console.error('Failed to submit ad:', error);
  }
}

/**
 * Show notification to user
 */
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'adintel-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Set up mutation observer to detect dynamically loaded ads
 */
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    // Debounce to avoid too frequent scans
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanForAds, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

let scanTimeout;

/**
 * Check if extension is enabled
 */
async function checkEnabled() {
  try {
    const result = await chrome.storage.local.get('enabled');
    return result.enabled !== false; // Default to enabled
  } catch {
    return true;
  }
}

/**
 * Initialize content script
 */
async function init() {
  // Check if enabled
  const enabled = await checkEnabled();
  if (!enabled) return;

  // Add CSS for notifications
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Initial scan
  scanForAds();

  // Set up observer for dynamic content
  setupObserver();

  // Periodic scan for missed ads
  setInterval(scanForAds, 10000); // Every 10 seconds
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Listen for messages from popup/background
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCAN_ADS') {
    scanForAds();
    sendResponse({ success: true });
  }
});

// Include the AdDetector class (in production, this would be bundled)
class AdDetector {
  constructor() {
    this.enabled = true;
    this.processedAds = new Set();
    this.rateLimiter = new RateLimiter(5, 60000);
  }

  isAd(element) {
    if (!element) return false;
    return this.isFacebookAd(element) || 
           this.isGoogleAd(element) || 
           this.isGenericAd(element);
  }

  isFacebookAd(element) {
    const sponsoredLabels = ['Sponsored', 'Реклама', '赞助内容', 'Publicité'];
    const text = element.innerText || '';
    return sponsoredLabels.some(label => text.includes(label));
  }

  isGoogleAd(element) {
    return (element.tagName === 'IFRAME' && element.id && element.id.includes('google_ads')) ||
           (element.classList && element.classList.contains('adsbygoogle'));
  }

  isGenericAd(element) {
    const adIndicators = ['advertisement', 'ad-container', 'ad-wrapper', 'banner-ad'];
    const classList = Array.from(element.classList || []);
    const id = element.id || '';
    
    return adIndicators.some(indicator => 
      classList.some(cls => cls.toLowerCase().includes(indicator)) ||
      id.toLowerCase().includes(indicator)
    );
  }

  processAd(element) {
    if (!this.enabled || !this.shouldProcess(element)) return null;
    if (!this.rateLimiter.tryAcquire()) return null;

    const metadata = this.extractMetadata(element);
    metadata.id = this.generateAdId(metadata);
    
    if (this.processedAds.has(metadata.id)) return null;
    this.processedAds.add(metadata.id);
    
    return metadata;
  }

  extractMetadata(element) {
    const metadata = {
      platform: window.location.hostname.replace('www.', '').split('.')[0],
      type: this.detectAdType(element),
      detected_at: new Date().toISOString(),
      url: window.location.href
    };

    const titleEl = element.querySelector('h1, h2, h3, h4, h5, h6');
    if (titleEl) metadata.title = titleEl.innerText.substring(0, 200);

    const textEls = element.querySelectorAll('p, span');
    const texts = Array.from(textEls).map(el => el.innerText).filter(t => t.length > 20);
    if (texts.length) metadata.text = texts.join(' ').substring(0, 500);

    return metadata;
  }

  detectAdType(element) {
    if (element.querySelector('video')) return 'video_ad';
    if (element.tagName === 'IFRAME') return 'display_ad';
    return 'sponsored_post';
  }

  shouldProcess(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  generateAdId(metadata) {
    const content = `${metadata.platform}_${metadata.title}_${metadata.text}`;
    return btoa(content).substring(0, 16);
  }
}

class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  tryAcquire() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }
}