# Flight Simulator

A 3D flight simulator built as a Power BI custom visual. Features a cockpit view, five working instruments, terrain generation, collision detection, and engine audio synthesis. The scenery is a Dutch countryside with windmills, buildings, and two airports.

## What It Does

Drop this visual onto a Power BI report page, click it to focus, and fly. You get a first-person cockpit view with a horizon, ground terrain, sky, and scattered 3D objects. Five flight instruments on the cockpit panel respond in real time to your inputs.

This was built for keynotes and demos -- it tends to get a good reaction when you alt-tab from a slide deck into a live Power BI report and start flying around.

## Controls

| Key          | Action                          |
| ------------ | ------------------------------- |
| Up / Down    | Pitch (nose up / nose down)     |
| Left / Right | Roll (bank left / right)        |
| W / S        | Throttle (increase / decrease)  |
| A / D        | Rudder (yaw left / right)       |
| Space        | Level flight (auto-correct)     |
| R            | Reset / restart                 |
| M            | Toggle mini-map                 |

## Instruments

- **Artificial Horizon** -- shows pitch and roll attitude
- **Altimeter** -- current altitude above ground
- **Airspeed Indicator** -- current forward speed
- **Heading Indicator** -- compass bearing
- **Vertical Speed** -- rate of climb or descent

## Features

- WebGL-accelerated ground rendering with texture mipmaps
- Synthesised engine audio that responds to throttle position
- Collision detection with buildings, windmills, trees, and the ground
- Crash screen with data-themed messages ("Your data warehouse has collapsed", "Branching error detected", and others)
- Mini-map radar display showing nearby objects
- "Data Navigator" panel with tongue-in-cheek fake analytics metrics, handy for presentations
- Two airports with rendered runways
- Dutch countryside scenery: windmills, houses, hangars, trees

## Data Roles

| Field    | Type     | Description                       |
| -------- | -------- | --------------------------------- |
| Category | Grouping | Category values for data binding  |
| Measure  | Measure  | Numeric values for data binding   |

The flight simulator runs independently of bound data. Data roles are available for future integration.

## How to Run

```
cd flightSimulator
npm install
pbiviz start
```

Open Power BI and add the Developer Visual to a report page. Click the visual to give it keyboard focus, then use the controls above.

## Note on Large Files

The ground texture data (`assets/ground-map.png` and `src/ground-map-data.ts`) totals around 70 MB and is excluded from the git repository. The visual will still build and run -- it falls back to generated terrain when the texture files are absent.
