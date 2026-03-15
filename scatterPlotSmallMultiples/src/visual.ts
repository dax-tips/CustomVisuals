/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";
import { ScatterPlotData, SmallMultipleLayout, ViewportDimensions, ScalesInfo, D3Selection } from "./dataInterfaces";
import { DataTransform } from "./dataTransform";

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: powerbi.extensibility.visual.IVisualHost;
    private selectionManager: powerbi.extensibility.ISelectionManager;
    private svg: D3Selection;
    private container: D3Selection;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private data: ScatterPlotData;
    private viewport: ViewportDimensions;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        
        // Initialize viewport
        this.viewport = {
            width: options.element.clientWidth,
            height: options.element.clientHeight
        };

        // Create SVG container
        this.svg = d3.select(this.target)
            .append("svg")
            .classed("scatter-plot-svg", true);

        this.container = this.svg.append("g")
            .classed("container", true);
    }

    public update(options: VisualUpdateOptions) {
        try {
            this.formattingSettings = this.formattingSettingsService
                .populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews && options.dataViews[0]);

            // Update viewport
            this.viewport = {
                width: options.viewport.width,
                height: options.viewport.height
            };

            // Update SVG dimensions
            this.svg
                .attr("width", this.viewport.width)
                .attr("height", this.viewport.height);

            // Transform data
            this.data = DataTransform.transform(options.dataViews[0], this.host);

            console.log('Transformed data:', this.data);

            // Clear previous rendering
            this.container.selectAll("*").remove();

            if (this.data.categories.length === 0) {
                this.renderNoDataMessage();
                return;
            }

            // Render small multiples
            this.renderSmallMultiples();

        } catch (error) {
            console.error('Error in visual update:', error);
            this.renderErrorMessage(error.message);
        }
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private renderSmallMultiples(): void {
        const layout = this.calculateLayout();
        
        // Create scales
        const scales = this.createScales(layout);
        
        // Render each small multiple
        this.data.categories.forEach((category, index) => {
            const row = Math.floor(index / layout.cols);
            const col = index % layout.cols;
            
            const x = layout.margin.left + col * (layout.cellWidth + layout.padding.inner);
            const y = layout.margin.top + row * (layout.cellHeight + layout.padding.inner);
            
            this.renderSingleScatterPlot(category, x, y, layout, scales, index);
        });
    }

    private calculateLayout(): SmallMultipleLayout {
        const numCategories = this.data.categories.length;
        const cols = Math.ceil(Math.sqrt(numCategories));
        const rows = Math.ceil(numCategories / cols);
        
        const margin = { top: 40, right: 20, bottom: 40, left: 50 };
        const padding = { outer: 20, inner: 20 };
        
        const availableWidth = this.viewport.width - margin.left - margin.right - (cols - 1) * padding.inner;
        const availableHeight = this.viewport.height - margin.top - margin.bottom - (rows - 1) * padding.inner;
        
        const cellWidth = Math.max(200, availableWidth / cols);
        const cellHeight = Math.max(150, availableHeight / rows);
        
        return {
            rows,
            cols,
            cellWidth,
            cellHeight,
            padding,
            margin
        };
    }

    private createScales(layout: SmallMultipleLayout): ScalesInfo {
        const plotWidth = layout.cellWidth - 60; // Account for axes
        const plotHeight = layout.cellHeight - 60; // Account for axes and title
        
        return {
            x: d3.scaleLinear()
                .domain([this.data.minX, this.data.maxX])
                .range([0, plotWidth]),
            y: d3.scaleLinear()
                .domain([this.data.minY, this.data.maxY])
                .range([plotHeight, 0]),
            size: d3.scaleLinear()
                .domain([this.data.minSize, this.data.maxSize])
                .range([3, 12]),
            color: d3.scaleOrdinal(d3.schemeCategory10)
        };
    }

    private renderSingleScatterPlot(
        category: any,
        x: number,
        y: number,
        layout: SmallMultipleLayout,
        scales: ScalesInfo,
        index: number
    ): void {
        const plotWidth = layout.cellWidth - 60;
        const plotHeight = layout.cellHeight - 60;
        
        // Create group for this scatter plot
        const plotGroup = this.container
            .append("g")
            .attr("transform", `translate(${x + 30}, ${y + 30})`);

        // Add title
        plotGroup.append("text")
            .attr("x", plotWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "12px")
            .text(category.name);

        // Add axes
        this.renderAxes(plotGroup, scales, plotWidth, plotHeight);

        // Add data points
        this.renderDataPoints(plotGroup, category.dataPoints, scales);
    }

    private renderAxes(group: D3Selection, scales: ScalesInfo, width: number, height: number): void {
        // X-axis
        group.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(scales.x).ticks(5));

        // Y-axis
        group.append("g")
            .call(d3.axisLeft(scales.y).ticks(5));

        // X-axis label
        group.append("text")
            .attr("x", width / 2)
            .attr("y", height + 35)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .text(this.data.xAxisLabel);

        // Y-axis label
        group.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -35)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .text(this.data.yAxisLabel);
    }

    private renderDataPoints(group: D3Selection, dataPoints: any[], scales: ScalesInfo): void {
        const circles = group.selectAll(".data-point")
            .data(dataPoints)
            .enter()
            .append("circle")
            .classed("data-point", true)
            .attr("cx", d => scales.x(d.x))
            .attr("cy", d => scales.y(d.y))
            .attr("r", d => this.data.hasSize ? scales.size(d.size) : 4)
            .style("fill", d => this.data.hasLegend ? scales.color(d.legend) : "#1f77b4")
            .style("fill-opacity", 0.7)
            .style("stroke", "#fff")
            .style("stroke-width", 1)
            .style("cursor", "pointer");

        // Add tooltips
        circles.append("title")
            .text(d => {
                let tooltip = `Category: ${d.category}\n`;
                tooltip += `${this.data.xAxisLabel}: ${d.x}\n`;
                tooltip += `${this.data.yAxisLabel}: ${d.y}`;
                if (this.data.hasSize) {
                    tooltip += `\nSize: ${d.size}`;
                }
                if (this.data.hasLegend) {
                    tooltip += `\nSeries: ${d.legend}`;
                }
                return tooltip;
            });

        // Add click handlers
        circles.on("click", (event, d: any) => {
                this.selectionManager.select(d.identity).then(() => {
                    this.updateSelection();
                });
            });
    }

    private updateSelection(): void {
        const selection = this.selectionManager.getSelectionIds();
        
        this.container.selectAll(".data-point")
            .style("fill-opacity", (d: any) => {
                if (selection.length === 0) return 0.7;
                
                // Simple selection check - in a production visual you'd implement proper ID comparison
                return selection.length > 0 ? 0.3 : 0.7;
            });
    }

    private renderNoDataMessage(): void {
        this.container.append("text")
            .attr("x", this.viewport.width / 2)
            .attr("y", this.viewport.height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#666")
            .text("No data available. Please add data to X-Axis, Y-Axis, and Category fields.");
    }

    private renderErrorMessage(message: string): void {
        this.container.append("text")
            .attr("x", this.viewport.width / 2)
            .attr("y", this.viewport.height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#d32f2f")
            .text(`Error: ${message}`);
    }
}