# Installation Guide - Power BI Music Player

This guide will help you install and set up the Power BI Music Player custom visual.

## Quick Installation

### Option 1: Download Pre-built Visual (Recommended)

1. Go to the [Releases](https://github.com/dax-tips/powerbi-music-player/releases) page
2. Download the latest `.pbiviz` file
3. In Power BI Desktop, go to **Home** → **Get Data** → **More** → **Other** → **From file**
4. Select the downloaded `.pbiviz` file
5. Click **Import**

### Option 2: Build from Source

1. **Prerequisites**
   - Node.js 18+ ([Download here](https://nodejs.org/))
   - Power BI Visuals Tools CLI
   ```bash
   npm install -g powerbi-visuals-tools
   ```

2. **Clone and Build**
   ```bash
   git clone https://github.com/dax-tips/powerbi-music-player.git
   cd powerbi-music-player
   npm install
   npm run package
   ```

3. **Import to Power BI**
   - The `.pbiviz` file will be created in the `dist/` folder
   - Import it into Power BI Desktop as described in Option 1

## Setting Up Your First Music Visualization

### Step 1: Add the Visual
1. In Power BI Desktop, add the **Power BI Music Player** visual to your canvas
2. Resize it to your preferred dimensions (recommended: full screen for best experience)

### Step 2: Load Music Files
1. Click the **Choose Files** button in the visual
2. Select your music files (supports MP3, WAV, OGG, M4A, FLAC)
3. Multiple files will create a playlist

### Step 3: Customize Your Experience
1. **Choose a Theme**: Select from Neon, Cyberpunk, Retro 80s, Nature, or Fire
2. **Select Visualization**: Pick from 8 different styles (Bars, Circular, Waveform, etc.)
3. **Enable Effects**: Turn on particles for enhanced visuals
4. **Adjust Audio**: Use bass, treble, and reverb controls

## Configuration Options

### Audio Controls
- **Volume**: 0-100%
- **Bass**: -12dB to +12dB
- **Treble**: -12dB to +12dB
- **Reverb**: 0-100%

### Visual Options
- **Themes**: 5 predefined themes with custom color schemes
- **Visualizations**: 8 different visualization styles
- **Particles**: Enable/disable particle effects
- **Beat Detection**: Automatic beat detection with visual feedback

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `←/→` | Skip 10 seconds |
| `↑/↓` | Volume up/down |
| `F` | Fullscreen |
| `1-8` | Switch visualizations |
| `T` | Cycle themes |
| `P` | Toggle particles |
| `S/R` | Shuffle/Repeat |

## Troubleshooting

### Common Issues

**Visual doesn't load**
- Ensure you have the latest Power BI Desktop
- Check that the `.pbiviz` file isn't corrupted
- Try restarting Power BI Desktop

**No audio playback**
- Check browser permissions for audio playback
- Ensure audio files are in supported formats
- Try lowering the volume and gradually increasing

**Poor performance**
- Reduce visualization complexity (disable particles)
- Use smaller audio files
- Close other browser tabs
- Check system resources

**Beat detection not working**
- Ensure audio is playing
- Try different music genres (electronic music works best)
- Check that volume is sufficient

### Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Edge**: Full support
- **Safari**: Limited support (Web Audio API restrictions)

### File Format Support
- **MP3**: Full support
- **WAV**: Full support
- **OGG**: Full support
- **M4A**: Full support
- **FLAC**: Full support (may have performance impact)

## Best Practices

### For Best Performance
- Use MP3 files under 10MB
- Enable hardware acceleration in your browser
- Close unnecessary browser tabs
- Use a modern computer with dedicated graphics

### For Best Visual Experience
- Use full-screen mode when possible
- Choose themes that match your music genre
- Enable particles for electronic/dance music
- Use circular or galaxy visualizations for ambient music

### For Presentations
- Test audio levels beforehand
- Prepare a playlist in advance
- Use keyboard shortcuts for smooth operation
- Consider audience preferences for themes/styles

## Support

Need help? Check these resources:

1. **Documentation**: [README.md](README.md)
2. **Issues**: [GitHub Issues](https://github.com/dax-tips/powerbi-music-player/issues)
3. **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
4. **DAX Tips**: [dax.tips](https://dax.tips)

## What's Next?

Once installed, explore these advanced features:
- **Interactive Mode**: Click and drag for ripple effects
- **Music Analysis**: View real-time BPM, tempo, and mood
- **Theme Transitions**: Automatic theme changes based on music
- **Custom Playlists**: Create and save custom playlists
- **Fullscreen Mode**: Immersive full-screen experience

Enjoy your Power BI Music Player! 🎵