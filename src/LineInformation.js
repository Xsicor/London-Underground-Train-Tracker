import * as turf from '@turf/turf'
import { map } from './Main.js';
// Holds all relevant information about a line and methods to get required data
export class LineInformation {
  #railwayData;
  #timetableData;
  #routeData;
  #lineColor;
  #stationIds;
  #railwayGeoJson;
  #lineId
  constructor(lineId, color) {
    this.#lineId = lineId;
    this.#railwayData = railwayData['lines'].find(line => line.id === this.#lineId)['data'];
    this.#timetableData = timetableData['lines'].find(line => line.id === this.#lineId)['data'];
    this.#routeData = routeData['lines'].find(line => line.id === this.#lineId)['data'];
    this.#lineColor = color;
    this.#stationIds = this.generateStationIds();
    this.#railwayGeoJson = this.createRailwayGeoJson();
    this.placeRailwayOnMap();
  }

  generateStationIds() {
    let stationIds = new Set();
    for (let route of this.#routeData) {
      for (let station of route['stations']) {
        stationIds.add(station);
      }
    }
    return stationIds;
  }

  createRailwayGeoJson() {
    let railwayCoordinates = [];
    let railwayLineStrings = [];
    for (let route of this.#railwayData) {
      for (let railway of route['railways']) {
        railwayCoordinates.push(...railway['coordinates']);
      }
      railwayLineStrings.push(turf.lineString(railwayCoordinates));
      railwayCoordinates = [];
    }
    return turf.featureCollection(railwayLineStrings);
  }

  getStationIds() {return this.#stationIds}

  getLineId() {return this.#lineId}

  getTimetableData(route) {
    let timetable = this.#timetableData.find(timetableRoute => 
      route.destinationNaptanId === timetableRoute.destinationNaptanId && 
      route.via === timetableRoute.via && 
      route.departureNaptanId === timetableRoute.departureNaptanId
    )
    if (timetable !== undefined) {
      return timetable;
    } else {
      return this.createTimetable(route); // Timetable data for route isn't held, create it
    }
  }

  createTimetable(route) { //Create timetable data that isn't held on the server. Created from subsection of full route timetable data
    let checkMatching = (slicedTimetableRoute) => {
      let timetableStations = slicedTimetableRoute.map(timetableData => timetableData.departureNaptanId);
      for (let i = 0; i < timetableStations.length; i++) {
        if (timetableStations[i] !== route.stations[i]) {
          return false;
        }
      }
      return true;
    }

    let filteredTimetables = this.#timetableData.filter(timetableRoute => 
      timetableRoute.timetable.some((data) => data.departureNaptanId === route.departureNaptanId) && 
      timetableRoute.timetable.some((data) => data.destinationNaptanId === route.destinationNaptanId)
    ); // Find full route timetable data that can be used to create the required timetable

    for (let timetableRoute of filteredTimetables) {
      let startIndex = timetableRoute.timetable.findIndex((data) => data.departureNaptanId === route.departureNaptanId);
      let endIndex = timetableRoute.timetable.findIndex((data) => data.destinationNaptanId === route.destinationNaptanId);
      if (checkMatching(timetableRoute.timetable.slice(startIndex, endIndex+2))) {
        let newTimetable = {
          'destinationNaptanId': route.destinationNaptanId,
          'departureNaptanId': route.departureNaptanId,
          'via': route.via,
          'timetable': timetableRoute.timetable.slice(startIndex, endIndex+2)
        }
        return newTimetable;
      }
    }
  }

  getRailwayData(nextStation, previousStation) {
    for (let railwayRoute of this.#railwayData) {
      let railwayInfo = railwayRoute.railways.find(railway => 
        railway.departureNaptanId === previousStation &&
        railway.destinationNaptanId === nextStation)
      if (railwayInfo !== undefined) return railwayInfo;
    }
  }

  getRouteData(destination, nextStation, via) {
    let filteredRoutes = this.#routeData.filter(route => 
      route.destinationNaptanId === destination && route.via === via
    );
    for (let route of filteredRoutes) {
      if (route.stations.includes(nextStation)) {return route}
    }
    return this.createRoute(destination, nextStation, via); // Route data for route isn't held, create it
  }

  createRoute(destination, nextStation, via) { //Create route data that isn't held on the server. Created from subsection of a full route
    let routeFound = (route, nextStation, destination) => {
      if (route.stations.includes(nextStation)) {
        let index = route.stations.indexOf(nextStation);
        if (route.stations.slice(index).includes(destination)) return true;
      }
      return false;
    }

    for (let route of this.#routeData) {
      if (route.via === via) {
        if (routeFound(route, nextStation, destination)) {
          let endIndex = route.stations.indexOf(destination);
          let newRoute = {
            'destinationNaptanId': destination,
            'departureNaptanId': route.departureNaptanId,
            'via': via,
            'stations': route.stations.slice(0, endIndex+1)
          };
          return newRoute;
        }
      }
    }
    
    for (let route of this.#routeData) { // Some routes don't use via property, search again
      if (routeFound(route, nextStation, destination)) {
        let endIndex = route.stations.indexOf(destination);
        let newRoute = {
          'destinationNaptanId': destination,
          'departureNaptanId': route.departureNaptanId,
          'via': via,
          'stations': route.stations.slice(0, endIndex+1)
        };
        return newRoute;
      }
    }
  }

  placeRailwayOnMap() {
    map.addSource(`${this.#lineId} Railway`, {
      type: "geojson",
      data: this.#railwayGeoJson,
    });

    map.addLayer({
      id: `${this.#lineId} Railway Style`,
      type: "line",
      source: `${this.#lineId} Railway`,
      paint: {
        "line-color": this.#lineColor,
        "line-width": 3,
      },
    });
  }
}
