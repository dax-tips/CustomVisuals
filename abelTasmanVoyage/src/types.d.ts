// Type declarations for world-atlas and topojson

declare module "world-atlas/countries-110m.json" {
    const data: {
        type: "Topology";
        objects: {
            countries: {
                type: "GeometryCollection";
                geometries: Array<{
                    type: string;
                    id: string;
                    properties: { name: string };
                    arcs: number[][];
                }>;
            };
            land: {
                type: "GeometryCollection";
                geometries: Array<{
                    type: string;
                    arcs: number[][];
                }>;
            };
        };
        arcs: number[][][];
        transform: {
            scale: [number, number];
            translate: [number, number];
        };
    };
    export default data;
}

declare module "topojson-client" {
    export function feature<T extends GeoJSON.GeoJsonProperties>(
        topology: any,
        object: any
    ): GeoJSON.FeatureCollection<GeoJSON.Geometry, T>;
    
    export function mesh(
        topology: any,
        object: any,
        filter?: (a: any, b: any) => boolean
    ): GeoJSON.MultiLineString;
}
