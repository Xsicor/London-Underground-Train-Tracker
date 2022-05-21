import { AnimateTrain } from './AnimateTrain.js'
import { ApiPrediction } from './ApiPrediction.js'
import { LineTrains } from './LineTrains.js'
import { LineInformation } from './LineInformation.js'
import { TrainInfo } from './TrainInfo.js'
import { UpdateTrains } from './UpdateTrains.js'
import * as turf from '@turf/turf'
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken =
  "pk.eyJ1IjoiYWdyYWlzIiwiYSI6ImNrdHVnOWU0azBoeGIycnF0dGE2dHp4dXYifQ.gIMMHinrqMqWUQSQCAP4bw";
export const map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/mapbox/light-v10", // style URL
  center: [-0.09, 51.505],
  zoom: 12,
  minZoom: 10,
});

// Use turf library to create geojson from TFL API stations data to be displayed on the map
function createStationGeoJson(stationData) {
  let stationPoints = stationData['stations'].map(station => turf.point([station["lon"], station["lat"]], {
    name: station["name"],
  }));
  return turf.featureCollection(stationPoints);
}
// Add source data and style layer for station coordinates to display on the map
function addStationLayer(stationCollection) {
  map.addSource("Stations", {
    type: "geojson",
    data: stationCollection,
  });

  map.addLayer({
    id: "Station Style",
    type: "circle",
    source: "Stations",
    paint: {
      "circle-color": "#FFFFFF",
      "circle-stroke-color": "#232e21",
      "circle-radius": 7,
      "circle-stroke-width": 2,
    },
  });
}
// Popup functionality when clicking on a station icon
function addStationPopup() {
  // Create a popup, but don't add it to the map yet.
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: true,
  });

  map.on('mouseenter', 'Station Style', (e) => {
    map.getCanvas().style.cursor = "pointer";
  })

  map.on("mouseleave", "Station Style", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", "Station Style", (e) => {
    // map.getCanvas().style.cursor = "pointer";

    const coordinates = e.features[0].geometry.coordinates.slice();
    const name = e.features[0].properties.name;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    popup.setLngLat(coordinates).setHTML(name).addTo(map);
  });
}

// Main is async to allow querying TFL API for live predictions data
async function Main() {
  // Get JSON data from Django template
  stationData = JSON.parse(document.getElementById('stationData').textContent); 
  railwayData = JSON.parse(document.getElementById('railwayData').textContent);
  timetableData = JSON.parse(document.getElementById('timetableData').textContent);
  routeData = JSON.parse(document.getElementById('routeData').textContent);
  
  let lineInformationList = []
  let lineColorsMap = new Map(Object.entries(lineColors));
  for (let [lineId, color] of lineColorsMap) {
    lineInformationList.push(new LineInformation(lineId, color))
  }
  let stationCollection = createStationGeoJson(stationData);
  addStationLayer(stationCollection);
  addStationPopup();

  let lineTrainsList = []
  for (let line of lineInformationList) {
    let predictions = new ApiPrediction(line);
    await predictions.queryLinePredictions();
    predictions.getVehicleIds();
    if (predictions.vehicleIds.size > 0) {
      await predictions.queryVehiclePredictions();
    } else {
      continue; // No trains running on line, skip loop to query next line
    }
    predictions.createTrainPredictions();
    
    let trainsList = predictions.usableTrainPredictions.map(trainPrediction => new TrainInfo(trainPrediction));
    lineTrainsList.push(new LineTrains(line.getLineId(), trainsList));
  }
  for (let lineTrain of lineTrainsList) {
    lineTrain.addToMap(); // Adds all markers to map at once
  }

  console.log(lineTrainsList);

  let animation = new AnimateTrain(lineTrainsList);
  let updateTrains = new UpdateTrains(lineTrainsList, lineInformationList);

  animation.startAnimation();    
  // Use setTimeout instead of setInterval as it takes time for the tfl api to be queried which uses the setInterval time
  setTimeout(() => updateTrains.update(), 30000);
}

map.on("load", () => {
  Main();
});

