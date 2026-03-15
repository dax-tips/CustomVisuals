import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

export interface ScatterDataPoint {
    x: number;
    y: number;
    size?: number;
    category: string;
    legend?: string;
    identity: powerbi.visuals.ISelectionId;
    tooltips?: TooltipDataItem[];
}

export interface TooltipDataItem {
    displayName: string;
    value: string;
}

export interface CategoryData {
    name: string;
    dataPoints: ScatterDataPoint[];
}

export interface ScatterPlotData {
    categories: CategoryData[];
    xAxisLabel: string;
    yAxisLabel: string;
    hasSize: boolean;
    hasLegend: boolean;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minSize: number;
    maxSize: number;
}

export interface ViewportDimensions {
    width: number;
    height: number;
}

export interface SmallMultipleLayout {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    padding: {
        outer: number;
        inner: number;
    };
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface D3Selection extends d3.Selection<any, any, any, any> {}

export interface ScalesInfo {
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
    size: d3.ScaleLinear<number, number>;
    color: d3.ScaleOrdinal<string, string>;
}