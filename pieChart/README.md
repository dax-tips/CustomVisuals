# Pie Chart

A D3 pie chart with cross-filtering support, tooltips, and click selection for use in Power BI reports.

## What It Does

Drop a category and a measure onto the visual and it renders a standard pie chart. Click a slice to cross-filter other visuals on the report page. Hover over a slice to see its tooltip with the category name and value.

## Data Roles

| Field    | Type     | Description                        |
| -------- | -------- | ---------------------------------- |
| Category | Grouping | Slice labels                       |
| Measure  | Measure  | Slice sizes                        |

## Features

- D3.js pie layout with arc generation
- Click a slice to cross-filter other visuals on the page (uses the Power BI selection manager)
- Tooltips on hover showing category and value
- Labels positioned around the pie
- Colour palette integration with the Power BI host theme
- Animated arc transitions when data updates
- Responsive sizing to fit the visual container

## Formatting Options

| Property        | Description                            |
| --------------- | -------------------------------------- |
| Default Colour  | Base colour for slices                 |
| Font Size       | Label text size                        |
| Show All Points | Toggle full data point display         |

## How to Run

```
cd pieChart
npm install
pbiviz start
```

Open Power BI and add the Developer Visual to a report page. Drop a category field and a measure onto the visual.
