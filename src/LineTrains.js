// Holds all trains that are displayed on the map
export class LineTrains {
  constructor(lineId, trains) {
    this.lineId = lineId;
    this.trains = trains;
  }

  addToMap() {
    for (let train of this.trains) {
      train.marker.addToMap();
    }
  }
}
