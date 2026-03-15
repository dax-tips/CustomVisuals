/*
*  Power BI Visual CLI - Abel Tasman Voyage
*  An interactive visual showing Abel Tasman's 1642 voyage from Jakarta to New Zealand
*  and a modern flight from New Zealand back to the Netherlands
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";
import "./../style/visual.less";

// Import real world map data from world-atlas (Natural Earth)
import * as topojson from "topojson-client";
import worldData from "world-atlas/countries-110m.json";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

// Coordinate types
interface GeoPoint {
    name: string;
    coords: [number, number]; // [longitude, latitude]
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    
    // SVG elements
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private mapGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private globeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private shipGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private planeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    
    // State
    private isGlobeView: boolean = false;
    private width: number = 0;
    private height: number = 0;
    private isAnimating: boolean = false;
    private hasRendered: boolean = false;
    
    // Key locations
    private readonly jakarta: GeoPoint = { name: "Jakarta (Batavia)", coords: [106.8456, -6.2088] };
    private readonly newZealand: GeoPoint = { name: "New Zealand", coords: [174.7633, -41.2865] }; // Wellington area
    private readonly netherlands: GeoPoint = { name: "Netherlands", coords: [4.9041, 52.3676] }; // Amsterdam
    private readonly tasmania: GeoPoint = { name: "Tasmania", coords: [146.8087, -42.0409] };
    
    // Abel Tasman's approximate route (1642)
    private readonly tasmanRoute: [number, number][] = [
        [106.8456, -6.2088],    // Jakarta (Batavia)
        [105.0, -10.0],         // Heading south
        [100.0, -20.0],         // Into Indian Ocean
        [90.0, -35.0],          // Deep south
        [100.0, -42.0],         // Roaring Forties
        [120.0, -44.0],         // Continuing east
        [140.0, -43.0],         // Approaching Tasmania
        [146.8087, -42.0409],   // Tasmania (discovered)
        [155.0, -43.0],         // Heading to NZ
        [165.0, -42.5],         // Tasman Sea
        [170.5, -42.0],         // Approaching NZ
        [174.7633, -41.2865]    // New Zealand (Golden Bay area)
    ];
    
    // Globe projection
    private projection: d3.GeoProjection;
    private path: d3.GeoPath;
    private currentRotation: [number, number, number] = [0, 0, 0];

    constructor(options: VisualConstructorOptions) {
        console.log('Abel Tasman Voyage Visual initialized');
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        
        // Create main SVG container
        this.svg = d3.select(this.target)
            .append("svg")
            .attr("class", "voyage-visual");
            
        // Create groups for different layers
        this.mapGroup = this.svg.append("g").attr("class", "map-group");
        this.globeGroup = this.svg.append("g").attr("class", "globe-group").style("opacity", 0);
        this.shipGroup = this.svg.append("g").attr("class", "ship-group");
        this.planeGroup = this.svg.append("g").attr("class", "plane-group").style("opacity", 0);
        
        // Add click handler for view transition
        this.svg.on("click", () => this.toggleView());
    }

    public update(options: VisualUpdateOptions) {
        // Get formatting settings if data is available
        if (options.dataViews && options.dataViews[0]) {
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel, 
                options.dataViews[0]
            );
        }
        
        const newWidth = options.viewport.width;
        const newHeight = options.viewport.height;
        
        // Don't render if we don't have valid dimensions
        if (newWidth <= 0 || newHeight <= 0) return;
        
        // Check if size changed significantly or first render
        const sizeChanged = Math.abs(this.width - newWidth) > 5 || Math.abs(this.height - newHeight) > 5;
        
        this.width = newWidth;
        this.height = newHeight;
        
        this.svg
            .attr("width", this.width)
            .attr("height", this.height);
            
        // Initialize projection for globe
        this.projection = d3.geoOrthographic()
            .scale(Math.min(this.width, this.height) / 2.5)
            .translate([this.width / 2, this.height / 2])
            .clipAngle(90)
            .rotate([-this.newZealand.coords[0], -this.newZealand.coords[1], 0]);
            
        this.path = d3.geoPath().projection(this.projection);
        
        // Only render if first time or size changed significantly
        if (!this.hasRendered || sizeChanged) {
            this.hasRendered = true;
            // Render appropriate view
            if (this.isGlobeView) {
                this.renderGlobe();
            } else {
                this.renderOldWorldMap();
            }
        }
    }
    
    private renderOldWorldMap(): void {
        this.mapGroup.selectAll("*").remove();
        this.shipGroup.selectAll("*").remove();
        
        // Create defs for filters and clips
        const defs = this.mapGroup.append("defs");
        
        // Add clip path to prevent rendering outside visible area (fixes vertical line)
        defs.append("clipPath")
            .attr("id", "map-clip")
            .append("rect")
            .attr("width", this.width)
            .attr("height", this.height);
        
        // Parchment/aged paper background for old world map
        this.mapGroup.append("rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("fill", "#d4c4a0"); // Aged parchment color
        
        // Create a noise filter for paper texture
        const filter = defs.append("filter")
            .attr("id", "paper-texture")
            .attr("x", "0%")
            .attr("y", "0%")
            .attr("width", "100%")
            .attr("height", "100%");
        
        filter.append("feTurbulence")
            .attr("type", "fractalNoise")
            .attr("baseFrequency", "0.04")
            .attr("numOctaves", "5")
            .attr("result", "noise");
        
        filter.append("feDiffuseLighting")
            .attr("in", "noise")
            .attr("lighting-color", "#d4c4a0")
            .attr("surfaceScale", "2")
            .attr("result", "light")
            .append("feDistantLight")
            .attr("azimuth", "45")
            .attr("elevation", "60");
        
        filter.append("feBlend")
            .attr("in", "SourceGraphic")
            .attr("in2", "light")
            .attr("mode", "multiply");
        
        // Ocean areas in a muted blue-green
        this.mapGroup.append("rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("fill", "#b8cdc8")
            .attr("opacity", "0.3")
            .attr("filter", "url(#paper-texture)");
        
        // Create a container with clipping for the map content
        const clippedGroup = this.mapGroup.append("g")
            .attr("clip-path", "url(#map-clip)");
            
        // Create a Mercator projection for the flat map - adjusted to fill viewport
        const mapProjection = d3.geoMercator()
            .center([130, -20])
            .scale(Math.min(this.width, this.height) * 0.55)
            .translate([this.width / 2, this.height / 2]);
            
        const mapPath = d3.geoPath().projection(mapProjection);
        
        // Draw detailed world landmasses with countries (in clipped group)
        this.drawDetailedWorld(clippedGroup as any, mapPath, "old-map");
        
        // Draw decorative elements (compass rose, sea monsters, etc.)
        this.drawMapDecorations();
        
        // Draw the route path
        const lineGenerator = d3.line<[number, number]>()
            .x(d => mapProjection(d)![0])
            .y(d => mapProjection(d)![1])
            .curve(d3.curveCatmullRom.alpha(0.5));
            
        // Route line (dashed, old style)
        const routePath = this.mapGroup.append("path")
            .datum(this.tasmanRoute)
            .attr("class", "route-path")
            .attr("d", lineGenerator)
            .attr("fill", "none");
            
        // Animate the route being drawn
        const pathLength = (routePath.node() as SVGPathElement).getTotalLength();
        routePath
            .attr("stroke-dasharray", pathLength)
            .attr("stroke-dashoffset", pathLength)
            .transition()
            .duration(3000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
            
        // Draw key locations
        this.drawLocation(this.mapGroup, mapProjection(this.jakarta.coords)!, this.jakarta.name, "start");
        this.drawLocation(this.mapGroup, mapProjection(this.tasmania.coords)!, this.tasmania.name, "waypoint");
        this.drawLocation(this.mapGroup, mapProjection(this.newZealand.coords)!, this.newZealand.name, "end");
        
        // Add historical note near New Zealand
        const nzPos = mapProjection(this.newZealand.coords)!;
        this.mapGroup.append("text")
            .attr("class", "voyage-info voyage-detail")
            .attr("x", nzPos[0] + 15)
            .attr("y", nzPos[1] + 40)
            .attr("text-anchor", "start")
            .style("font-size", "10px")
            .text("Sighted west coast only");
        
        this.mapGroup.append("text")
            .attr("class", "voyage-info voyage-detail")
            .attr("x", nzPos[0] + 15)
            .attr("y", nzPos[1] + 52)
            .attr("text-anchor", "start")
            .style("font-size", "10px")
            .text("Named 'Staten Landt'");
        
        // Animate the ship along the route
        this.animateShip(this.tasmanRoute, mapProjection);
        
        // Add title with decorative background
        const titleText = "The Voyage of Abel Tasman - 1642";
        const titleWidth = 700;
        const titleHeight = 50;
        const titleX = this.width / 2;
        const titleY = 35;
        
        // Title background box
        this.mapGroup.append("rect")
            .attr("x", titleX - titleWidth / 2)
            .attr("y", titleY - 28)
            .attr("width", titleWidth)
            .attr("height", titleHeight)
            .attr("fill", "#f4e4bc")
            .attr("stroke", "#3d2914")
            .attr("stroke-width", 3)
            .attr("rx", 8);
        
        // Decorative corners
        const cornerSize = 12;
        [[titleX - titleWidth/2 + 8, titleY - 20], [titleX + titleWidth/2 - 8, titleY - 20],
         [titleX - titleWidth/2 + 8, titleY + 12], [titleX + titleWidth/2 - 8, titleY + 12]].forEach(([cx, cy]) => {
            this.mapGroup.append("circle")
                .attr("cx", cx)
                .attr("cy", cy)
                .attr("r", 3)
                .attr("fill", "#8b7355");
        });
        
        this.mapGroup.append("text")
            .attr("class", "map-title")
            .attr("x", titleX)
            .attr("y", titleY + 5)
            .attr("text-anchor", "middle")
            .text(titleText);
            
        // Add instruction text
        this.mapGroup.append("text")
            .attr("class", "instruction-text")
            .attr("x", this.width / 2)
            .attr("y", this.height - 20)
            .attr("text-anchor", "middle")
            .text("Click anywhere to see the return journey");
    }
    
    private drawStars(group: d3.Selection<SVGGElement, unknown, null, undefined>, count: number): void {
        // Create a starfield group behind everything
        const starGroup = group.append("g").attr("class", "starfield");
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const radius = Math.random() * 1.5 + 0.5; // Stars between 0.5 and 2 pixels
            const shouldTwinkle = Math.random() > 0.7; // 30% of stars twinkle
            
            starGroup.append("circle")
                .attr("class", shouldTwinkle ? "star star-twinkle" : "star")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", radius)
                .style("animation-delay", shouldTwinkle ? `${Math.random() * 3}s` : "none");
        }
    }
    
    private renderGlobe(): void {
        this.globeGroup.selectAll("*").remove();
        this.planeGroup.selectAll("*").remove();
        
        // Draw starfield background
        this.drawStars(this.globeGroup, 150);
        
        // Ocean background
        this.globeGroup.append("circle")
            .attr("class", "globe-ocean")
            .attr("cx", this.width / 2)
            .attr("cy", this.height / 2)
            .attr("r", Math.min(this.width, this.height) / 2.5);
            
        // Draw detailed globe landmasses with countries
        this.drawDetailedWorld(this.globeGroup, this.path, "globe");
        
        // Draw graticule (latitude/longitude lines)
        const graticule = d3.geoGraticule();
        this.globeGroup.append("path")
            .datum(graticule())
            .attr("class", "graticule")
            .attr("d", this.path);
            
        // Animate globe rotation to show the flight path
        this.animateGlobeAndPlane();
        
        // Add title with glowing background
        const globeTitleText = "Return to the Netherlands - 2026";
        const globeTitleX = this.width / 2;
        const globeTitleY = 40;
        const globeTitleBoxWidth = 530;
        
        // Title background box - centered
        this.globeGroup.append("rect")
            .attr("x", globeTitleX - globeTitleBoxWidth / 2)
            .attr("y", globeTitleY - 28)
            .attr("width", globeTitleBoxWidth)
            .attr("height", 50)
            .attr("fill", "rgba(50, 50, 50, 0.85)")
            .attr("rx", 10);
        
        this.globeGroup.append("text")
            .attr("class", "globe-title")
            .attr("x", globeTitleX)
            .attr("y", globeTitleY + 5)
            .attr("text-anchor", "middle")
            .text(globeTitleText);
        
        // Add snazzy flight info panel
        const infoX = 20;
        const infoY = this.height - 130;
        const infoWidth = 220;
        const infoHeight = 115;
        
        // Gradient background for info panel
        const gradient = this.globeGroup.append("defs")
            .append("linearGradient")
            .attr("id", "infoGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%");
        
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "rgba(30, 87, 153, 0.9)");
        
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(15, 50, 90, 0.9)");
        
        // Info panel background
        this.globeGroup.append("rect")
            .attr("x", infoX)
            .attr("y", infoY)
            .attr("width", infoWidth)
            .attr("height", infoHeight)
            .attr("fill", "url(#infoGradient)")
            .attr("stroke", "#4da6ff")
            .attr("stroke-width", 2)
            .attr("rx", 10);
        
        // Decorative plane icon in panel
        this.globeGroup.append("text")
            .attr("x", infoX + 15)
            .attr("y", infoY + 28)
            .attr("font-size", "20px")
            .attr("fill", "#4da6ff")
            .text("✈");
        
        this.globeGroup.append("text")
            .attr("class", "flight-info flight-duration")
            .attr("x", infoX + 40)
            .attr("y", infoY + 28)
            .text("~32 hours");
        
        this.globeGroup.append("text")
            .attr("class", "flight-info flight-detail")
            .attr("x", infoX + 15)
            .attr("y", infoY + 50)
            .text("Auckland → Amsterdam");
        
        this.globeGroup.append("text")
            .attr("class", "flight-info flight-detail")
            .attr("x", infoX + 15)
            .attr("y", infoY + 70)
            .text("Distance: ~18,000 km");
        
        // Comparison line with visual separator
        this.globeGroup.append("line")
            .attr("x1", infoX + 15)
            .attr("y1", infoY + 82)
            .attr("x2", infoX + infoWidth - 15)
            .attr("y2", infoY + 82)
            .attr("stroke", "#4da6ff")
            .attr("stroke-width", 1)
            .attr("opacity", 0.5);
        
        this.globeGroup.append("text")
            .attr("class", "flight-info flight-detail")
            .attr("x", infoX + 15)
            .attr("y", infoY + 100)
            .style("font-style", "italic")
            .style("fill", "#ffcc00")
            .text("vs 10 months by ship! ⛵");
            
        // Add instruction text
        this.globeGroup.append("text")
            .attr("class", "instruction-text globe-instruction")
            .attr("x", this.width / 2)
            .attr("y", this.height - 20)
            .attr("text-anchor", "middle")
            .text("Click anywhere to see Tasman's voyage");
    }
    
    // Country ID to name mapping (ISO 3166-1 numeric codes)
    private readonly countryNames: { [key: string]: { name: string; continent: string; highlight?: boolean } } = {
        "528": { name: "Netherlands", continent: "Europe", highlight: true },
        "036": { name: "Australia", continent: "Oceania" },
        "554": { name: "New Zealand", continent: "Oceania", highlight: true },
        "360": { name: "Indonesia", continent: "Asia", highlight: true },
        "276": { name: "Germany", continent: "Europe" },
        "250": { name: "France", continent: "Europe" },
        "724": { name: "Spain", continent: "Europe" },
        "620": { name: "Portugal", continent: "Europe" },
        "380": { name: "Italy", continent: "Europe" },
        "826": { name: "United Kingdom", continent: "Europe" },
        "372": { name: "Ireland", continent: "Europe" },
        "056": { name: "Belgium", continent: "Europe" },
        "756": { name: "Switzerland", continent: "Europe" },
        "040": { name: "Austria", continent: "Europe" },
        "616": { name: "Poland", continent: "Europe" },
        "203": { name: "Czech Republic", continent: "Europe" },
        "348": { name: "Hungary", continent: "Europe" },
        "642": { name: "Romania", continent: "Europe" },
        "100": { name: "Bulgaria", continent: "Europe" },
        "804": { name: "Ukraine", continent: "Europe" },
        "643": { name: "Russia", continent: "Europe" },
        "752": { name: "Sweden", continent: "Europe" },
        "578": { name: "Norway", continent: "Europe" },
        "246": { name: "Finland", continent: "Europe" },
        "208": { name: "Denmark", continent: "Europe" },
        "300": { name: "Greece", continent: "Europe" },
        "792": { name: "Turkey", continent: "Asia" },
        "156": { name: "China", continent: "Asia" },
        "356": { name: "India", continent: "Asia" },
        "392": { name: "Japan", continent: "Asia" },
        "410": { name: "South Korea", continent: "Asia" },
        "764": { name: "Thailand", continent: "Asia" },
        "704": { name: "Vietnam", continent: "Asia" },
        "458": { name: "Malaysia", continent: "Asia" },
        "608": { name: "Philippines", continent: "Asia" },
        "682": { name: "Saudi Arabia", continent: "Asia" },
        "364": { name: "Iran", continent: "Asia" },
        "368": { name: "Iraq", continent: "Asia" },
        "818": { name: "Egypt", continent: "Africa" },
        "504": { name: "Morocco", continent: "Africa" },
        "710": { name: "South Africa", continent: "Africa" },
        "566": { name: "Nigeria", continent: "Africa" },
        "404": { name: "Kenya", continent: "Africa" },
        "012": { name: "Algeria", continent: "Africa" },
        "434": { name: "Libya", continent: "Africa" },
        "736": { name: "Sudan", continent: "Africa" },
        "840": { name: "United States", continent: "Americas" },
        "124": { name: "Canada", continent: "Americas" },
        "484": { name: "Mexico", continent: "Americas" },
        "076": { name: "Brazil", continent: "Americas" },
        "032": { name: "Argentina", continent: "Americas" },
        "152": { name: "Chile", continent: "Americas" },
        "170": { name: "Colombia", continent: "Americas" },
        "604": { name: "Peru", continent: "Americas" },
        "598": { name: "Papua New Guinea", continent: "Oceania" },
        "010": { name: "Antarctica", continent: "Antarctica" }
    };

    private drawDetailedWorld(
        group: d3.Selection<SVGGElement, unknown, null, undefined>, 
        pathGenerator: d3.GeoPath,
        styleClass: string
    ): void {
        // Convert TopoJSON to GeoJSON
        const countries = topojson.feature(worldData, worldData.objects.countries) as GeoJSON.FeatureCollection;
        
        // Draw each country with proper styling
        group.selectAll(`.country-${styleClass}`)
            .data(countries.features)
            .enter()
            .append("path")
            .attr("class", (d: any) => {
                const countryInfo = this.countryNames[d.id] || { name: "Unknown", continent: "Unknown" };
                let classes = `country ${styleClass}-land`;
                if (countryInfo.highlight) {
                    classes += ` ${styleClass}-highlight`;
                }
                classes += ` continent-${countryInfo.continent.toLowerCase().replace(' ', '-')}`;
                return classes;
            })
            .attr("d", pathGenerator as any)
            .attr("data-id", (d: any) => d.id)
            .attr("data-name", (d: any) => {
                const countryInfo = this.countryNames[d.id];
                return countryInfo ? countryInfo.name : "Unknown";
            });
            
        // Add country borders using mesh for cleaner lines
        const borders = topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b);
        group.append("path")
            .datum(borders)
            .attr("class", `country-border ${styleClass}-border`)
            .attr("d", pathGenerator as any)
            .attr("fill", "none");
    }
    
    private drawMapDecorations(): void {
        // Compass rose in corner
        const compassX = this.width - 80;
        const compassY = 80;
        const compassGroup = this.mapGroup.append("g")
            .attr("class", "compass-rose")
            .attr("transform", `translate(${compassX}, ${compassY})`);
            
        // Compass directions
        const directions = [
            { angle: 0, label: "N", length: 40 },
            { angle: 90, label: "E", length: 30 },
            { angle: 180, label: "S", length: 30 },
            { angle: 270, label: "W", length: 30 }
        ];
        
        directions.forEach(d => {
            const rad = (d.angle - 90) * Math.PI / 180;
            const x2 = Math.cos(rad) * d.length;
            const y2 = Math.sin(rad) * d.length;
            
            compassGroup.append("line")
                .attr("class", "compass-line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", x2)
                .attr("y2", y2);
                
            compassGroup.append("text")
                .attr("class", "compass-label")
                .attr("x", x2 * 1.3)
                .attr("y", y2 * 1.3)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(d.label);
        });
        
        // Decorative circle
        compassGroup.append("circle")
            .attr("class", "compass-circle")
            .attr("r", 15);
            
        // Add some "sea monster" or wave decorations
        this.drawSeaDecorations();
    }
    
    private drawSeaDecorations(): void {
        const decorGroup = this.mapGroup.append("g").attr("class", "sea-decorations");
        
        // ======= SEA MONSTERS =======
        // Sea serpent in the Indian Ocean (left side)
        const serpentX = 80;
        const serpentY = this.height * 0.6;
        const serpent = decorGroup.append("g")
            .attr("class", "sea-monster")
            .attr("transform", `translate(${serpentX}, ${serpentY}) scale(0.8)`);
        
        // Serpent body - wavy line with head
        serpent.append("path")
            .attr("d", `M0,0 
                Q15,-20 30,-5 
                Q45,15 60,0 
                Q75,-20 90,-10 
                Q100,-5 105,-15
                L115,-10 L100,-5 L110,0 L100,5
                Q90,10 75,5
                Q60,-15 45,0
                Q30,20 15,5
                Q5,-5 0,0`)
            .attr("fill", "none")
            .attr("stroke-width", "3");
        
        // Eye
        serpent.append("circle")
            .attr("cx", 103)
            .attr("cy", -8)
            .attr("r", 3)
            .attr("fill", "#3d2914");
            
        // Label
        decorGroup.append("text")
            .attr("class", "monster-text")
            .attr("x", serpentX + 30)
            .attr("y", serpentY + 35)
            .attr("text-anchor", "middle")
            .text("Here be Monsters");
        
        // ======= DRAGON in the Indian Ocean (moved away from NZ) =======
        const dragonX = this.width * 0.25;
        const dragonY = this.height * 0.7;
        const dragon = decorGroup.append("g")
            .attr("class", "dragon")
            .attr("transform", `translate(${dragonX}, ${dragonY}) scale(0.7)`);
        
        // Dragon body
        dragon.append("path")
            .attr("d", `M0,0 
                C10,-30 40,-40 50,-20
                C55,-10 60,-15 70,-25
                L80,-20 L70,-15 L75,-10 L65,-10
                C60,0 50,10 40,15
                C30,20 20,15 10,20
                C5,22 0,20 -5,25
                L-10,20 L0,15 L-5,10 L5,10
                C10,5 5,0 0,0`)
            .attr("stroke-width", "2.5");
        
        // Dragon wing
        dragon.append("path")
            .attr("d", "M30,-15 C25,-35 45,-45 55,-30 C50,-25 40,-20 35,-15")
            .attr("stroke-width", "2");
        
        // Dragon eye
        dragon.append("circle")
            .attr("cx", 68)
            .attr("cy", -18)
            .attr("r", 2.5)
            .attr("fill", "#3d2914");
        
        // Smoke/fire from mouth
        dragon.append("path")
            .attr("d", "M78,-15 Q85,-18 90,-12 Q95,-8 88,-5")
            .attr("stroke-width", "1.5")
            .attr("stroke-dasharray", "3,2");
        
        // ======= WHALE/FISH near bottom =======
        const whaleX = this.width * 0.3;
        const whaleY = this.height * 0.85;
        const whale = decorGroup.append("g")
            .attr("class", "sea-monster")
            .attr("transform", `translate(${whaleX}, ${whaleY}) scale(0.6)`);
        
        // Whale body
        whale.append("path")
            .attr("d", `M0,0 
                C20,-15 50,-20 80,-10
                C100,-5 110,5 100,15
                C80,25 50,25 30,20
                C15,18 5,10 0,0
                M100,0 L120,-10 L115,0 L120,10 L100,5`)
            .attr("fill", "none")
            .attr("stroke-width", "2.5");
        
        // Water spout
        whale.append("path")
            .attr("d", "M45,-25 Q50,-40 45,-50 M50,-25 Q55,-45 60,-50 M55,-25 Q55,-38 50,-48")
            .attr("stroke-width", "1.5")
            .attr("fill", "none");
        
        // Eye
        whale.append("circle")
            .attr("cx", 25)
            .attr("cy", 5)
            .attr("r", 3)
            .attr("fill", "#3d2914");
        
        // ======= VOYAGE INFO BOX =======
        const infoX = 30;
        const infoY = 70;
        const infoBox = decorGroup.append("g")
            .attr("class", "voyage-info-box")
            .attr("transform", `translate(${infoX}, ${infoY})`);
        
        // Decorative border
        infoBox.append("rect")
            .attr("x", -10)
            .attr("y", -5)
            .attr("width", 200)
            .attr("height", 85)
            .attr("fill", "#f4e4bc")
            .attr("stroke", "#3d2914")
            .attr("stroke-width", 2)
            .attr("rx", 5);
        
        // Voyage duration
        infoBox.append("text")
            .attr("class", "voyage-info voyage-duration")
            .attr("x", 0)
            .attr("y", 15)
            .text("Voyage: 10 Months");
        
        // Dates
        infoBox.append("text")
            .attr("class", "voyage-info voyage-detail")
            .attr("x", 0)
            .attr("y", 35)
            .text("Aug 1642 - Jun 1643");
        
        // Ships
        infoBox.append("text")
            .attr("class", "voyage-info voyage-detail")
            .attr("x", 0)
            .attr("y", 52)
            .text("Ships: Heemskerck & Zeehaen");
        
        // Crew
        infoBox.append("text")
            .attr("class", "voyage-info voyage-detail")
            .attr("x", 0)
            .attr("y", 69)
            .text("~110 crew members");
        
        // ======= STYLIZED WAVES =======
        const wavePositions = [
            { x: this.width * 0.5, y: this.height * 0.75 },
            { x: this.width * 0.15, y: this.height * 0.45 }
        ];
        
        wavePositions.forEach(pos => {
            const wave = decorGroup.append("g")
                .attr("transform", `translate(${pos.x}, ${pos.y})`);
                
            wave.append("path")
                .attr("class", "wave-decoration")
                .attr("d", "M-30,0 Q-20,-10 -10,0 Q0,10 10,0 Q20,-10 30,0 Q40,10 50,0")
                .attr("fill", "none");
        });
    }
    
    private drawLocation(
        group: d3.Selection<SVGGElement, unknown, null, undefined>,
        position: [number, number],
        name: string,
        type: "start" | "waypoint" | "end"
    ): void {
        const locationGroup = group.append("g")
            .attr("class", `location location-${type}`)
            .attr("transform", `translate(${position[0]}, ${position[1]})`);
            
        // Location marker
        locationGroup.append("circle")
            .attr("class", "location-marker")
            .attr("r", type === "end" ? 8 : 6);
            
        // Location label
        locationGroup.append("text")
            .attr("class", "location-label")
            .attr("x", 12)
            .attr("y", 4)
            .text(name);
    }
    
    private animateShip(
        route: [number, number][],
        projection: d3.GeoProjection
    ): void {
        const projectedRoute = route.map(p => projection(p)!);
        
        // Create TWO ships - Heemskerck and Zeehaen
        const ships = [
            { name: "Heemskerck", offset: 0, color: "#5d4037" },
            { name: "Zeehaen", offset: -25, color: "#6d5047" }
        ];
        
        ships.forEach((shipInfo, index) => {
            const ship = this.shipGroup.append("g")
                .attr("class", `ship ship-${index}`)
                .attr("transform", `translate(${projectedRoute[0][0] + shipInfo.offset}, ${projectedRoute[0][1]})`);
            
            // Better detailed sailing ship SVG
            const shipScale = 0.8;
            const shipG = ship.append("g")
                .attr("transform", `scale(${shipScale})`);
            
            // Hull - more detailed ship shape
            shipG.append("path")
                .attr("d", `M-18,8 
                    Q-20,4 -18,0 
                    L-15,-2 L-8,-4 L8,-4 L15,-2 
                    Q18,0 20,4 
                    Q18,8 15,10 
                    L-15,10 
                    Q-18,8 -18,8 Z`)
                .attr("fill", shipInfo.color)
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "1.5");
            
            // Deck line
            shipG.append("path")
                .attr("d", "M-14,2 L14,2")
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "1");
            
            // Main mast
            shipG.append("line")
                .attr("x1", 0)
                .attr("y1", -4)
                .attr("x2", 0)
                .attr("y2", -35)
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "2");
            
            // Fore mast
            shipG.append("line")
                .attr("x1", -10)
                .attr("y1", -4)
                .attr("x2", -10)
                .attr("y2", -25)
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "1.5");
            
            // Main sail
            shipG.append("path")
                .attr("d", "M-2,-32 Q12,-22 -2,-12 Z")
                .attr("fill", "#f5f5dc")
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "1");
            
            // Fore sail  
            shipG.append("path")
                .attr("d", "M-12,-22 Q-2,-17 -12,-10 Z")
                .attr("fill", "#f5f5dc")
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "1");
            
            // Dutch flag on main mast (orange-white-blue horizontal stripes)
            shipG.append("rect")
                .attr("x", 2)
                .attr("y", -38)
                .attr("width", 12)
                .attr("height", 3)
                .attr("fill", "#ff6b00");
            shipG.append("rect")
                .attr("x", 2)
                .attr("y", -35)
                .attr("width", 12)
                .attr("height", 3)
                .attr("fill", "#ffffff");
            shipG.append("rect")
                .attr("x", 2)
                .attr("y", -32)
                .attr("width", 12)
                .attr("height", 3)
                .attr("fill", "#21468b");
            
            // Crow's nest
            shipG.append("rect")
                .attr("x", -3)
                .attr("y", -28)
                .attr("width", 6)
                .attr("height", 4)
                .attr("fill", "#5d4037")
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "0.5");
            
            // Bowsprit
            shipG.append("line")
                .attr("x1", -18)
                .attr("y1", 0)
                .attr("x2", -28)
                .attr("y2", -8)
                .attr("stroke", "#3d2914")
                .attr("stroke-width", "1.5");
            
            // Create hidden path for animation
            const lineGenerator = d3.line<[number, number]>()
                .x(d => d[0])
                .y(d => d[1])
                .curve(d3.curveCatmullRom.alpha(0.5));
                
            const pathString = lineGenerator(projectedRoute);
            const pathNode = this.mapGroup.append("path")
                .attr("d", pathString)
                .attr("fill", "none")
                .attr("stroke", "none")
                .node();
                
            if (pathNode) {
                const pathLength = pathNode.getTotalLength();
                
                // Animate ship along path - keep upright with minimal rotation
                ship.transition()
                    .delay(3000 + index * 500) // Stagger the ships slightly
                    .duration(15000)
                    .ease(d3.easeLinear)
                    .attrTween("transform", () => {
                        return (t: number) => {
                            const point = pathNode.getPointAtLength(t * pathLength);
                            // Get direction for slight tilt, but keep mostly upright
                            const point2 = pathNode.getPointAtLength(Math.min(t * pathLength + 10, pathLength));
                            const dx = point2.x - point.x;
                            // Only tilt slightly based on horizontal direction
                            const tilt = dx > 0 ? 5 : dx < 0 ? -5 : 0;
                            // Add offset for second ship
                            const xOffset = shipInfo.offset * (1 - Math.abs(dx) / 20);
                            return `translate(${point.x + xOffset}, ${point.y}) rotate(${tilt})`;
                        };
                    });
            }
        });
    }
    
    private animateGlobeAndPlane(): void {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Create plane icon
        const plane = this.planeGroup.append("g")
            .attr("class", "plane");
            
        // Plane body
        plane.append("path")
            .attr("d", "M0,-20 L5,-5 L20,5 L5,5 L5,15 L10,20 L-10,20 L-5,15 L-5,5 L-20,5 L-5,-5 Z")
            .attr("class", "plane-body");
            
        this.planeGroup.style("opacity", 1);
        
        // Flight path from New Zealand to Netherlands
        const flightPath: [number, number][] = [
            this.newZealand.coords,      // Start: New Zealand
            [160, -30],                    // Over Pacific
            [140, -10],                    // Towards Indonesia
            [100, 10],                     // Over Southeast Asia
            [70, 25],                      // Over India
            [50, 35],                      // Over Middle East
            [30, 45],                      // Over Mediterranean
            [10, 50],                      // Over Europe
            this.netherlands.coords        // End: Netherlands
        ];
        
        // Create great circle interpolator for smooth rotation
        const interpolateAngles = this.createGlobeRotationInterpolator(flightPath);
        
        // Animate globe rotation with plane
        const duration = 12000; // 12 seconds flight
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easedT = d3.easeCubicInOut(t);
            
            // Rotate globe
            const rotation = interpolateAngles(easedT);
            this.projection.rotate(rotation);
            
            // Update all paths
            this.globeGroup.selectAll("path").attr("d", this.path as any);
            
            // Update plane position (always at center of globe, facing direction of travel)
            const currentPoint = this.interpolateFlightPath(flightPath, easedT);
            const projected = this.projection(currentPoint);
            
            if (projected) {
                // Calculate heading
                const nextT = Math.min(easedT + 0.01, 1);
                const nextPoint = this.interpolateFlightPath(flightPath, nextT);
                const nextProjected = this.projection(nextPoint);
                
                let angle = 0;
                if (nextProjected && projected) {
                    angle = Math.atan2(nextProjected[1] - projected[1], nextProjected[0] - projected[0]) * 180 / Math.PI;
                }
                
                // Check if point is on visible hemisphere
                const center = this.projection.rotate();
                const distance = d3.geoDistance(currentPoint, [-center[0], -center[1]]);
                
                if (distance < Math.PI / 2) {
                    plane.attr("transform", `translate(${projected[0]}, ${projected[1]}) rotate(${angle + 90}) scale(0.8)`)
                        .style("opacity", 1);
                } else {
                    plane.style("opacity", 0.3);
                }
            }
            
            // Draw flight trail
            this.drawFlightTrail(flightPath, easedT);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
                // Show arrival marker
                this.showArrivalMarker();
            }
        };
        
        // Start animation after a brief delay
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 500);
    }
    
    private createGlobeRotationInterpolator(path: [number, number][]): (t: number) => [number, number, number] {
        return (t: number) => {
            const point = this.interpolateFlightPath(path, t);
            return [-point[0], -point[1], 0];
        };
    }
    
    private interpolateFlightPath(path: [number, number][], t: number): [number, number] {
        if (t <= 0) return path[0];
        if (t >= 1) return path[path.length - 1];
        
        const totalSegments = path.length - 1;
        const segmentProgress = t * totalSegments;
        const segmentIndex = Math.floor(segmentProgress);
        const segmentT = segmentProgress - segmentIndex;
        
        if (segmentIndex >= totalSegments) return path[path.length - 1];
        
        const start = path[segmentIndex];
        const end = path[segmentIndex + 1];
        
        // Use great circle interpolation
        const interpolator = d3.geoInterpolate(start, end);
        return interpolator(segmentT);
    }
    
    private drawFlightTrail(path: [number, number][], progress: number): void {
        this.globeGroup.selectAll(".flight-trail").remove();
        
        // Create partial path up to current progress
        const partialPath: [number, number][] = [];
        const steps = 50;
        
        for (let i = 0; i <= steps * progress; i++) {
            const t = i / steps;
            partialPath.push(this.interpolateFlightPath(path, t));
        }
        
        if (partialPath.length > 1) {
            const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates: partialPath
                }
            };
            
            this.globeGroup.append("path")
                .datum(lineString)
                .attr("class", "flight-trail")
                .attr("d", this.path as any);
        }
    }
    
    private showArrivalMarker(): void {
        const projected = this.projection(this.netherlands.coords);
        if (projected) {
            const marker = this.globeGroup.append("g")
                .attr("class", "arrival-marker")
                .attr("transform", `translate(${projected[0]}, ${projected[1]})`);
                
            // Pulsing circle
            marker.append("circle")
                .attr("class", "arrival-pulse")
                .attr("r", 5)
                .transition()
                .duration(1000)
                .attr("r", 20)
                .style("opacity", 0)
                .on("end", function repeat() {
                    d3.select(this)
                        .attr("r", 5)
                        .style("opacity", 1)
                        .transition()
                        .duration(1000)
                        .attr("r", 20)
                        .style("opacity", 0)
                        .on("end", repeat);
                });
                
            marker.append("circle")
                .attr("class", "arrival-point")
                .attr("r", 6);
                
            marker.append("text")
                .attr("class", "arrival-label")
                .attr("x", 15)
                .attr("y", 5)
                .text("Welcome to the Netherlands!");
        }
    }
    
    private toggleView(): void {
        this.isGlobeView = !this.isGlobeView;
        
        // Transition between views
        if (this.isGlobeView) {
            // Fade out map, fade in globe
            this.mapGroup.transition().duration(1000).style("opacity", 0);
            this.shipGroup.transition().duration(1000).style("opacity", 0);
            
            setTimeout(() => {
                this.mapGroup.selectAll("*").remove();
                this.shipGroup.selectAll("*").remove();
                this.globeGroup.style("opacity", 0);
                this.planeGroup.style("opacity", 0);
                this.renderGlobe();
                this.globeGroup.transition().duration(1000).style("opacity", 1);
            }, 1000);
        } else {
            // Fade out globe, fade in map
            this.globeGroup.transition().duration(1000).style("opacity", 0);
            this.planeGroup.transition().duration(1000).style("opacity", 0);
            
            setTimeout(() => {
                this.globeGroup.selectAll("*").remove();
                this.planeGroup.selectAll("*").remove();
                this.mapGroup.style("opacity", 0);
                this.shipGroup.style("opacity", 0);
                this.renderOldWorldMap();
                this.mapGroup.transition().duration(1000).style("opacity", 1);
                this.shipGroup.transition().duration(1000).style("opacity", 1);
            }, 1000);
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}