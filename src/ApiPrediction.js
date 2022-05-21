import { TrainPrediction } from "./TrainPrediction.js";
import regeneratorRuntime from "regenerator-runtime";
// Queries TFL API and filters data for displayable trains
export class ApiPrediction {
  constructor(lineInformation) {
    this.lineInformation = lineInformation;
    this.vehicleIds = new Set();
  }

  async queryLinePredictions() {
    let appKey = '89a6802a84af46beb60ef2ae0df8c71f';
    let query = `https://api.tfl.gov.uk/Line/${this.lineInformation.getLineId()}/Arrivals?app_key=${appKey}`;
    this.linePredictions = await getJsonData(query);
  }

  getVehicleIds() {
    this.linePredictions.forEach((prediction) => {
      this.vehicleIds.add(prediction.vehicleId);
    });
  }

  async queryVehiclePredictions() {
    let vehicleIdArray = Array.from(this.vehicleIds);
    let appKey = '89a6802a84af46beb60ef2ae0df8c71f';
    if (vehicleIdArray.length > 64) { // Vehicle arrivals endpoint has maximum limit 64 ids to be queried
      this.vehiclePredictions = await getJsonData(
        `https://api.tfl.gov.uk/Vehicle/${vehicleIdArray.slice(0,65)}/Arrivals?app_key=${appKey}`
      );
      let secondVehiclePredictions = await getJsonData(
        `https://api.tfl.gov.uk/Vehicle/${vehicleIdArray.slice(64)}/Arrivals?app_key=${appKey}`
      );
      this.vehiclePredictions = Object.assign(this.vehiclePredictions, secondVehiclePredictions);
    } else {
      this.vehiclePredictions = await getJsonData(
        `https://api.tfl.gov.uk/Vehicle/${vehicleIdArray}/Arrivals?app_key=${appKey}`
      );
    }
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
    if (prediction.destinationId === undefined) { // Missing data used to match predictions
      return trainPredictions.findIndex(
        trainPrediction => uniqueId === trainPrediction.uniqueId && 
        trainPrediction.currentLocation === prediction.currentLocation); // Use current location to match predictions instead
    } else {
      return trainPredictions.findIndex(trainPrediction => trainPrediction.uniqueId === uniqueId);
    }
  }

  filterUniqueTrains() {
    let trainPredictions = [];
    this.vehiclePredictions.forEach((prediction) => {
      if (prediction.currentLocation == "At Platform") { // If train is at station platform, the current location property doesn't display station name
        prediction.currentLocation = this.updateCurrentLocation(prediction); // Get station name from other properties to complete the current location
      }
      let uniqueId = this.createUniqueId(prediction); // UniqueId used to match predictions to create information about a train
      let trainPredictionsIndex = this.checkTrainExists(prediction, uniqueId, trainPredictions);
      if (trainPredictionsIndex === -1) { // TrainPrediction not created for train yet
        let trainPrediction = new TrainPrediction(
          uniqueId,
          prediction,
          this.lineInformation
        );
        trainPredictions.push(trainPrediction);
      } else { //TrainPrediction exists for train, add prediction data to it
        trainPredictions[trainPredictionsIndex].stationsPredictions.push(
          prediction
        );
      }
    });
    return trainPredictions
  }

  filterLineOnlyTrains() { // Checks all predictions for a train are running on the queried line
    let lineTrainPredictions = [];
    this.trainPredictions.forEach((trainPrediction) => {
      if (trainPrediction.stationsPredictions.every(prediction => prediction.lineId === this.lineInformation.getLineId() && 
        this.lineInformation.getStationIds().has(prediction.naptanId))) {
          lineTrainPredictions.push(trainPrediction);
        }
    });
    return lineTrainPredictions;
  }

  removeUselessAttributes() { // Properties of arrival data not useful, makes it easier to read logged data for debugging
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

  checkMissingPredictions() { // Some stations have issues with displaying data, create predictions for missing data
    for (let trainPrediction of this.usableTrainPredictions) {
      if (trainPrediction.timeToStation > trainPrediction.timetableToStation && !trainPrediction.startOfRoute) {
        trainPrediction.timeToGreaterThanTimetable();
      }
    }
  }

  filterUsableTrainPredictions() { // Destination and direction are needed to display a train on the map
    return this.lineTrainPredictions.filter(trainPrediction => 
      trainPrediction.destinationNaptanId !== undefined && trainPrediction.direction !== undefined);
  }
}
