import { Railway } from './Railway.js'

export class Moving {
  constructor(info) {
    this.info = info;
  }

  calculateDistanceTravelled() {
    let milesPerSecond =
      this.info.railway.distance / this.info.prediction.timetableToStation; //How many miles a second travels for a train in terms of timetable
    let secondsTravelled =
      this.info.prediction.timetableToStation - this.info.prediction.timeToStation;
    return milesPerSecond * secondsTravelled;
  }

  createRailway() {
    let railway = new Railway(
      this.info.lineInformation,
      this.info.prediction.nextStationNaptanId,
      this.info.prediction.previousStationNaptanId
    );
    return railway;
  }

  simulateTime(time) {
    this.info.prediction.timeToStation -= time;
    if (this.info.prediction.timeToStation <= 0) {
      this.reachedNextStation();
    }
  }

  reachedNextStation() {
    if (this.isEndOfRoute()) {
      this.info.change(new EndOfRoute(this.info));
    } else if (this.isOutOfPredictions()){
      this.info.change(new OutOfPredictions(this.info));
    } else {
      this.info.prediction.reachedNextStation();
      this.info.railway.update(
        this.info.prediction.nextStationNaptanId,
        this.info.prediction.previousStationNaptanId
      );
    }
  }

  isOutOfPredictions() {
    return this.info.prediction.stationsPredictions.length === 1;
  }

  isEndOfRoute() {
    return this.info.prediction.nextStationNaptanId === this.info.prediction.route.destinationNaptanId;
  }
}

class OutOfPredictions {
  constructor(info){
    this.info = info;
  }

  calculateDistanceTravelled() {
    return this.info.distanceTravelled;
  }

  simulateTime(time) {
    this.info.prediction.timeToStation = null;
  }
}

class EndOfRoute {
  constructor(info) {
    this.info = info;
  }

  calculateDistanceTravelled() {
    return this.info.distanceTravelled;
  }

  simulateTime(time) {
    this.info.prediction.timeToStation = null;
  }
}

export class StartOfRoute { //Train at starting station, waiting to move
  constructor(info) {
    this.info = info;
  }

  calculateDistanceTravelled() {
    return 0;
  }

  createRailway() {
    let railway = new Railway(
      this.info.lineInformation,
      this.info.prediction.getNextStation(),
      this.info.prediction.nextStationNaptanId
    );
    return railway;
  }

  simulateTime(time) {
    this.info.prediction.timeToStation -= time;
    if (this.info.prediction.timeToStation <= 0) {
      this.reachedNextStation();
    }
  }

  reachedNextStation() {
    if (this.isOutOfPredictions()){
      this.info.change(new OutOfPredictions(this.info));
    } else {
      this.info.prediction.reachedNextStation();
      this.info.change(new Moving(this.info))
    }
  }

  isOutOfPredictions() {
    return this.info.prediction.stationsPredictions.length === 1;
  }
}
