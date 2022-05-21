import { ApiPrediction } from "./ApiPrediction";
import { TrainInfo } from './TrainInfo.js'

export class UpdateTrains {
  constructor(linetrainsList, lineInformationList) {
    this.linetrainsList = linetrainsList;
    this.lineInformationList = lineInformationList;
  }

  async update() {
    for (let lineTrains of this.linetrainsList) {
      let predictions = new ApiPrediction(this.lineInformationList.find(line => line.getLineId() === lineTrains.lineId));
      await predictions.queryLinePredictions();
      predictions.getVehicleIds();
      if (predictions.vehicleIds.size > 0) {
        await predictions.queryVehiclePredictions();
      } else {
        continue; // No trains running on line, skip loop to query next line
      }
      predictions.createTrainPredictions();
      // Match new data with existing held data
      let matchingPredictions = predictions.usableTrainPredictions.filter(
        trainPrediction => lineTrains.trains.some(train => train.prediction.uniqueId === trainPrediction.uniqueId));
      // Update held data with new data
      for (let newTrainPrediction of matchingPredictions) {
        lineTrains.trains.find(train => train.prediction.uniqueId === newTrainPrediction.uniqueId).prediction = newTrainPrediction;
      }
      // Remaining data are new trains that weren't previously displayed
      let newPredictions = predictions.usableTrainPredictions.filter(
        newPrediction => !(matchingPredictions.some(prediction => newPrediction.uniqueId === prediction.uniqueId)))
      // Create TrainInfo object to display new trains on map
      for (let newTrainPrediction of newPredictions) {
        lineTrains.trains.push(new TrainInfo(newTrainPrediction));
      }
      // Remove any trains that are held that aren't found in the new data queried
      for (let train of lineTrains.trains) {
        if (!(predictions.usableTrainPredictions.some(trainPrediction => trainPrediction.uniqueId === train.prediction.uniqueId))) {
          lineTrains.trains = lineTrains.trains.filter(oldTrain => oldTrain.prediction.uniqueId !== train.prediction.uniqueId);
          train.marker.removeFromMap();
        }
      }
      // Update data after new arrival data has been inserted
      for (let train of lineTrains.trains) {
        train.update();
      }
    }
    console.log('Updated');
    setTimeout(() => this.update(), 30000);
  }
}
