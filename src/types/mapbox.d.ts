  
declare namespace mapboxgl {
  export interface MapboxOptions {
    container: string | HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    language?: string;
    [key: string]: any;
  }

  export class Map {
    constructor(options: MapboxOptions);
    addControl(control: any, position?: string): this;
  }

  export class NavigationControl {
    constructor();
  }

  export const accessToken: string;
}

declare class MapboxDirections {
  constructor(options: { accessToken: string; language?: string });
}

declare interface Window {
  mapboxgl: typeof mapboxgl;
  MapboxDirections: typeof MapboxDirections;
}
