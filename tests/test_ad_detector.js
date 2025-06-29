/**
 * TDD Tests for Ad Detection Core Functionality
 * Following legal guidelines: only collect public ad data
 */

describe('AdDetector', () => {
  let adDetector;

  beforeEach(() => {
    // Reset detector for each test
    adDetector = new AdDetector();
  });

  describe('Ad Detection', () => {
    test('should detect Facebook sponsored posts', () => {
      const fbAdElement = createMockElement({
        innerHTML: '<span>Sponsored</span><div>Buy our product!</div>',
        classList: ['sponsored-post']
      });
      
      expect(adDetector.isAd(fbAdElement)).toBe(true);
    });

    test('should detect Google display ads', () => {
      const googleAdElement = createMockElement({
        id: 'google_ads_iframe_1',
        tagName: 'IFRAME'
      });
      
      expect(adDetector.isAd(googleAdElement)).toBe(true);
    });

    test('should not detect regular content as ads', () => {
      const regularContent = createMockElement({
        innerHTML: '<p>This is a regular blog post</p>'
      });
      
      expect(adDetector.isAd(regularContent)).toBe(false);
    });
  });

  describe('Data Extraction', () => {
    test('should extract ad metadata without storing images', () => {
      const adElement = createMockElement({
        innerHTML: '<span>Sponsored</span><h3>Amazing Product</h3><p>50% off today!</p>',
        href: 'https://example.com/product'
      });

      const metadata = adDetector.extractMetadata(adElement);
      
      expect(metadata).toEqual({
        platform: 'facebook',
        type: 'sponsored_post',
        title: 'Amazing Product',
        text: '50% off today!',
        landing_url: 'https://example.com/product',
        detected_at: expect.any(Date),
        // Note: No image data stored (legal compliance)
      });
    });

    test('should anonymize data - no user info collected', () => {
      const adElement = createMockElement({
        innerHTML: '<div data-user-id="12345">Sponsored Ad</div>'
      });

      const metadata = adDetector.extractMetadata(adElement);
      
      // Should NOT contain any user information
      expect(metadata.user_id).toBeUndefined();
      expect(metadata.profile).toBeUndefined();
      expect(metadata.cookies).toBeUndefined();
    });
  });

  describe('Privacy & Legal Compliance', () => {
    test('should only process ads visible to user', () => {
      const hiddenAd = createMockElement({
        innerHTML: '<span>Sponsored</span>',
        style: { display: 'none' }
      });

      expect(adDetector.shouldProcess(hiddenAd)).toBe(false);
    });

    test('should respect user opt-out', () => {
      adDetector.setUserPreference({ enabled: false });
      
      const adElement = createMockElement({
        innerHTML: '<span>Sponsored</span>'
      });

      expect(adDetector.processAd(adElement)).toBe(null);
    });

    test('should rate limit to avoid platform detection', () => {
      const ads = Array(10).fill(null).map(() => 
        createMockElement({ innerHTML: '<span>Sponsored</span>' })
      );

      const processed = ads.map(ad => adDetector.processAd(ad));
      const successCount = processed.filter(p => p !== null).length;

      // Should process max 5 ads per minute (rate limiting)
      expect(successCount).toBeLessThanOrEqual(5);
    });
  });
});

// Helper function to create mock DOM elements
function createMockElement(props) {
  const element = {
    innerHTML: '',
    classList: [],
    id: '',
    tagName: 'DIV',
    style: {},
    getAttribute: (attr) => props[attr] || null,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100 }),
    ...props
  };
  return element;
}