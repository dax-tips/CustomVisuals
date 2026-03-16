# 🎵 Power BI Music Player

An advanced custom visual for Power BI that transforms your workspace into a professional music studio with real-time audio visualization.

![Power BI Next Step Music Centre](assets/icon.png)

## ✨ Features

### 🎼 Professional Music Player
- **Multi-track playlist** with shuffle/repeat functionality
- **Advanced audio processing** with bass, treble, and reverb controls
- **Real-time beat detection** with visual feedback
- **Progress tracking** with seek functionality
- **Keyboard shortcuts** for full control

### 🌈 Visual Themes
- **5 Professional Themes**: Neon, Cyberpunk, Retro 80s, Nature, Fire
- **Dynamic theme transitions** based on music mood and energy
- **Audio-reactive backgrounds** with breathing effects
- **Customizable color palettes** for each visualization

### 📊 Visualization Styles
- **📊 Frequency Bars** - Classic equalizer bars
- **⭕ Circular** - Radial frequency display
- **〰️ Waveform** - Real-time waveform visualization
- **🌈 Spectrum** - Full spectrum analysis
- **🌌 Galaxy Spiral** - Cosmic visualization effects
- **💚 Matrix Rain** - Digital matrix-style display
- **📊 VU Meters** - Professional VU meter display
- **🌊 Liquid Wave** - Fluid wave animations

### 🚀 Advanced Effects System
- **Beat Detection** with screen flash synchronization
- **Audio Waterfall** - Cascading frequency visualization
- **Smart Particle Explosions** - Beat-triggered particle effects
- **Interactive Elements** - Mouse/touch responsive effects
- **Music Analysis** - BPM detection, tempo, mood, and energy analysis
- **Background Effects** - Audio-reactive gradients and patterns

## 🛠️ Installation

### Prerequisites
- Power BI Desktop (latest version)
- Node.js (version 18 or higher)
- PowerBI-Visuals-Tools CLI

### Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/dax-tips/powerbi-music-player.git
   cd powerbi-music-player
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the visual:
   ```bash
   npm run package
   ```

4. Import the `.pbiviz` file into Power BI Desktop

## 🎮 Usage

### Basic Controls
- **Play/Pause**: Space bar or click the play button
- **Volume**: Mouse wheel or volume slider
- **Skip**: Arrow keys (←→) or skip buttons
- **Themes**: Dropdown selector or 'T' key
- **Visualizations**: Style dropdown or number keys (1-8)

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `SPACE` | Play/Pause |
| `←` / `→` | Skip 10 seconds |
| `↑` / `↓` | Volume control |
| `F` | Toggle fullscreen |
| `1-8` | Switch visualizations |
| `T` | Cycle themes |
| `P` | Toggle particles |
| `S` | Toggle shuffle |
| `R` | Toggle repeat |
| `N` / `B` | Next/Previous track |
| `H` | Toggle help |
| `ESC` | Exit fullscreen |

### Advanced Features
- **Beat Detection**: Automatically detects beats and triggers visual effects
- **Music Analysis**: Real-time BPM, tempo, energy, and mood detection
- **Interactive Mode**: Click and drag for ripple effects
- **Particle System**: Audio-reactive particle explosions
- **Theme Transitions**: Automatic theme changes based on music energy

## 📁 Project Structure

```
powerbi-music-player/
├── src/
│   ├── visual.ts          # Main visual implementation
│   └── settings.ts        # Power BI settings configuration
├── style/
│   └── visual.less        # Styling and themes
├── assets/
│   └── icon.png          # Visual icon
├── capabilities.json      # Power BI capabilities definition
├── pbiviz.json           # Visual metadata
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## 🎨 Customization

### Adding New Themes
1. Open `src/visual.ts`
2. Find the `initializeThemes()` method
3. Add your new theme following the existing pattern:

```typescript
this.themes.set('custom', {
    name: 'Custom Theme',
    colors: {
        primary: '#your-primary-color',
        secondary: '#your-secondary-color',
        accent: '#your-accent-color',
        background: 'linear-gradient(45deg, #color1, #color2)',
        text: '#ffffff',
        glow: '#your-glow-color'
    },
    particleColors: ['#color1', '#color2', '#color3']
});
```

### Adding New Visualizations
1. Create a new visualization method in `src/visual.ts`
2. Add it to the visualization switch in `drawVisualization()`
3. Update the style dropdown in `initializeMusicStudio()`

## 🚀 Development

### Build Commands
- `npm run start` - Start development server
- `npm run package` - Build production package
- `npm run lint` - Run ESLint

### Development Server
The development server runs on `https://localhost:8080/` with hot reload enabled.

## 📋 Requirements
- **Audio Files**: Supports MP3, WAV, OGG, M4A, FLAC
- **Browser**: Modern browser with Web Audio API support
- **Power BI**: Power BI Desktop or Power BI Service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

### Planned Features
- [ ] Spotify/Apple Music integration
- [ ] Cloud playlist synchronization
- [ ] Advanced DSP effects (EQ, compressor, limiter)
- [ ] Custom visualization scripting
- [ ] Export visualizations as video
- [ ] MIDI controller support
- [ ] Real-time collaboration features

## 🐛 Known Issues
- Large audio files may cause memory usage spikes
- Some visualization effects may reduce performance on older hardware
- Beat detection accuracy varies with music genre

## 📞 Support

For questions, bug reports, or feature requests:
- Create an issue in this repository
- Contact the DAX Tips team
- Check the [Power BI Community](https://community.powerbi.com/)

## 🎵 Acknowledgments

- Built with the Power BI Visuals SDK
- Uses Web Audio API for real-time analysis
- Inspired by professional music production software
- Special thanks to the Power BI developer community

---

**Made with ❤️ by the DAX Tips Team**

*Transform your Power BI dashboards into an immersive music experience!*