export class AnimateTrain {
  constructor(lineTrains) {
    this.lineTrains = lineTrains;
    this.elapsed;
    this.previousTimestamp;
    this.running = true;
  }

  animate(timestamp) {
    if (this.previousTimeStamp === undefined) {
      this.elapsed = 0;
    } else {
      this.elapsed = timestamp - this.previousTimeStamp;
    }
    this.previousTimeStamp = timestamp;

    for (let line of this.lineTrains) {
      for (let train of line.trains) {
        train.simulateTime(this.elapsed / 1000);
        train.calculateNewPosition();
        train.setMarkerProperties();
      }
    }
    if (this.running) {
      requestAnimationFrame((t) => this.animate(t));
    }
  }

  stopAnimation() {
    this.running = false;
    this.previousTimeStamp = undefined;
  }

  resumeAnimation() {
    this.running = true;
  }

  startAnimation() {
    requestAnimationFrame((t) => this.animate(t));
  }
}
