# Minesweeper Power BI Custom Visual

A fully functional Minesweeper game implemented as a Power BI Custom Visual. Perfect for adding some interactive entertainment to your dashboards!

## Features

### 🎮 Complete Minesweeper Gameplay
- **Grid-based gameplay** with left-click to reveal and right-click to flag
- **Mine detection** with numbered hints showing nearby mine counts
- **Auto-reveal** of empty areas when clicking on cells with no neighboring mines
- **Flag system** with cycle through flag → question mark → normal
- **Win/lose detection** with visual feedback
- **Game timer** tracking your progress
- **Mine counter** showing remaining unflagged mines

### 🎯 Difficulty Levels
- **Beginner**: 9×9 grid with 10 mines
- **Intermediate**: 16×16 grid with 40 mines  
- **Expert**: 30×16 grid with 99 mines

### 🎨 Visual Customization
- **Cell Size**: Adjustable from 15-50 pixels
- **Color Themes**: Customize border, cell, revealed cell, mine, and flag colors
- **Display Options**: Toggle timer and mine counter visibility
- **Responsive Design**: Automatically adapts to visual container size

### ⚙️ Power BI Integration
- **Settings Panel**: All game options available in Power BI's format panel
- **Real-time Updates**: Settings changes apply immediately without restart
- **Professional Styling**: Matches Power BI's visual design standards
- **Performance Optimized**: Efficient rendering and minimal resource usage

## How to Play

### Basic Controls
- **Left Click**: Reveal a cell
- **Right Click**: Cycle through flag (🚩) → question mark (?) → normal
- **Smiley Button**: Restart the game at any time

### Game Rules
1. **Objective**: Reveal all cells that don't contain mines
2. **Numbers**: Indicate how many mines are adjacent to that cell
3. **Flags**: Mark suspected mine locations (right-click)
4. **Auto-reveal**: Clicking on numbered cells with correct flag count reveals remaining neighbors
5. **Win Condition**: All non-mine cells revealed
6. **Lose Condition**: Any mine cell revealed

### Strategy Tips
- Start by clicking corners and edges (statistically safer)
- Use the numbers to deduce mine locations logically
- Flag confirmed mines to help track remaining count
- Use the question mark (?) for uncertain locations

## Settings Reference

### Game Settings
- **Difficulty**: Choose between Beginner, Intermediate, or Expert
- **Show Timer**: Display/hide the game timer
- **Show Mine Counter**: Display/hide remaining mine count
- **Auto Restart**: Automatically start new game after game over (future feature)

### Visual Appearance
- **Cell Size**: Size of each game cell (15-50 pixels)
- **Border Color**: Color of cell borders and grid lines
- **Cell Color**: Background color of unrevealed cells
- **Revealed Cell Color**: Background color of revealed empty cells
- **Mine Color**: Background color of exploded mine cells
- **Flag Color**: Color of flag symbols

## Technical Details

### Built With
- **TypeScript**: Type-safe game logic and Power BI integration
- **Power BI Visuals SDK**: Official Microsoft framework for custom visuals
- **CSS/LESS**: Professional styling with animations and responsive design
- **HTML5**: Modern web standards for optimal performance

### Performance Features
- **Efficient Grid Rendering**: Only updates changed cells
- **Memory Management**: Proper cleanup of timers and event listeners
- **Responsive Updates**: Smooth setting changes without flickering
- **Browser Compatibility**: Works across all modern browsers

### Game Logic Highlights
- **Secure Mine Placement**: First click is always safe
- **Flood Fill Algorithm**: Efficient auto-reveal for empty areas
- **Neighbor Counting**: Optimized mine detection algorithm
- **State Management**: Clean separation of game state and UI

## Installation & Development

1. **Build the Visual**: Run `pbiviz package` to create the visual package
2. **Import to Power BI**: Upload the generated .pbiviz file to your Power BI report
3. **Add to Dashboard**: Drag the visual to your canvas
4. **Configure Settings**: Use the format panel to customize appearance and difficulty

## Future Enhancements

- **High Scores**: Track best times for each difficulty
- **Statistics**: Games played, win rate, average time
- **Custom Difficulty**: User-defined grid sizes and mine counts
- **Themes**: Pre-built color schemes and visual styles
- **Sound Effects**: Optional audio feedback for actions
- **Accessibility**: Screen reader support and keyboard navigation

## Support

This visual is fully self-contained and requires no external data connections. It works in any Power BI report and provides entertainment value while demonstrating advanced custom visual capabilities.

Perfect for team meetings, dashboard breaks, or showcasing Power BI's extensibility!

---
**Created with ❤️ using Power BI Custom Visuals SDK**