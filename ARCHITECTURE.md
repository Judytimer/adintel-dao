# AdIntel DAO Architecture

## Overview

This project is a TypeScript-based Chrome Extension that rewards users for contributing advertising insights while maintaining privacy.

## Technology Stack

- **Language**: TypeScript 5.3+
- **Build Tool**: Webpack 5
- **Testing**: Jest + ts-jest
- **Linting**: ESLint with TypeScript support
- **Chrome Extension**: Manifest V3
- **UI Library**: Chart.js for visualization

## Project Structure

```
ad-data-dao/
├── src/
│   ├── extension/          # Chrome extension entry points
│   │   ├── background.ts   # Service worker (background script)
│   │   ├── content.ts      # Content script (runs on web pages)
│   │   ├── popup.ts        # Popup UI logic
│   │   └── popup.html      # Popup UI template
│   ├── modules/            # Core business logic (reusable)
│   │   ├── AdDetector.ts   # Ad detection and analysis
│   │   ├── RewardSystem.ts # Points and achievement management
│   │   └── RateLimiter.ts  # Rate limiting utility
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts        # Centralized type exports
│   └── backend/            # Python backend (separate)
├── tests/                  # Unit tests
│   ├── modules/            # Module tests
│   └── setup.ts            # Test configuration
├── dist/                   # Build output (gitignored)
└── releases/               # Packaged extensions (gitignored)
```

## Architecture Principles

### 1. **Type Safety First**
- Strict TypeScript configuration
- Comprehensive type definitions for all data structures
- No `any` types without explicit justification

### 2. **Modular Design**
- Core logic separated from Chrome Extension APIs
- Reusable modules that can be tested independently
- Clear separation of concerns

### 3. **Privacy by Design**
- No personal data collection
- All processing happens locally
- Only anonymous metadata is stored

### 4. **Performance Optimization**
- Rate limiting to prevent abuse
- Debounced DOM operations
- Efficient caching strategies

## Key Components

### AdDetector Module
- **Purpose**: Identifies and extracts metadata from advertisements
- **Key Features**:
  - Multi-platform support (Facebook, Google, LinkedIn, Twitter)
  - Privacy-safe text analysis
  - Built-in rate limiting
  - Duplicate detection

### RewardSystem Module
- **Purpose**: Manages user rewards and achievements
- **Key Features**:
  - Point calculation with bonuses
  - Achievement system with milestones
  - Daily limits and streak tracking
  - Data export functionality

### RateLimiter Module
- **Purpose**: Controls operation frequency
- **Key Features**:
  - Sliding window algorithm
  - Configurable limits
  - Request counting and timing

## Data Flow

1. **Content Script** detects potential ads on web pages
2. **AdDetector** validates and extracts metadata
3. **Background Script** receives ad data via Chrome messaging
4. **RewardSystem** processes submission and calculates rewards
5. **Chrome Storage** persists user data locally
6. **Popup UI** displays stats and achievements

## Type System

The project uses a comprehensive type system defined in `src/types/index.ts`:

- **Core Types**: Platform, AdType, Sentiment, Industry
- **Data Structures**: AdData, UserStats, Achievement
- **Communication**: ExtensionMessage, SubmissionResult
- **Storage**: StorageData, ExportData

## Build Process

1. **TypeScript Compilation**: `tsc` validates types
2. **Webpack Bundling**: Creates optimized bundles
3. **Asset Copying**: Moves static files to dist
4. **Extension Packaging**: Creates installable .zip

## Testing Strategy

- **Unit Tests**: Jest tests for all modules
- **Type Tests**: TypeScript compiler validation
- **Integration**: Manual testing in Chrome
- **Coverage**: Target 80%+ code coverage

## Security Considerations

1. **Content Security Policy**: Strict CSP in manifest
2. **Input Validation**: All external data validated
3. **Rate Limiting**: Prevents abuse and spam
4. **Storage Limits**: Caps on local data storage

## Development Workflow

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run tests
npm test

# Development mode
npm run dev:extension

# Production build
npm run build

# Lint and format
npm run lint:fix
npm run format
```

## Future Improvements

1. **Web3 Integration**: Connect to Vana blockchain
2. **Advanced Analytics**: More sophisticated ad analysis
3. **Cross-browser Support**: Firefox, Edge compatibility
4. **Performance Monitoring**: Real-time metrics
5. **Automated E2E Testing**: Puppeteer integration