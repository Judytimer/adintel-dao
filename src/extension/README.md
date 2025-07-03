# AdIntel DAO Chrome Extension

A privacy-focused Chrome extension that rewards users for contributing advertising insights.

## Project Structure

```
src/
├── extension/           # Source files
│   ├── background.js    # Service worker
│   ├── content.js      # Content script
│   ├── popup.js        # Popup UI logic
│   ├── popup.html      # Popup UI
│   └── manifest.json   # Extension manifest
├── modules/            # Shared modules
│   ├── AdDetector.js   # Ad detection logic
│   ├── RewardSystem.js # Points and rewards
│   └── RateLimiter.js  # Rate limiting
└── dist/              # Built extension (generated)
```

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. For development with watch mode:
   ```bash
   npm run dev:extension
   ```

## Installation

### Development Mode

1. Build the extension:
   ```bash
   npm run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the `dist` folder

### Production Build

1. Create production build:
   ```bash
   npm run build:extension
   ```

2. The packaged extension will be in the `releases` folder

## Testing

Run tests:
```bash
npm test
```

Run linting:
```bash
npm run lint
```

## Features

- **Privacy-First**: No personal data collection
- **Multi-Platform**: Supports Facebook, Google, LinkedIn, Twitter
- **Reward System**: Earn points for contributing ad insights
- **Achievements**: Unlock achievements and bonus points
- **Daily Limits**: Fair usage with 50 ads/day limit
- **Data Export**: Export your data anytime

## Architecture

The extension uses a modular architecture:

- **AdDetector**: Identifies and extracts ad metadata
- **RewardSystem**: Manages points, achievements, and stats
- **RateLimiter**: Prevents spam and ensures fair usage

All modules are built with webpack and use ES6 imports for better code organization.

## Privacy & Security

- No personal data is collected
- All processing happens locally
- Only anonymous ad metadata is stored
- Users can export or delete their data anytime