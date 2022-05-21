export class AnimateTrain {
  constructor(lineTrains) {
    this.lineTrains = lineTrains;
    this.elapsed;
    this.previousTimestamp;
  }

  animate(timestamp) { //Animation loop function
    if (this.previousTimeStamp === undefined) {
      this.elapsed = 0;
    } else {
      this.elapsed = timestamp - this.previousTimeStamp;
    }
    this.previousTimeStamp = timestamp;

    for (let line of this.lineTrains) { //Loop through all trains and update information
      for (let train of line.trains) {
        train.simulateTime(this.elapsed / 1000);
        train.calculateNewPosition();
        train.setMarkerProperties();
      }
    }
    requestAnimationFrame((t) => this.animate(t));
  }
  
  startAnimation() {
    requestAnimationFrame((t) => this.animate(t));
  }
}
