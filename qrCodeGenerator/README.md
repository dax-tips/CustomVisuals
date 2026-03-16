# QR Code Generator

A QR code generator with error correction levels, custom centre icons, rounded corners, card styling, and responsive sizing.

## What It Does

The visual takes a text value from your data model and renders it as a QR code. You can scan the code with any phone camera to open a URL, display text, or trigger whatever action the encoded content supports. The visual wraps the QR code in an optional card with a title, subtitle, and centre icon.

## Data Roles

| Field   | Type    | Description                        |
| ------- | ------- | ---------------------------------- |
| QR Text | Measure | The text or URL to encode          |

If no data is bound, the visual displays a default placeholder QR code.

## Features

- Real-time QR code generation using the qrcode-generator library
- Four error correction levels: Low (7%), Medium (15%), Quartile (25%), High (30%)
- Rounded QR modules for a softer appearance (configurable corner radius)
- Centre icon overlay with multiple shape options: circle, square, diamond, or a custom image URL
- Card wrapper with optional title, subtitle, background colour, shadow, and rounded corners
- Quiet zone (white border) control around the QR code
- Foreground and background colour customisation
- Responsive sizing -- the QR code scales to fit the visual container

## Formatting Options

| Category     | Properties                                                     |
| ------------ | -------------------------------------------------------------- |
| QR Settings  | Error correction level, foreground/background colour, quiet zone, finder radius, module radius |
| Card         | Show/hide title and subtitle, custom text, background colour, corner radius, shadow, padding |
| Centre Icon  | Icon type (none/circle/square/diamond/image), icon size (% of QR), background and foreground colours, custom image URL, custom text |

## How to Run

```
cd qrCodeGenerator
npm install
pbiviz start
```

Open Power BI and add the Developer Visual to a report page. Drop a measure containing the text you want to encode onto the QR Text field.

## Tips

- Use higher error correction levels (Quartile or High) if you plan to add a centre icon, as the icon obscures part of the code and the error correction compensates for it.
- For URL encoding, make sure your measure returns the full URL including `https://`.
- The card title and subtitle are set in the formatting pane -- they are static text, not data-driven.
