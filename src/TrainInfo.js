import { TrainMarker } from './TrainMarker.js'
import { Moving } from './TrainStates.js'
import { StartOfRoute } from './TrainStates.js'
import * as turf from '@turf/turf'
// Holds all information about a train that allows it to be displayed on the map
export class TrainInfo {
  constructor(prediction) {
    this.trainSpeed = 0.00000569444; //20.5mph in millisenconds
    this.lineInformation = prediction.lineInformation;
    this.prediction = prediction;
    this.state = this.getTrainState();
    this.railway = this.createRailway();
    this.distanceTravelled = this.calculateDistanceTravelled();
    this.coordinates = this.calculateCoordinates();
    this.bearing = this.calculateBearing();
    this.marker = new TrainMarker(this.coordinates, this.bearing, this.createPopupText());
  }
  // Called after a new TrainPrediction has been inserted after updating from the TFL API
  update() {
    this.state = this.getTrainState();
    this.railway = this.createRailway();
    this.distanceTravelled = this.calculateDistanceTravelled();
    this.coordinates = this.calculateCoordinates();
    this.bearing = this.calculateBearing();
    this.calculateNewPosition();
    this.setMarkerProperties();
  }

  simulateTime(time) {
    this.state.simulateTime(time);
  }

  calculateNewPosition() {
    this.distanceTravelled = this.calculateDistanceTravelled();
    this.coordinates = this.calculateCoordinates();
    this.bearing = this.calculateBearing();
  }

  setMarkerProperties() {
    this.marker.setLngLat(this.coordinates);
    this.marker.setBearing(this.bearing);
    this.marker.setPopupText(this.createPopupText());
  }

  change(state) { //Method to update state object held
    this.state = state;
  }

  reachedNextStation() {
    this.state.reachedNextStation();
  }

  getTrainState() {
    if (this.prediction.startOfRoute) {
      return new StartOfRoute(this);
    }
    return new Moving(this);
  }

  createPopupText() {
    let nextStationName = getStationName(this.prediction.nextStationNaptanId)
    let strlength = nextStationName.length
    nextStationName = nextStationName.substring(0, strlength-19); //19 is the length to remove "underground station"
    
    let destinationStationName = getStationName(this.prediction.destinationNaptanId)
    strlength = destinationStationName.length
    destinationStationName = destinationStationName.substring(0, strlength-19);

    return `<strong>${this.prediction.lineName} train</strong><br>
    Towards: ${destinationStationName}<br>
    Next stop: ${nextStationName} station<br>
    Expected in: ${Math.floor(this.prediction.timeToStation/60)}:${Math.floor(this.prediction.timeToStation%60)}<br>
    (${this.prediction.uniqueId})`
  }

  createRailway() {
    return this.state.createRailway();
  }

  calculateDistanceTravelled() {
    return this.state.calculateDistanceTravelled();
  }

  calculateCoordinates() {
    return turf.along(turf.lineString(this.railway.coordinates), this.distanceTravelled, {units: "miles",}).geometry.coordinates;
  }

  calculateBearing() {
    let futureDistanceTravalled = this.distanceTravelled + 0.5 * this.trainSpeed;
    if (futureDistanceTravalled > this.railway.distance) {futureDistanceTravalled = this.railway.distance}
    let futureCoordinates = turf.along(
      turf.lineString(this.railway.coordinates), futureDistanceTravalled, {units: "miles",}).geometry.coordinates;
    let bearing = turf.bearing(this.coordinates, futureCoordinates);
    if (bearing < 0) {bearing += 360} //Convert negative bearing to value between 180 to 360
    return bearing;
  }
}
