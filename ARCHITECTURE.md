# Architecture

This document describes the architecture of YT Buzz Ext.

## Overview

YT Buzz Ext is a Chrome extension built with Manifest V3 that automatically creates and updates YouTube playlists from subscribed channels.

## Directory Structure

```
yt-buzz-ext/
├── src/
│   ├── background/          # Background service worker modules
│   │   ├── api.js          # YouTube Data API wrapper
│   │   ├── auth.js         # OAuth authentication
│   │   ├── playlist.js     # Playlist management
│   │   └── scheduler.js    # Job scheduling
│   ├── utils/              # Shared utilities
│   │   ├── cache.js        # Caching layer
│   │   ├── constants.js    # Constants and configuration
│   │   ├── logger.js       # Logging system
│   │   ├── rateLimiter.js  # API rate limiting
│   │   └── retry.js        # Retry logic with backoff
│   ├── background.new.js   # Main background script
│   ├── popup.js            # Popup UI logic
│   └── options.js          # Options page logic
├── public/                 # Static assets
│   ├── popup.html
│   ├── popup.css
│   ├── options.html
│   ├── options.css
│   └── icons/
├── _locales/              # i18n messages
│   ├── en/
│   └── ja/
├── tests/                 # Test files
│   ├── unit/
│   └── setup.js
└── dist/                  # Build output

```

## Core Modules

### Background Service Worker

The background service worker is the heart of the extension, running persistently to handle:
- API communication
- Scheduled tasks
- Message passing with UI

#### Modules:

**auth.js**
- Handles OAuth2 authentication with Google
- Token management and refresh
- Error handling for auth failures

**api.js**
- Wraps YouTube Data API v3 endpoints
- Implements rate limiting and quota management
- Provides caching for frequently accessed data
- Uses retry logic for transient failures

**playlist.js**
- Core business logic for playlist operations
- Creates/updates playlists for each channel
- Manages aggregate playlists
- Handles video synchronization and reordering

**scheduler.js**
- Manages scheduled executions
- Handles startup and alarm events
- Coordinates job execution

### Utilities

**logger.js**
- Centralized logging system
- Persists logs to chrome.storage.local
- Supports log levels (info, warn, error, success)
- Sends real-time updates to UI

**rateLimiter.js**
- Enforces API rate limits
- Manages daily quota (10,000 units)
- Queues requests when at capacity
- Tracks quota usage and reset times

**cache.js**
- In-memory and persistent caching
- Configurable TTL
- Reduces API calls
- Improves performance

**retry.js**
- Exponential backoff retry logic
- Handles transient errors (429, 5xx)
- Configurable retry attempts and delays

**constants.js**
- Central configuration
- API endpoints and costs
- Storage keys
- Message types

## Data Flow

### Main Job Execution

```
User/Scheduler → runJob()
    ↓
getAuthToken() → OAuth2 Flow
    ↓
processSubscriptions()
    ↓
getSubscriptions() → [Cache Check] → API Call
    ↓
For each subscription:
    ↓
createOrUpdateChannelPlaylist()
    ↓
    ├→ findPlaylistByTitle()
    ├→ syncPlaylistItems()
    └→ reorderPlaylist()
    ↓
createOrUpdateAggregatePlaylist()
    ↓
Complete → Send Success Message
```

### Message Passing

```
Popup/Options → chrome.runtime.sendMessage()
    ↓
Background (onMessage listener)
    ↓
Route to appropriate handler:
    - RUN → Execute job
    - SCHEDULE_UPDATE → Update schedules
    - LOG → (from background to UI)
    - PROGRESS → (from background to UI)
```

## API Quota Management

YouTube Data API has a daily quota limit (10,000 units by default).

### Quota Costs:
- List operations: 1 unit
- Insert operations: 50 units
- Update operations: 50 units
- Delete operations: 50 units

### Strategy:
1. Track quota usage in storage
2. Reset at midnight PST (YouTube's reset time)
3. Throw error if quota exceeded
4. Cache API responses to reduce calls
5. Allow user to configure limits

## Error Handling

### Levels:
1. **Retryable Errors** (429, 5xx): Automatic retry with backoff
2. **Auth Errors**: Clear token and re-authenticate
3. **Quota Errors**: Inform user, suggest retry time
4. **Fatal Errors**: Log and report to user

### Error Flow:
```
API Call → Error
    ↓
Check error type
    ↓
Retryable? → withRetry() → Exponential Backoff
    ↓
Non-retryable → Log Error → Notify User
```

## Storage

### chrome.storage.sync (User Settings)
- limit: Videos per channel
- update: Update existing playlists
- dryRun: Dry run mode
- runOnStartup: Run on browser startup
- dailyHour: Daily scheduled run time

### chrome.storage.local (Transient Data)
- logs: Log history (max 100 entries)
- quotaUsed: Current quota consumption
- quotaReset: Next quota reset time
- cache:* : Cached API responses

## Security Considerations

1. **OAuth2**: Secure authentication via chrome.identity
2. **Token Storage**: Handled by Chrome, never exposed
3. **API Key**: Not exposed in code, managed via manifest
4. **Permissions**: Minimal required permissions
5. **CSP**: Content Security Policy enforced

## Performance Optimizations

1. **Caching**: Reduce redundant API calls
2. **Batch Requests**: Multiple channels in single request
3. **Rate Limiting**: Prevent API throttling
4. **Lazy Loading**: Load data only when needed
5. **Memory Management**: Clear caches periodically

## Testing Strategy

### Unit Tests
- Test individual utilities (logger, cache, retry)
- Mock chrome APIs
- Test edge cases and error conditions

### Integration Tests
- Test module interactions
- Test API mocking
- Test end-to-end flows

### Manual Testing
- Load unpacked extension
- Test OAuth flow
- Test playlist creation/update
- Test error scenarios
- Test UI responsiveness

## Future Enhancements

1. **Shorts Detection**: Filter shorts videos
2. **Custom Filters**: Allow users to filter by duration, keywords
3. **Multiple Playlists**: Support multiple playlist types
4. **Analytics**: Track usage statistics
5. **Backup/Restore**: Export/import settings
6. **Notifications**: Chrome notifications for job completion
7. **Incremental Updates**: Only fetch new videos since last run

## Deployment

1. Build: `npm run build`
2. Test: Load `dist/` as unpacked extension
3. Package: `npm run package` → creates .zip
4. Submit to Chrome Web Store

## Troubleshooting

See [README.md](README.md#troubleshooting) for common issues and solutions.
