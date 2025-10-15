# Copilot Instructions for AI Agents

## 🎯 Project Overview

This is a sophisticated Chrome extension (Manifest V3) that scans a user's YouTube subscriptions and creates or updates playlists with the latest videos from each channel. It is built with a professional architecture, comprehensive testing, CI/CD, and multi-language support.

### Key Features

-   **Playlist Automation**: Creates or updates a playlist for each subscribed channel with their latest videos.
-   **Aggregate Playlist**: Creates a single playlist containing the latest videos from all subscribed channels.
-   **Dry Run Mode**: Simulates the process without making any actual changes to playlists, useful for debugging and quota management.
-   **Scheduled Execution**: Can be configured to run automatically when Chrome starts or at a specific time each day.
-   **Robust and Performant**: Features advanced error handling, a two-layer caching system, and API quota management.
-   **Internationalization**: Supports multiple languages.

## 🏗️ Architecture

The extension is designed with a modular structure to separate concerns. See `ARCHITECTURE.md` for more details.

-   **`src/background/`**: The core logic of the extension, running in the service worker.
    -   **`api.js`**: A wrapper for the YouTube Data API, handling all API requests.
    -   **`auth.js`**: Manages OAuth 2.0 authentication using `chrome.identity.getAuthToken`.
    -   **`playlist.js`**: Contains the logic for creating, updating, and managing playlists.
    -   **`scheduler.js`**: Handles scheduled tasks using `chrome.alarms`.
-   **`src/utils/`**: Shared utility modules.
    -   **`cache.js`**: A two-layer caching system (memory and `chrome.storage.local`) to minimize API calls.
    -   **`rateLimiter.js`**: Manages API rate limiting and quota to prevent exceeding YouTube's daily limits.
    -   **`retry.js`**: Implements an exponential backoff retry mechanism for failed API requests.
    -   **`logger.js`**: A logging utility that persists logs for debugging.
-   **`src/ui/`**: Contains the code for the popup and options pages (built with Preact and TypeScript).
-   **`webpack.config.js`**: The Webpack configuration for building the extension.

## 💻 Developer Workflow

**1. Setup**

You need Node.js >= 18.0.0.

```bash
# Clone the repository
git clone https://github.com/charge0315/yt-buzz-ext.git
cd yt-buzz-ext

# Install dependencies
npm install
```

**2. OAuth 2.0 Client ID Setup**

This extension requires an OAuth 2.0 Client ID to access the YouTube Data API.
1.  Create a project in the Google Cloud Console.
2.  Configure the OAuth consent screen (as "External" for testing).
3.  Add the `https://www.googleapis.com/auth/youtube` scope.
4.  Create an OAuth 2.0 Client ID of the type "Chrome App". You will need to provide your extension's ID, which you can find on the `chrome://extensions` page after loading it.
5.  Copy the generated Client ID and paste it into the `oauth2.client_id` field in `manifest.json`.

**3. Building and Loading the Extension**

-   **Development (with watch mode):**
    ```bash
    npm run dev
    ```
-   **Production Build:**
    ```bash
    npm run build
    ```
After building, load the `dist/` directory as an unpacked extension in `chrome://extensions`.

**4. Testing**

The project uses Jest for unit testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate a coverage report
npm run test:coverage
```

## 📝 Project-Specific Conventions

-   **Authentication**: All YouTube API calls are authenticated via OAuth 2.0. The authentication flow is handled in `src/background/auth.js`.
-   **API Interaction**: All interactions with the YouTube Data API should go through the wrapper in `src/background/api.js`. This ensures that caching, rate limiting, and retry logic are applied consistently.
-   **State Management**: The UI (popup and options) uses a simple state management pattern. See the components in `src/ui/` for examples.
-   **Logging**: Use the `Logger` utility from `src/utils/logger.js` for logging. It provides different log levels and persists logs, which is useful for debugging the background service worker.
-   **Internationalization (i18n)**: All user-facing strings are managed in `_locales/`. To add or modify text, edit the `messages.json` files for each language.
-   **Code Quality**: The project uses ESLint and Prettier for code quality. Run `npm run lint` and `npm run format` before committing changes.
