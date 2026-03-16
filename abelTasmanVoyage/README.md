# Abel Tasman Voyage

An animated visualisation of Abel Tasman's 1642 voyage from Jakarta to New Zealand, with a 2D old-world map view and a rotating 3D globe view showing a modern return flight to the Netherlands.

## What It Does

The visual renders two views of the same journey:

- **Old World Map** -- a flat mercator-style projection showing the historical sailing route from Jakarta through Tasmania to New Zealand, with an animated ship tracing the path.
- **3D Globe** -- an orthographic projection that rotates to follow the journey, then shows a modern flight path returning from New Zealand to the Netherlands with an animated plane.

Click the visual to toggle between views.

## Data Roles

| Field    | Type     | Description                       |
| -------- | -------- | --------------------------------- |
| Category | Grouping | Category values for data binding  |
| Measure  | Measure  | Numeric values for data binding   |

The visual is primarily self-contained -- the voyage route is built into the code. Data roles are available for binding but the core animation runs independently.

## Features

- D3.js geodesic path rendering with topojson world map data
- Animated ship sprite following the 1642 sailing route
- Animated plane sprite on the modern return flight
- Smooth transitions between map projections
- Natural Earth coastline and country boundary rendering
- Responsive sizing to fit any report layout

## How to Run

```
cd abelTasmanVoyage
npm install
pbiviz start
```

Open Power BI and add the Developer Visual to a report page.

## Background

Abel Tasman was a Dutch navigator who, in 1642, became the first known European to reach New Zealand. He sailed from Batavia (modern-day Jakarta) via Tasmania -- which was later named after him -- before arriving at New Zealand's west coast. This visual tells that story, then brings the journey full circle with a modern flight home.
