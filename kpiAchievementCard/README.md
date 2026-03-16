# KPI Achievement Card

A KPI card visual showing actual vs target values with progress bars, threshold markers, and achievement badges. Supports display unit formatting and customisable grid layouts.

## What It Does

Each row in your data becomes a card. Each card shows the actual value, a progress bar comparing it against the target, and a badge indicating whether the target was achieved. Multiple cards are arranged in a configurable grid.

## Data Roles

| Field        | Type     | Description                              |
| ------------ | -------- | ---------------------------------------- |
| Category     | Grouping | Label for each KPI card                  |
| Actual Value | Measure  | The current value                        |
| Target Value | Measure  | The target to compare against            |

## Features

- Grid layout with configurable number of columns and spacing
- Progress bar with percentage fill based on actual vs target
- Threshold marker line on the progress bar (configurable percentage)
- Achievement badge showing percentage of target met, colour-coded for achieved/not achieved
- Details row showing the target value and how much the actual exceeds or falls short
- Gradient card backgrounds with customisable start and end colours
- Display unit formatting (thousands, millions, etc.) with decimal precision control
- Responsive sizing -- cards reflow as the visual is resized

## Formatting Options

| Category      | Properties                                                    |
| ------------- | ------------------------------------------------------------- |
| Card          | Gradient start/end colours, border radius                     |
| Title         | Font size, colour                                             |
| Values        | Font size, colour, display units, decimal places              |
| Badge         | Show/hide, achieved colour, not-achieved colour               |
| Details       | Show/hide, font size, label colour, value colour              |
| Progress Bar  | Show/hide, bar colour, track colour, height, threshold %, threshold marker colour |
| Grid          | Columns, gap, inner padding                                   |

## How to Run

```
cd kpiAchievementCard
npm install
pbiviz start
```

Open Power BI and add the Developer Visual to a report page. Drop a category field, an actual measure, and a target measure onto the visual.
