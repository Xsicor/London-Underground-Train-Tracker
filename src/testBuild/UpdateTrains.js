import { ApiPrediction } from "./ApiPrediction";
import { TrainInfo } from './TrainInfo.js'

export class UpdateTrains {
  constructor(linetrainsList, animation, lineInformationList) {
    this.linetrainsList = linetrainsList;
    this.animation = animation;
    this.lineInformationList = lineInformationList;
  }

  stopAnimation() {
    this.animation.stopAnimation();
  }

  startAnimation() {
    this.animation.resumeAnimation();
  }

  update() {
    this.stopAnimation();
    for (let lineTrains of this.linetrainsList) {
      let newPredictionData = this.data.lines.find(line => line.id === lineTrains.lineId).data;
      let updatedPredictions = new ApiPrediction(this.lineInformationList.find(line => line.getLineId() === lineTrains.lineId))
      updatedPredictions.vehiclePredictions = newPredictionData;
      updatedPredictions.createTrainPredictions();

      let matchingPredictions = updatedPredictions.usableTrainPredictions.filter(
        trainPrediction => lineTrains.trains.some(train => train.prediction.uniqueId === trainPrediction.uniqueId));
      
      for (let newTrainPrediction of matchingPredictions) {
        lineTrains.trains.find(train => train.prediction.uniqueId === newTrainPrediction.uniqueId).prediction = newTrainPrediction;
      }

      let newPredictions = updatedPredictions.usableTrainPredictions.filter(
        newPrediction => !(matchingPredictions.some(prediction => newPrediction.uniqueId === prediction.uniqueId)))
      
      for (let newTrainPrediction of newPredictions) {
        lineTrains.trains.push(new TrainInfo(newTrainPrediction));
      }

      for (let train of lineTrains.trains) {
        if (!(updatedPredictions.usableTrainPredictions.some(trainPrediction => trainPrediction.uniqueId === train.prediction.uniqueId))) {
          lineTrains.trains = lineTrains.trains.filter(oldTrain => oldTrain.prediction.uniqueId !== train.prediction.uniqueId);
        }
      }
      
      for (let train of lineTrains.trains) {
        train.update();
      }
    }
    this.startAnimation();
  }
}
