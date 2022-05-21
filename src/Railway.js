import * as turf from '@turf/turf'
// Represents the coordinates a train moves along between 2 stations
export class Railway {
  constructor(lineInformation, nextStation, previousStation) {
    this.lineInformation = lineInformation;
    this.info = this.lineInformation.getRailwayData(
      nextStation,
      previousStation
    );
    this.coordinates = this.info.coordinates;
    this.distance = this.calculateDistance();
  }

  calculateDistance() {
    return turf.length(turf.lineString(this.coordinates), {
      units: "miles",
    }); //Current railway distance between stations
  }

  update(nextStation, previousStation) {
    this.info = this.lineInformation.getRailwayData(
      nextStation,
      previousStation
    );
    this.coordinates = this.info.coordinates;
    this.distance = this.calculateDistance();
  }
}
