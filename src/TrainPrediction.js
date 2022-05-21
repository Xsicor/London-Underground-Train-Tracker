// Represents all information that can be created from arrival data
export class TrainPrediction {
  constructor(uniqueId, prediction, lineInformation) {
    this.uniqueId = uniqueId;
    this.lineInformation = lineInformation;
    this.vehicleId = prediction.vehicleId;
    this.destinationNaptanId = prediction.destinationNaptanId;
    this.direction = prediction.direction;
    this.currentLocation = prediction.currentLocation;
    this.stationsPredictions = [prediction];
    this.lineName = prediction.lineName;
    this.via = this.getVia();
  }

  sortPredictionsByTime() {
    this.stationsPredictions.sort((a, b) => a.timeToStation - b.timeToStation);
  }

  getVia() { // Via used to find route train is travelling on
    if (!(this.stationsPredictions[0].towards.includes('via'))){
      return 'null';
    }
    let strArray = this.stationsPredictions[0].towards.split(' ');
    let viaName = strArray.at(-1);
    return viaMap[viaName];
  }

  isStartOfRoute() { // Train is at beginning station, not moving
    return this.route.departureNaptanId === this.nextStationNaptanId; 
  }

  setAdditionalProperties() { // Information that can be created once all predictions have been matched
    this.nextStationNaptanId = this.stationsPredictions[0].naptanId;
    this.timeToStation = this.stationsPredictions[0].timeToStation;
    // Destination and direction required to get the trains route
    if (this.destinationNaptanId === undefined || this.direction === undefined) {return}
    
    this.route = this.lineInformation.getRouteData(this.destinationNaptanId,
      this.nextStationNaptanId,
      this.via,
    );
    this.timetableData = this.lineInformation.getTimetableData(this.route);
    this.startOfRoute = this.isStartOfRoute();
    this.timetableToStation = (this.startOfRoute) ? null : this.getTimetableToStation();
    this.previousStationNaptanId = (this.startOfRoute) ? null : this.getPreviousStation();
  }

  getTimetableToStation() {
    for (let interval of this.timetableData.timetable) {
      if (interval.destinationNaptanId === this.nextStationNaptanId) {
        return interval.timeToArrival*60; // Timetable data is in minutes, convert to seconds
      }
    }
  }

  getPreviousStation() {
    let index = this.route.stations.indexOf(this.nextStationNaptanId);
    return this.route.stations[index-1];
  }

  getNextStation() {
    let index = this.route.stations.indexOf(this.nextStationNaptanId);
    return this.route.stations[index+1];
  }

  timeToGreaterThanTimetable() { //Missing prediction(s), create them
    while (this.timeToStation > this.timetableToStation) {
      this.nextStationNaptanId = this.getPreviousStation();
      this.timeToStation = this.timeToStation - this.timetableToStation;
      this.stationsPredictions.unshift(this.createPrediction());
      this.previousStationNaptanId = this.getPreviousStation();
      this.timetableToStation = this.getTimetableToStation();
    }
    if (this.isStartOfRoute()) {
      this.startOfRoute = true;
    }
  }

  createPrediction() {
    let prediction = {
      currentLocation: this.currentLocation,
      destinationName: getStationName(this.destinationNaptanId),
      destinationNaptanId: this.destinationNaptanId,
      direction: this.direction,
      id: 'null',
      lineId: this.lineInformation.getLineId(),
      lineName: this.lineName,
      naptanId: this.nextStationNaptanId,
      operationType: 'null',
      platformName: 'null',
      stationName: getStationName(this.nextStationNaptanId),
      timeToStation: this.timeToStation,
      towards: this.stationsPredictions[0].towards,
      vehicleId: this.vehicleId
    }
    return prediction;
  }

  reachedNextStation() { // Update data when simulated train has reached next station
    this.previousStationNaptanId = this.nextStationNaptanId;
    let nextStationIndex = this.route.stations.indexOf(this.previousStationNaptanId) + 1;
    this.nextStationNaptanId = this.route.stations[nextStationIndex];
    this.timetableToStation = this.getTimetableToStation();
    this.timeToStation = this.timetableToStation;
  }
}
