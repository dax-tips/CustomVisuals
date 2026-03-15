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
import "./../style/visual.less";
import * as d3 from "d3";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;

        // create an SVG element for rendering
        this.svg = d3.select(this.target)
            .append('svg')
            .attr('class', 'histogram')
            .style('width', '100%')
            .style('height', '100%');

        // create tooltip
        this.tooltip = d3.select(this.target)
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews && options.dataViews[0]);

        console.log('Visual update', options);

        if (!options.dataViews || !options.dataViews[0]) {
            this.showEmptyState('No data');
            return;
        }

        const dv = options.dataViews[0];

        // extract numeric values from the category column (the field dragged to the data well)
        let values: number[] = [];
        try {
            if (dv.categorical && dv.categorical.categories && dv.categorical.categories.length > 0) {
                const categoryColumn = dv.categorical.categories[0];
                if (categoryColumn && Array.isArray(categoryColumn.values)) {
                    values = categoryColumn.values
                        .map((v: any) => (v === null || v === undefined) ? NaN : +v)
                        .filter((v: number) => !isNaN(v));
                }
            }
        } catch (e) {
            values = [];
        }

        if (!values || values.length === 0) {
            this.showEmptyState('No numeric values to display');
            return;
        }

        // sizing
        const width = Math.max(100, options.viewport.width || 200);
        const height = Math.max(80, options.viewport.height || 200);
        const margin = { top: 10, right: 10, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        if (!this.svg) return;

        // clear
        this.svg.selectAll('*').remove();
        this.svg
            .attr('width', width)
            .attr('height', height);

        const root = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // scales
        const x = d3.scaleLinear()
            .domain(d3.extent(values) as [number, number])
            .nice()
            .range([0, innerWidth]);

        const thresholds = Math.min(40, Math.ceil(Math.sqrt(values.length)) || 10);
        const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(thresholds)(values as number[]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length) || 0])
            .nice()
            .range([innerHeight, 0]);

        // create color scales for more attractive gradients
        const baseColor = (this.formattingSettings && this.formattingSettings.dataPointCard && (this.formattingSettings.dataPointCard.fill.value.value || this.formattingSettings.dataPointCard.defaultColor.value.value)) || '#4A90E2';
        
        // create a color scale based on bar height for visual appeal
        const colorScale = d3.scaleSequential()
            .domain([0, d3.max(bins, d => d.length) || 0])
            .interpolator(d3.interpolateRgbBasis([baseColor, d3.color(baseColor)?.brighter(0.5)?.toString() || baseColor]));

        // add grid lines for better readability
        const yGridLines = root.append('g')
            .attr('class', 'grid')
            .selectAll('.grid-line')
            .data(y.ticks(5))
            .enter()
            .append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', d => y(d))
            .attr('y2', d => y(d));

        // bars with enhanced interactions
        const bar = root.selectAll('.bar')
            .data(bins)
            .enter()
            .append('g')
            .attr('class', 'bar')
            .attr('transform', (d: any) => `translate(${x(d.x0 as number)},${y(d.length)})`);

        const tooltip = this.tooltip;
        
        bar.append('rect')
            .attr('x', 1)
            .attr('width', (d: any) => Math.max(0, x(d.x1 as number) - x(d.x0 as number) - 1))
            .attr('height', (d: any) => innerHeight - y(d.length))
            .attr('fill', (d: any) => colorScale(d.length))
            .attr('rx', 2)
            .attr('ry', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event: any, d: any) {
                // highlight the bar
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill', d3.color(colorScale(d.length))?.brighter(0.3)?.toString() || colorScale(d.length));
                
                // show tooltip
                if (tooltip) {
                    const range = `${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}`;
                    const count = d.length;
                    const percentage = ((count / values.length) * 100).toFixed(1);
                    
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 1);
                    
                    tooltip.html(`
                        <div><strong>Range:</strong> ${range}</div>
                        <div><strong>Count:</strong> ${count}</div>
                        <div><strong>Percentage:</strong> ${percentage}%</div>
                    `)
                        .style('left', (event.pageX - 60) + 'px')
                        .style('top', (event.pageY - 80) + 'px');
                }
            })
            .on('mouseout', function(event: any, d: any) {
                // restore original color
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill', colorScale(d.length));
                
                // hide tooltip
                if (tooltip) {
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0);
                }
            });

        // enhanced x axis
        const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format('.1f'));
        root.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .attr('class', 'x axis')
            .call(xAxis)
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 35)
            .style('text-anchor', 'middle')
            .style('fill', '#495057')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .text('Values');

        // enhanced y axis
        const yAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s'));
        root.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -25)
            .attr('x', -innerHeight / 2)
            .style('text-anchor', 'middle')
            .style('fill', '#495057')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .text('Frequency');

        // accessibility / title
        this.svg.attr('role', 'img').attr('aria-label', 'Histogram');
    }

    private showEmptyState(message: string) {
        if (!this.svg) return;
        this.svg.selectAll('*').remove();
        this.svg.append('text')
            .attr('class', 'empty')
            .attr('x', '50%')
            .attr('y', '50%')
            .attr('text-anchor', 'middle')
            .text(message);
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property. 
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}