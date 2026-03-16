# Contributing to Power BI Music Player

We love your input! We want to make contributing to Power BI Music Player as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dax-tips/powerbi-music-player.git
   cd powerbi-music-player
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run start
   ```

4. **Build the visual**
   ```bash
   npm run package
   ```

### Code Style

We use ESLint for code styling. Run `npm run lint` to check your code style.

### Project Structure

- `src/visual.ts` - Main visual implementation
- `src/settings.ts` - Power BI settings configuration
- `style/visual.less` - Styling and themes
- `capabilities.json` - Power BI capabilities definition

### Adding New Features

#### New Visualization Styles
1. Add your visualization method to `src/visual.ts`
2. Include it in the `drawVisualization()` switch statement
3. Update the dropdown options in `initializeMusicStudio()`
4. Test with different audio files and genres

#### New Themes
1. Add theme definition in `initializeThemes()` method
2. Ensure all color properties are defined
3. Test theme transitions and visual consistency
4. Update README.md with theme description

#### New Audio Effects
1. Implement the effect in the appropriate method
2. Add controls to the UI if needed
3. Ensure Web Audio API compatibility
4. Test performance impact

### Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/dax-tips/powerbi-music-player/issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample audio files if possible
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Feature Requests

We welcome feature requests! Please provide:

- **Use case**: Why would this feature be useful?
- **Description**: What should the feature do?
- **Implementation ideas**: How might this work technically?
- **Examples**: Are there similar features in other applications?

### Testing

Before submitting a pull request:

1. **Test with different audio formats** (MP3, WAV, OGG, M4A, FLAC)
2. **Test all visualization modes** and ensure they work correctly
3. **Test theme transitions** and visual consistency
4. **Check performance** with large audio files
5. **Verify keyboard shortcuts** work as expected
6. **Test in different browsers** (Chrome, Firefox, Edge)

### Documentation

When adding new features:

1. Update the README.md with usage instructions
2. Add inline code comments for complex logic
3. Update keyboard shortcuts table if applicable
4. Document any new configuration options

### Performance Guidelines

- **Audio Processing**: Keep analysis operations efficient
- **Rendering**: Use requestAnimationFrame for smooth animations
- **Memory**: Clean up resources and avoid memory leaks
- **Canvas Operations**: Batch operations when possible

### Browser Compatibility

Ensure features work in:
- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+ (where Web Audio API is supported)

### License

By contributing, you agree that your contributions will be licensed under the MIT License.

### Questions?

Don't hesitate to ask questions by:
- Opening an issue with the `question` label
- Reaching out to the DAX Tips team
- Checking existing issues and discussions

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special mentions in project updates

Thank you for contributing to Power BI Music Player! 🎵