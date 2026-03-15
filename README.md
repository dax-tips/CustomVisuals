# Power BI Custom Visuals

A collection of Power BI custom visuals built with Visual Studio Code and GitHub Copilot. These visuals range from practical data charts to interactive games and simulations -- all running inside Power BI.

The source code for every visual is included. You are welcome to download, modify, learn from, and build upon any of them.


## What's Included

### Data Visuals

| Visual | Description |
|--------|-------------|
| **[histogram](histogram/)** | A D3-based histogram that bins numeric values into configurable buckets and displays frequency distribution with gradient colouring. |
| **[pieChart](pieChart/)** | A D3 pie chart with cross-filtering support, tooltips, and click selection for use in Power BI reports. |
| **[scatterPlotSmallMultiples](scatterPlotSmallMultiples/)** | A scatter plot chart with a small multiples layout, displaying multiple scatter plots in a grid for comparing categories side by side. |
| **[kpiAchievementCard](kpiAchievementCard/)** | A KPI achievement card showing actual vs target values with progress bars, threshold markers, and achievement badges. Supports display unit formatting and customisable grid layouts. |
| **[multiFacetColumnChart](multiFacetColumnChart/)** | A multi-faceted column chart for comparing measures across categories. |
| **[qrCodeGenerator](qrCodeGenerator/)** | A QR code generator with error correction levels, custom centre icons, rounded corners, card styling, and responsive sizing. |

### Games and Interactive Visuals

| Visual | Description |
|--------|-------------|
| **[flightSimulator](flightSimulator/)** | A 3D flight simulator with a cockpit view, five working instruments, terrain generation, cloud rendering, collision detection, and engine audio synthesis. Features Dutch countryside scenery with windmills and airports. |
| **[retroArcade](retroArcade/)** | Five retro-styled arcade games in one visual: Snake, Tetris, Space Shooter, Neon Drift, and Synth Labyrinth. Includes CRT scan line effects and a boss key that shows a fake spreadsheet. |
| **[musicStudioEqualizer](musicStudioEqualizer/)** | A music player with eight real-time audio visualisation styles, five visual themes, playlist management, audio effects, and a DJ mashup mode with dual-track playback and crossfader. |
| **[gameArcadeSixPack](gameArcadeSixPack/)** | Six mini-games: Memory Match, Whack-A-Mole, Reaction Time, Tower Defense, City Builder, and Minesweeper. |
| **[minesweeper](minesweeper/)** | Classic Minesweeper with customisable difficulty levels, a timer, and visual themes. |
| **[matrixAndMaze](matrixAndMaze/)** | A maze game where you navigate office politics to find four Power BI treasures before I.T. Admin shuts you down. |
| **[abelTasmanVoyage](abelTasmanVoyage/)** | An animated visualisation of Abel Tasman's 1642 voyage from Jakarta to New Zealand, with a 2D old-world map view and a rotating 3D globe view showing a modern return flight to the Netherlands. |


## Setting Up Your Machine

These instructions are for Windows. You only need to do this once.

### 1. Install Node.js

Download and install the LTS version from [nodejs.org](https://nodejs.org/). After installation, open a new terminal and verify it's working:

```
node --version
npm --version
```

### 2. Install the Power BI Visual Tools (pbiviz)

```
npm install -g powerbi-visuals-tools
```

Verify the installation:

```
pbiviz --version
```

### 3. Set up the SSL certificate

Power BI developer visuals are served over HTTPS from your local machine. You need to generate and trust a local SSL certificate so the browser doesn't block the connection:

```
pbiviz --install-cert
```

This creates a certificate and opens the Certificate Import Wizard. Follow the prompts:
- Select "Local Machine" and click Next
- Click "Place all certificates in the following store", click Browse, and select "Trusted Root Certification Authorities"
- Click Next, then Finish

You may need to run the command as Administrator. You only need to do this once per machine.

### 4. Enable the Developer Visual in Power BI

#### Power BI Service (app.powerbi.com)

1. Open any report in Edit mode
2. Click Format > Settings (gear icon) or go to File > Options and settings > Options
3. Under the Report settings section, enable "Developer visual"

#### Power BI Desktop

1. Go to File > Options and settings > Options
2. Under the "Report settings" section, tick "Enable developer visual for testing"
3. Click OK and restart Power BI Desktop if prompted

Once enabled, a new visual called "Developer Visual" (with a tools icon) appears in the Visualisations pane. This visual connects to the local development server started by `pbiviz start`.


## Creating a New Custom Visual from Scratch

To create a brand new visual project:

```
pbiviz new MyVisualName
cd MyVisualName
npm install
pbiviz start
```

This creates a project folder with the standard structure, installs dependencies, and starts the development server. Open Power BI, add the Developer Visual to your report, and you'll see your visual running live with hot-reload as you edit the code.


## Working with Visuals from This Repo

### Clone the repo

```
git clone https://github.com/dax-tips/CustomVisuals.git
cd CustomVisuals
```

### Run a visual

Each folder is a standalone project. Navigate into the one you want to work with:

```
cd retroArcade
npm install
pbiviz start
```

The development server starts on `https://localhost:8080`. Open Power BI (Desktop or Service), add the Developer Visual to a report page, and it will load your visual.

Press Ctrl+C in the terminal to stop the server.

### Build a .pbiviz package

To create a packaged `.pbiviz` file that can be imported into Power BI without the development server:

```
cd retroArcade
pbiviz package
```

The output file appears in the `dist/` folder. You can then import it into Power BI via:
- Power BI Desktop: Visualisations pane > "..." > "Import a visual from a file"
- Power BI Service: Report edit mode > Visualisations pane > "..." > "Import a visual from a file"


## Project Structure

Each visual follows the standard Power BI custom visual structure:

```
myVisual/
    assets/          Icon and other static assets
    src/
        visual.ts    Main visual code (TypeScript)
    style/
        visual.less  Styles (LESS)
    capabilities.json    Data roles and formatting options
    pbiviz.json          Visual metadata (name, version, author)
    package.json         Node.js dependencies
    tsconfig.json        TypeScript configuration
```

The key files to look at when exploring a visual:
- **src/visual.ts** -- where the rendering logic lives
- **capabilities.json** -- defines what data fields the visual accepts and what formatting options appear in the properties pane
- **pbiviz.json** -- the visual's display name, description, and author info


## Tips for Development

- The Developer Visual in Power BI auto-refreshes when you save changes to your code
- Use your browser's developer tools (F12) to inspect the visual, set breakpoints, and view console output
- If the visual doesn't appear or shows a broken state, try refreshing the report page
- Each visual can only connect to one `pbiviz start` server at a time -- stop one before starting another
- The `capabilities.json` file controls what appears in the Fields and Format panes for your visual


## Contributing

Contributions are welcome. Whether you want to fix a bug, add a feature, improve documentation, or build something entirely new on top of these visuals -- go for it.

- Fork the repo and create a pull request
- Open an issue if you find a problem or have a suggestion
- Share what you build

This project exists to help people learn how to create Power BI custom visuals. There are no gatekeepers here.


## License

These visuals are provided as-is for learning and experimentation. Use them however you like.


## Author

Phil Seamark -- [dax.tips](https://dax.tips)
