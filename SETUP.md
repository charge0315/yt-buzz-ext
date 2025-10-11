# YT Buzz Ext - Setup Guide

This guide will help you set up and build the extension from source.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Chrome/Edge** (or any Chromium-based browser)
- **Google Cloud Project** with YouTube Data API enabled

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/charge0315/yt-buzz-ext.git
cd yt-buzz-ext
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure OAuth2

#### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Go to **APIs & Services > OAuth consent screen**
   - Select "External" user type
   - Add your email as a test user
   - Add scope: `https://www.googleapis.com/auth/youtube`

#### Create OAuth2 Client ID

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Chrome extension** as application type
4. You'll need the extension ID (see next step)

### 4. Build the Extension

```bash
npm run build
```

This creates a `dist/` directory with the built extension.

### 5. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` directory
5. Note the **Extension ID** shown under your extension

### 6. Update OAuth2 Client ID

1. Go back to Google Cloud Console > Credentials
2. Edit your OAuth client ID
3. Add the extension ID from step 5
4. Save changes

### 7. Update manifest.json

Edit `manifest.json` and replace the `oauth2.client_id` with your client ID:

```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/youtube"
    ]
  }
}
```

### 8. Rebuild and Reload

```bash
npm run build
```

Then reload the extension in `chrome://extensions/`.

## Development

### Watch Mode

For development with auto-rebuild:

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format
npm run format:check
```

## Project Structure

```
yt-buzz-ext/
├── src/
│   ├── background/       # Background modules
│   ├── utils/           # Utilities
│   ├── background.new.js # Main background script
│   ├── popup.js         # Popup logic
│   └── options.js       # Options logic
├── public/              # Static files
├── _locales/           # Translations
├── tests/              # Test files
└── dist/               # Build output
```

## Available Scripts

- `npm run dev` - Development mode with watch
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run package` - Create zip package

## Environment Variables

You can create a `.env` file for development:

```env
GOOGLE_CLIENT_ID=your_client_id_here
```

## Troubleshooting

### Extension ID Changes

If you need a fixed extension ID:

1. Generate a private key: `openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem`
2. Get the public key: `openssl rsa -in key.pem -pubout -outform DER | openssl base64 -A`
3. Add to `manifest.json`:
   ```json
   {
     "key": "YOUR_PUBLIC_KEY_HERE"
   }
   ```

### OAuth Errors

- Ensure extension ID in OAuth client matches actual ID
- Check that YouTube Data API is enabled
- Verify test user is added to OAuth consent screen

### Build Errors

- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Clear `dist`: `rm -rf dist && npm run build`

## Next Steps

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for code structure
2. Read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
3. Check [README.md](README.md) for usage instructions

## Support

For issues and questions, please open an issue on GitHub.
