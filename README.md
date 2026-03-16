# Power BI Custom Visuals

A collection of Power BI custom visuals built with Visual Studio Code and GitHub Copilot. These visuals range from practical data charts to interactive games and simulations -- all running inside Power BI.

The source code for every visual is included. You are welcome to download, modify, learn from, and build upon any of them.

## What's Included

### Data Visuals

| Visual                                                         | Description                                                                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[histogram](histogram/)**                                 | A D3-based histogram that bins numeric values into configurable buckets and displays frequency distribution with gradient colouring.                                                  |
| **[pieChart](pieChart/)**                                   | A D3 pie chart with cross-filtering support, tooltips, and click selection for use in Power BI reports.                                                                               |
| **[scatterPlotSmallMultiples](scatterPlotSmallMultiples/)** | A scatter plot chart with a small multiples layout, displaying multiple scatter plots in a grid for comparing categories side by side.                                                |
| **[kpiAchievementCard](kpiAchievementCard/)**               | A KPI achievement card showing actual vs target values with progress bars, threshold markers, and achievement badges. Supports display unit formatting and customisable grid layouts. |
| **[multiFacetColumnChart](multiFacetColumnChart/)**         | A multi-faceted column chart for comparing measures across categories.                                                                                                                |
| **[qrCodeGenerator](qrCodeGenerator/)**                     | A QR code generator with error correction levels, custom centre icons, rounded corners, card styling, and responsive sizing.                                                          |

### Games and Interactive Visuals

| Visual                                               | Description                                                                                                                                                                                                                |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[flightSimulator](flightSimulator/)**           | A 3D flight simulator with a cockpit view, five working instruments, terrain generation, cloud rendering, collision detection, and engine audio synthesis. Features Dutch countryside scenery with windmills and airports. |
| **[retroArcade](retroArcade/)**                   | Five retro-styled arcade games in one visual: Snake, Tetris, Space Shooter, Neon Drift, and Synth Labyrinth. Includes CRT scan line effects and a boss key that shows a fake spreadsheet.                                  |
| **[musicStudioEqualizer](musicStudioEqualizer/)** | A music player with eight real-time audio visualisation styles, five visual themes, playlist management, audio effects, and a DJ mashup mode with dual-track playback and crossfader.                                      |
| **[gameArcadeSixPack](gameArcadeSixPack/)**       | Six mini-games: Memory Match, Whack-A-Mole, Reaction Time, Tower Defense, City Builder, and Minesweeper.                                                                                                                   |
| **[minesweeper](minesweeper/)**                   | Classic Minesweeper with customisable difficulty levels, a timer, and visual themes.                                                                                                                                       |
| **[matrixAndMaze](matrixAndMaze/)**               | A maze game where you navigate office politics to find four Power BI treasures before I.T. Admin shuts you down.                                                                                                           |
| **[abelTasmanVoyage](abelTasmanVoyage/)**         | An animated visualisation of Abel Tasman's 1642 voyage from Jakarta to New Zealand, with a 2D old-world map view and a rotating 3D globe view showing a modern return flight to the Netherlands.                           |

## Quick Start — Just Want to Try a Visual?

Each visual has a ready-to-use `.pbiviz` file in its `dist/` folder. No development setup required.

1. Browse to the visual's `dist/` folder in this repo and download the `.pbiviz` file.
2. In **Power BI Desktop**, go to **Visualisations** pane → **…** → **Import a visual from a file** and select the downloaded file.
3. In **Power BI Service**, open your report in edit mode → **Visualisations** pane → **…** → **Import a visual from a file**.

The visual will appear in your Visualisations pane ready to use.

---

## Setting Up Your Machine

These instructions are for Windows and are only needed if you want to modify or build the visuals yourself. You only need to do this once.

Full details are on the official Microsoft documentation page: [Set up your environment for developing a Power BI visual](https://learn.microsoft.com/en-us/power-bi/developer/visuals/environment-setup).

### Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/) (or another IDE)
- [Windows PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-windows-powershell) version 4 or later
- A [Power BI Pro or Premium Per User (PPU)](https://www.microsoft.com/power-platform/products/power-bi/pricing) account (free trial available)

### 1. Install Node.js

Download the latest LTS version from [nodejs.org](https://nodejs.org/) and run the installer. Accept the defaults and **restart your computer** after installation.

Open a new terminal and verify it's working:

```
node --version
npm --version
```

### 2. Install the Power BI Visual Tools (pbiviz)

Open PowerShell and run:

```
npm i -g powerbi-visuals-tools@latest
```

You may see some warnings during installation -- these can be safely ignored.

Verify the installation by running `pbiviz` on its own. You should see a list of supported commands.

### 3. SSL Certificate (if needed)

The developer visual is served over HTTPS from your local machine. If your browser blocks the connection or the visual fails to load, you may need to generate and trust a local SSL certificate:

```
pbiviz --install-cert
```

This opens the Certificate Import Wizard. Follow the prompts:

- Select "Local Machine" and click Next
- Click "Place all certificates in the following store", click Browse, and select "Trusted Root Certification Authorities"
- Click Next, then Finish

You may need to run the command as Administrator. You only need to do this once per machine.

### 4. Enable Developer Mode in Power BI

You need to enable developer mode so that Power BI loads your locally hosted visual.

#### Power BI Desktop

1. Go to File > Options and settings > Options
2. In the left panel, under "Current file", select "Report settings"
3. Tick the "Develop a visual" checkbox
4. Click OK

Note: this setting resets each session. You need to enable it again each time you open Power BI Desktop.

#### Power BI Service (app.powerbi.com)

1. Go to Settings (gear icon) > Admin portal, or ask your admin to enable it
2. Under Tenant settings, enable "Developer mode" for your organisation or security group

Once enabled, a new visual called "Developer Visual" (with a tools icon) appears in the Visualisations pane. This visual connects to the local development server started by `pbiviz start`.

---

## Building Your Own Visual

This is the fun part. Once Node.js and pbiviz are installed, you can create a custom visual entirely by describing what you want in plain English.

### 1. Create and start a new visual project

```
pbiviz new MyVisualName
cd MyVisualName
npm install
pbiviz start
```

This starts a local development server. Open **Power BI Service** (app.powerbi.com), add the **Developer Visual** to a report page, and you will see your visual rendering live. Every time you save a code change, the visual refreshes automatically.

### 2. Describe what you want to an LLM

Open VS Code, start a chat with GitHub Copilot (or your preferred LLM), and make sure it is running in **Agent mode**. Then just describe what you want your visual to do — in natural language. For example:

> "Create a bar chart that shows sales by region with gradient colours and tooltips showing the exact value."

> "Build a traffic light indicator that turns green when the KPI value exceeds the target, amber when it's within 10%, and red otherwise."

> "Make a retro arcade game that runs inside Power BI."

You don't need to know TypeScript, D3, or the Power BI visuals API to get started. The LLM handles the code — you describe the outcome. Use your microphone (speech-to-text) if you prefer talking over typing.

Keep the `pbiviz start` server running while you iterate. Each time the LLM edits your code and saves, the visual updates in Power BI within seconds. This tight feedback loop is what makes the process so productive — you can see every change immediately.

### 3. Keep going

Ask for changes, add features, fix things that don't look right. The conversation is cumulative — the LLM remembers what it has already built and can refine it step by step. Every visual in this repo was built this way.

### Pro tip: check your code into GitHub

Create a free GitHub repository for your visual and commit your code regularly. This gives you a safety net — if something breaks, you can revert to a previous version. GitHub Copilot can help you set up the repo and walk you through the git commands if you haven't done it before.

---

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
