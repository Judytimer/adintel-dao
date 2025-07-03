/**
 * Content Script
 * Detects ads on web pages and communicates with background script
 */

import AdDetector from '@modules/AdDetector';
import type { AdData, ExtensionMessage, SubmissionResult } from '@types/index';

// Initialize detector
const adDetector = new AdDetector();

// Initialize observer
let observer: MutationObserver | null = null;
let isEnabled = true;

// Debounced scan function
let scanTimeout: NodeJS.Timeout;
const debouncedScan = debounce(scanForAds, 100);

/**
 * Initialize the content script
 */
async function initialize(): Promise<void> {
  try {
    // Check if extension is enabled
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    isEnabled = response.enabled;
    
    if (isEnabled) {
      startDetection();
    }
    
    // Listen for settings changes
    chrome.runtime.onMessage.addListener(handleMessage);
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

/**
 * Handle messages from background script
 * @param request - Message request
 * @param sender - Message sender
 * @param sendResponse - Response callback
 */
function handleMessage(
  request: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): void {
  if (request.type === 'SETTINGS_UPDATED' && request.settings) {
    isEnabled = request.settings.enabled ?? isEnabled;
    if (isEnabled) {
      startDetection();
    } else {
      stopDetection();
    }
  }
}

/**
 * Start ad detection
 */
function startDetection(): void {
  console.log('AdIntel DAO: Starting ad detection');
  
  // Initial scan
  scanForAds();
  
  // Set up mutation observer
  if (!observer) {
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id']
    });
  }
  
  // Set up scroll listener for lazy-loaded ads
  window.addEventListener('scroll', debouncedScan);
}

/**
 * Stop ad detection
 */
function stopDetection(): void {
  console.log('AdIntel DAO: Stopping ad detection');
  
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  window.removeEventListener('scroll', debouncedScan);
}

/**
 * Handle DOM mutations
 * @param mutations - DOM mutations
 */
function handleMutations(mutations: MutationRecord[]): void {
  // Batch mutations to avoid excessive scanning
  const hasRelevantChanges = mutations.some(mutation => {
    if (mutation.type === 'childList') {
      return mutation.addedNodes.length > 0;
    }
    return false;
  });
  
  if (hasRelevantChanges) {
    debouncedScan();
  }
}

/**
 * Scan page for ads
 */
async function scanForAds(): Promise<void> {
  if (!isEnabled) return;
  
  // Get all potential ad containers
  const selectors = [
    // Facebook selectors
    '[data-pagelet*="FeedUnit"]',
    '[role="article"]',
    '[data-testid="story-subtitle"]',
    
    // Google selectors
    '.ads-ad',
    '[id^="google_ads"]',
    '[class*="adsbygoogle"]',
    
    // Generic selectors
    '[class*="sponsored"]',
    '[class*="advertisement"]',
    '[id*="ad-"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    
    // LinkedIn selectors
    '.feed-shared-update--sponsored',
    '.sponsored-content',
    
    // Twitter/X selectors
    '[data-testid="placementTracking"]',
    'article[role="article"] span:has-text("Promoted")'
  ];
  
  const elements = document.querySelectorAll<HTMLElement>(selectors.join(', '));
  
  for (const element of elements) {
    // Skip already processed elements
    if (element.dataset.adIntelProcessed === 'true') continue;
    
    await processElement(element);
  }
}

/**
 * Process potential ad element
 * @param element - DOM element
 */
async function processElement(element: HTMLElement): Promise<void> {
  if (!adDetector.isAd(element)) return;
  
  const adData = adDetector.extractAdData(element);
  if (!adData) return;
  
  try {
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      type: 'AD_DETECTED',
      data: adData
    }) as SubmissionResult;
    
    if (response.success && response.points) {
      // Mark element as processed
      element.dataset.adIntelProcessed = 'true';
      
      // Show visual feedback
      showFeedback(element, response.points);
    }
  } catch (error) {
    console.error('Failed to send ad data:', error);
  }
}

/**
 * Show visual feedback for detected ad
 * @param element - Ad element
 * @param points - Points earned
 */
function showFeedback(element: HTMLElement, points: number): void {
  // Create feedback badge
  const badge = document.createElement('div');
  badge.className = 'adintel-badge';
  badge.innerHTML = `
    <span class="adintel-badge-text">+${points} pts</span>
    <span class="adintel-badge-icon">✓</span>
  `;
  
  // Add styles if not already added
  if (!document.querySelector('#adintel-styles')) {
    const style = document.createElement('style');
    style.id = 'adintel-styles';
    style.textContent = `
      .adintel-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 4px;
        animation: adintel-fade-in 0.3s ease-out;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        pointer-events: none;
      }
      
      .adintel-badge-icon {
        width: 16px;
        height: 16px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      @keyframes adintel-fade-in {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Position badge
  const rect = element.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    // Ensure element is relatively positioned
    const originalPosition = window.getComputedStyle(element).position;
    if (originalPosition === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(badge);
    
    // Remove badge after animation
    setTimeout(() => {
      badge.style.opacity = '0';
      badge.style.transform = 'scale(0.8)';
      setTimeout(() => {
        badge.remove();
        // Restore original position if changed
        if (originalPosition === 'static' && element.style.position === 'relative') {
          element.style.position = '';
        }
      }, 300);
    }, 2000);
  }
}

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in ms
 * @returns Debounced function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>): void {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}