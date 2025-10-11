# Contributing to YT Buzz Ext

Thank you for your interest in contributing to YT Buzz Ext! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/charge0315/yt-buzz-ext.git
   cd yt-buzz-ext
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Build the extension**
   ```bash
   npm run build
   ```

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

3. **Run linting and formatting**
   ```bash
   npm run lint
   npm run format
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

## Code Style

- Use ESLint and Prettier configurations provided
- Write JSDoc comments for functions and classes
- Keep functions small and focused
- Use meaningful variable and function names
- Follow the existing project structure

## Testing

- Write unit tests for new utilities
- Test edge cases
- Aim for high code coverage
- Run tests before submitting PR

## Documentation

- Update README.md if adding new features
- Add JSDoc comments to new functions
- Update CHANGELOG.md following the format

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests for new functionality
- Update documentation as needed
- Ensure all tests pass
- Respond to review feedback promptly

## Questions?

Feel free to open an issue for questions or discussions.

Thank you for contributing! 🎉
