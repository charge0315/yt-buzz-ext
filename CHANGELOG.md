# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Modular architecture with separated concerns
- Comprehensive logging system with levels and persistence
- Rate limiter with quota management
- Cache manager for API responses
- Retry utility with exponential backoff
- Progress bar in popup UI
- Dark mode support for all UI
- Unit tests for core utilities
- CI/CD pipeline with GitHub Actions
- Webpack build system
- ESLint and Prettier configuration
- TypeScript type definitions
- Comprehensive documentation

### Changed
- Refactored background script into modules (auth, api, playlist, scheduler)
- Improved error handling throughout the extension
- Enhanced UI with better visual feedback
- Updated CSS for better responsiveness

### Improved
- Better quota management to prevent API limit issues
- Improved performance with caching strategy
- Better code organization and maintainability

## [0.1.0] - 2025-10-12

### Added
- Initial release
- Basic playlist creation from subscriptions
- Dry run mode
- Scheduled execution
- i18n support (Japanese and English)
- OAuth2 authentication

[Unreleased]: https://github.com/charge0315/yt-buzz-ext/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/charge0315/yt-buzz-ext/releases/tag/v0.1.0
