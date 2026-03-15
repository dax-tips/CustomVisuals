# ✈️ Power BI Flight Simulator

A fully interactive flight simulator built as a Power BI Custom Visual. Perfect for keynote presentations, demos, or just having fun!

![Flight Simulator](https://img.shields.io/badge/Power%20BI-Custom%20Visual-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Features

- **Full cockpit view** with realistic horizon and sky
- **5 flight instruments**: Artificial Horizon, Altimeter, Airspeed Indicator, Heading Indicator, Vertical Speed
- **Realistic physics**: Pitch, roll, throttle, and coordinated turns
- **Dutch countryside scenery** with windmills 🇳🇱, buildings, trees, houses, and hangars
- **Two airports** with runways for takeoff and landing attempts
- **Collision detection** - crash into buildings, windmills, or the ground!
- **Crash screen** with fun data-themed messages
- **Mini-map radar** (toggle with M key)
- **"Data Navigator" panel** - humorous fake analytics metrics for presentations

## 🎯 Controls

| Key | Action |
|-----|--------|
| ↑ / ↓ | Pitch (nose up/down) |
| ← / → | Roll (bank left/right) |
| W / S | Throttle (increase/decrease) |
| A / D | Rudder (yaw left/right) |
| SPACE | Level flight (auto-correct pitch & roll) |
| R | Reset / Restart |
| M | Toggle mini-map |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Power BI Desktop](https://powerbi.microsoft.com/desktop/)
- Power BI Visual Tools (`pbiviz`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dax-tips/pbivizflightsim.git
   cd pbivizflightsim
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Power BI Visual Tools** (if not already installed)
   ```bash
   npm install -g powerbi-visuals-tools
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Enable Developer Visual in Power BI Desktop**
   - Open Power BI Desktop
   - Go to **File → Options and settings → Options**
   - Navigate to **Security** under the GLOBAL section
   - Check **Enable custom visual debugging using the developer visual**
   - Click OK and restart Power BI Desktop

6. **Add the Developer Visual**
   - In Power BI Desktop, click the **Developer Visual** icon in the Visualizations pane
   - The flight simulator will load automatically!

### Building for Production

To package the visual as a `.pbiviz` file for distribution:

```bash
npm run package
```

The packaged visual will be in the `dist/` folder.

## 🏗️ Project Structure

```
pbivizflightsim/
├── assets/
│   └── icon.png           # Visual icon
├── src/
│   ├── visual.ts          # Main visual logic (flight sim code)
│   └── settings.ts        # Visual settings/formatting
├── style/
│   └── visual.less        # Styles
├── capabilities.json      # Power BI capabilities definition
├── pbiviz.json           # Visual metadata
├── package.json          # NPM dependencies
└── tsconfig.json         # TypeScript configuration
```

## 🎯 Crash Messages

Hit something? You'll get fun data-themed crash messages:

- 🌬️ **Windmill**: "Your query got caught in an infinite loop"
- 🗼 **Tower**: "Connection to control tower lost"
- 🏢 **Building**: "Your data warehouse has collapsed"
- 🏚️ **Hangar**: "Storage allocation failed"
- 🏠 **House**: "Local database corrupted"
- 🌲 **Tree**: "Branching error detected"
- 💥 **Ground**: "Your data pipeline has been terminated"

## 🛠️ Development

### Running the linter
```bash
npm run lint
```

### Hot reload
The development server supports hot reload - changes to `visual.ts` will automatically refresh in Power BI Desktop.

## 📝 License

MIT License - feel free to use, modify, and share!

## 🙏 Credits

Built with ❤️ for keynote presentations. Features a Dutch countryside theme with windmills in honor of presentations in the Netherlands! 🇳🇱

---

**Tip**: Click on the visual in Power BI to give it focus, then use the keyboard controls to fly! Press R to restart after a crash.
