import { TrainPrediction } from "./TrainPrediction.js";

export class ApiPrediction {
  constructor(lineInformation) {
    this.lineInformation = lineInformation;
    this.vehicleIds = new Set();
  }

  async queryLinePredictions() {
    let query = `https://api.tfl.gov.uk/Line/${this.lineInformation.getLineId()}/Arrivals`;
    this.linePredictions = await getJsonData(query);
  }

  getVehicleIds() {
    this.linePredictions.forEach((prediction) => {
      this.vehicleIds.add(prediction.vehicleId);
    });
  }

  async queryVehiclePredictions() {
    let vehicleIdArray = Array.from(this.vehicleIds);
    this.vehiclePredictions = await getJsonData(
      `https://api.tfl.gov.uk/Vehicle/${vehicleIdArray}/Arrivals`
    );
  }

  updateCurrentLocation(prediction) {
    let newCurrentLocation = "At ";
    let stationName = prediction.stationName.split(" ");
    for (let i = 0; i < stationName.length - 2; i++) {
      newCurrentLocation += stationName[i] + " ";
    }

    let platformName = prediction.platformName.split(" ");
    newCurrentLocation += platformName.at(-2) + " ";
    newCurrentLocation += platformName.at(-1);
    newCurrentLocation = newCurrentLocation.replace("'", "");
    newCurrentLocation = newCurrentLocation.replace(/ *\([^)]*\) */g, " ");

    return newCurrentLocation;
  }

  createUniqueId(prediction) {
    let destinationId = prediction.destinationNaptanId ?? 0;
    return `${prediction.vehicleId}-${destinationId}`;
  }

  checkTrainExists(prediction, uniqueId, trainPredictions) {
    if (prediction.destinationId === undefined) {
      return trainPredictions.findIndex(
        trainPrediction => uniqueId === trainPrediction.uniqueId && 
        trainPrediction.currentLocation === prediction.currentLocation);
    } else {
      return trainPredictions.findIndex(trainPrediction => trainPrediction.uniqueId === uniqueId);
    }
  }

  filterUniqueTrains() {
    let trainPredictions = [];
    this.vehiclePredictions.forEach((prediction) => {
      if (prediction.currentLocation == "At Platform") {
        prediction.currentLocation = this.updateCurrentLocation(prediction);
      }
      let uniqueId = this.createUniqueId(prediction);
      let trainPredictionsIndex = this.checkTrainExists(prediction, uniqueId, trainPredictions);
      if (trainPredictionsIndex === -1) {
        let trainPrediction = new TrainPrediction(
          uniqueId,
          prediction,
          this.lineInformation
        );
        trainPredictions.push(trainPrediction);
      } else {        
        trainPredictions[trainPredictionsIndex].stationsPredictions.push(
          prediction
        );
      }
    });
    return trainPredictions
  }

  filterLineOnlyTrains() {
    let lineTrainPredictions = [];
    this.trainPredictions.forEach((trainPrediction) => {
      if (trainPrediction.stationsPredictions.every(prediction => prediction.lineId === this.lineInformation.getLineId() && 
        this.lineInformation.getStationIds().has(prediction.naptanId))) {
          lineTrainPredictions.push(trainPrediction);
        }
    });

    return lineTrainPredictions;
  }

  removeUselessAttributes() {
    this.vehiclePredictions.forEach((prediction) => {
      delete prediction.$type;
      delete prediction.bearing;
      delete prediction.timing;
      delete prediction.timeToLive;
      delete prediction.expectedArrival;
      delete prediction.modeName;
    });
  }

  sortTrainPredictionsById() {
    this.lineTrainPredictions.sort((a, b) => a.vehicleId - b.vehicleId);
  }

  createTrainPredictions() {
    this.removeUselessAttributes();
    this.trainPredictions = this.filterUniqueTrains();
    this.lineTrainPredictions = this.filterLineOnlyTrains();
    this.lineTrainPredictions.forEach((trainPrediction) => {
      trainPrediction.sortPredictionsByTime();
      trainPrediction.setAdditionalProperties();
    });
    this.sortTrainPredictionsById();
    this.usableTrainPredictions = this.filterUsableTrainPredictions();
    this.checkMissingPredictions();
  }

  checkMissingPredictions() {
    for (let trainPrediction of this.usableTrainPredictions) {
      if (trainPrediction.timeToStation > trainPrediction.timetableToStation && !trainPrediction.startOfRoute) {
        trainPrediction.timeToGreaterThanTimetable();
      }
    }
  }

  filterUsableTrainPredictions() {
    return this.lineTrainPredictions.filter(trainPrediction => 
      trainPrediction.destinationNaptanId !== undefined && trainPrediction.direction !== undefined);
  }
}
