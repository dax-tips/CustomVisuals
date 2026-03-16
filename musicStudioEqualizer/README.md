# Music Studio Equalizer

A music player with eight real-time audio visualisation styles, five visual themes, playlist management, audio effects, and a DJ mashup mode with dual-track playback and crossfader.

## What It Does

Point this visual at audio file URLs in your data model and it becomes a fully functional music player with a visual equalizer. It analyses the audio in real time using the Web Audio API and renders one of eight visualisation styles that react to the frequencies, beat, and energy of the music.

There is also a DJ mashup mode with two decks and a crossfader, if you feel like mixing tracks during a dashboard review.

## Data Roles

| Field      | Type     | Description                               |
| ---------- | -------- | ----------------------------------------- |
| Music URLs | Grouping | URLs to audio files (MP3, WAV, OGG, etc.) |
| Track Names| Grouping | Display names for each track               |
| Audio Data | Measure  | Numeric data for data-driven features      |
| Categories | Grouping | Grouping for track categorisation          |

## Visualisation Styles

1. **Frequency Bars** -- classic equalizer bars
2. **Circular** -- radial frequency display
3. **Waveform** -- real-time waveform trace
4. **Spectrum** -- full spectrum analyser
5. **Galaxy Spiral** -- cosmic particle visualisation
6. **Matrix Rain** -- characters cascading in time with the music
7. **VU Meters** -- professional level meter display
8. **Liquid Wave** -- fluid wave animation

## Themes

Five built-in themes: Neon, Cyberpunk, Retro 80s, Nature, and Fire. Themes change the colour palette, glow effects, and background gradients. The visual can also auto-switch themes based on the energy and mood of the music.

## Controls

| Key       | Action                  |
| --------- | ----------------------- |
| Space     | Play / Pause            |
| Left / Right | Seek forward / back  |
| Up / Down | Volume up / down        |
| F         | Toggle fullscreen       |
| 1-8       | Switch visualisation    |
| T         | Cycle themes            |
| P         | Toggle particles        |
| S         | Toggle shuffle          |
| R         | Toggle repeat           |
| N / B     | Next / previous track   |
| H         | Toggle help overlay     |

## Features

- Multi-track playlist with shuffle and repeat
- Bass and treble filters (plus/minus 12 dB)
- Reverb and compressor effects
- Real-time beat detection with BPM calculation
- Beat-triggered particle explosions and screen flash
- Advanced particle system with physics, gravity, magnetic fields, and mouse attraction
- Music analysis: tempo, energy, and mood detection
- Mouse-responsive visualisations with click ripple effects
- Album art display and track metadata

## Audio Format Support

MP3, WAV, OGG, M4A, FLAC -- anything the browser's Web Audio API can decode.

## How to Run

```
cd musicStudioEqualizer
npm install
pbiviz start
```

Open Power BI and add the Developer Visual to a report page. Provide audio file URLs through the Music URLs data role, or use the built-in demo tracks to test.
