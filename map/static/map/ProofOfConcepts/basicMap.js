mapboxgl.accessToken =
  "pk.eyJ1IjoiYWdyYWlzIiwiYSI6ImNrdHVnOWU0azBoeGIycnF0dGE2dHp4dXYifQ.gIMMHinrqMqWUQSQCAP4bw";
const map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/mapbox/light-v10", // style URL
  center: [-0.09, 51.505], // starting position [lng, lat]
  zoom: 12, // starting zoom
  minZoom: 10,
});
