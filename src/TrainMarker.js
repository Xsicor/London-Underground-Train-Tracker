import mapboxgl from 'mapbox-gl';
import { map } from './Main.js';

export class TrainMarker {
  constructor(coordinates, bearing, popupText) {
    this.marker = new mapboxgl.Marker(this.createDiv());
    this.setLngLat(coordinates);
    this.setBearing(bearing);
    this.popup = new mapboxgl.Popup({ offset: 25, closeButton: false });
    this.setPopupText(popupText);
    this.marker.setPopup(this.popup);
    this.marker.setRotationAlignment("map");
  }

  addToMap() {
    this.marker.addTo(map);
  }

  removeFromMap() {
    this.marker.remove();
  }

  setPopupText(text) {
    this.popup.setHTML(text);
  }

  createDiv() {
    let el = document.createElement("div");
    el.className = "marker";
    el.style.width = "30px";
    el.style.height = "30px";
    el.style.backgroundSize = "100%";
    return el;
  }

  setLngLat(coordinates) {
    this.marker.setLngLat(coordinates);
  }

  setBearing(bearing) {
    this.marker.setRotation(bearing);
  }
}
