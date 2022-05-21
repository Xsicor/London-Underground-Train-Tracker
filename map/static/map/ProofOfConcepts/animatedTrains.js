var mapbox = window.mapbox;
var turf = window.turf;

var railwayData, stationData;
var trainMarkers = [];
var trainSpeed = 0.00000569444; //20.5mph in millisenconds
let previousTimeStamp;
var map;

async function getJsonData(url) {
  const staticJsonData = await fetch(url);
  const jsonData = await staticJsonData.json();
  return jsonData;
}

class TrainPrediction {
  constructor(vehicleId, destinationNaptanId, direction, stationsPredictions) {
    this.vehicleId = vehicleId;
    this.destinationNaptanId = destinationNaptanId;
    this.direction = direction;
    this.currentLocation = currentLocation;
    this.stationsPredictions = stationsPredictions;
  }

  sortPredictionsByTime() {
    this.stationsPredictions.sort((a, b) => a.timeToStation - b.timeToStation);
  }
}

function setNewTrainBearing(train, elapsed) {
  let distanceTravelledPrediction;
  if (train.direction == "outbound") {
    distanceTravelledPrediction =
      train.distanceTravelled + elapsed * trainSpeed;
    if (distanceTravelledPrediction > train.railwayDistance) {
      //Check if prediction goes past railway as turf along function won't work
      return;
    }
  } else {
    distanceTravelledPrediction =
      train.distanceTravelled - elapsed * trainSpeed;
    if (distanceTravelledPrediction < 0) {
      return;
    }
  }
  var trainLocationFeaturePrediction = turf.along(
    railwayData["features"][train.currentRail],
    distanceTravelledPrediction,
    { units: "miles" }
  );
  currentTrainCoordinates = [
    train.marker.getLngLat().lng,
    train.marker.getLngLat().lat,
  ];
  var trainBearing = turf.bearing(
    currentTrainCoordinates,
    trainLocationFeaturePrediction["geometry"]["coordinates"]
  );
  if (trainBearing < 0) {
    trainBearing += 360; //Convert negative bearing to 180 to 360 value
  }
  train.marker.setRotation(trainBearing);
}

function setNewTrainLocation(train, elapsed) {
  train.timeToStation -= elapsed / 1000; //Simulate live prediction
  train.distanceTravelled = calculateTrainDistanceTravelled(train); //Calculate new distance travelled
  if (
    train.direction == "outbound" &&
    train.distanceTravelled > train.railwayDistance
  ) {
    //Reached next station
    train.distanceTravelled = train.railwayDistance; //DistanceTravlled should never be greater than railwayDistance
  } else if (train.direction == "inbound" && train.distanceTravelled < 0) {
    train.distanceTravelled = 0; //Reverse is true for inbound trains
  }
  newTrainLocationFeature = turf.along(
    railwayData["features"][train.currentRail],
    train.distanceTravelled,
    { units: "miles" }
  );
  train.marker.setLngLat([
    newTrainLocationFeature["geometry"]["coordinates"][0],
    newTrainLocationFeature["geometry"]["coordinates"][1],
  ]);
}

function hasReachedNextStation(train) {
  if (
    train.direction == "outbound" &&
    train.distanceTravelled == train.railwayDistance
  ) {
    train.currentRail++;
    if (train.currentRail == railwayData["features"].length) {
      //Train has reached end of the line
      train.moving = false;
    }
    return true;
  } else if (train.direction == "inbound" && train.distanceTravelled == 0) {
    train.currentRail--;
    if (train.currentRail == -1) {
      //Train has reached end of the line
      train.moving = false;
    }
    return true;
  }
}

function updateTrainReachedNextStation(train) {
  if (train.stations.length == 1) {
    //No more api data to use, so can't estimate train location
    train.moving = false;
    return;
  }
  train.stations.shift(); //Reached next station, remove it from list
  train.nextStation = train.stations[0];
  train.timetableToStation = findTimetableForNextStation(train);
  train.timeToStation = train.timetableToStation;
  train.railwayDistance = calculateTrainRailwayDistance(train);
  train.distanceTravelled =
    train.direction == "outbound" ? 0 : train.railwayDistance;
}

function animateTrain(timestamp) {
  var elapsed;
  if (previousTimeStamp == undefined) {
    elapsed = 0;
  } else {
    elapsed = timestamp - previousTimeStamp;
  }
  //Loop through all trains on the map
  for (let i = 0; i < trainMarkers.length; i++) {
    if (!trainMarkers[i].moving) {
      continue;
    } else if (trainMarkers[i].startOfLine) {
      trainMarkers[i].timeToStation -= elapsed / 1000;
      if (trainMarkers[i].timeToStation <= 0) {
        trainMarkers[i].startOfLine = false;
        updateTrainReachedNextStation(trainMarkers[i]);
      }
    } else {
      setNewTrainLocation(trainMarkers[i], elapsed);
      setNewTrainBearing(trainMarkers[i], elapsed);
      if (hasReachedNextStation(trainMarkers[i])) {
        if (trainMarkers[i].moving) {
          updateTrainReachedNextStation(trainMarkers[i]);
        }
      }
    }
  }

  previousTimeStamp = timestamp;
  window.requestAnimationFrame(animateTrain);
}

function setInitialTrainLngLat(train) {
  newTrainLocationFeature = turf.along(
    railwayData["features"][train.currentRail],
    train.distanceTravelled,
    { units: "miles" }
  );
  train.marker.setLngLat([
    newTrainLocationFeature["geometry"]["coordinates"][0],
    newTrainLocationFeature["geometry"]["coordinates"][1],
  ]);
}

function atPlatformUpdateName(prediction) {
  let newcurrentLocation = "At ";
  let words = prediction.stationName.split(" ");
  for (let i = 0; i < words.length - 2; i++) {
    newcurrentLocation += words[i] + " ";
  }

  words = prediction.platformName.split(" ");
  newcurrentLocation += words.at(-2) + " ";
  newcurrentLocation += words.at(-1);
  newcurrentLocation = newcurrentLocation.replace("'", "");
  newcurrentLocation = newcurrentLocation.replace(/ *\([^)]*\) */g, " ");

  return newcurrentLocation;
}

function generateStationIdSet() {
  let stationIdSet = new Set();
  for (let i = 0; i < stationData["features"].length; i++) {
    stationIdSet.add(stationData["features"][i].properties.id);
  }
  return stationIdSet;
}

async function getHammersmithStationPredictions(stationIdSet) {
  let hammersmithStationPredictions = [];
  let arrivalPredicitons = await getJsonData(
    "https://api.tfl.gov.uk/Line/hammersmith-city/Arrivals"
  );
  arrivalPredicitons.forEach((station) => {
    //Arrival prediction data for a line includes stations not on the hammersmith railway, remove them
    if (stationIdSet.has(station.naptanId)) {
      hammersmithStationPredictions.push(station);
    }
  });
  return hammersmithStationPredictions;
}

async function getVehiclePredictions(vehicleIdSet) {
  let url = "https://api.tfl.gov.uk/Vehicle/";
  vehicleIdSet.forEach((ID) => {
    url += ID + ",";
  });
  url = url.slice(0, -1);
  url += "/Arrivals";
  let vehicleIdPredictions = await getJsonData(url);

  return vehicleIdPredictions;
}

function checkTrainExists(trainPredictions, prediction) {
  for (let i = 0; i < trainPredictions.length; i++) {
    if (prediction.vehicleId != trainPredictions[i].vehicleId) {
      continue;
    }
    if (prediction.destinationNaptanId == undefined) {
      //Only used for trains with vehicleId == 000. Meaning the train is manually operated
      if (prediction.currentLocation == trainPredictions[i].currentLocation) {
        return i;
      }
    } else if (prediction.vehicleId == "000") {
      //Multipole trains have 000 vehicleId and same destinationNaptanId, therefore have to compare currentLocation as well
      if (
        prediction.destinationNaptanId ==
          trainPredictions[i].destinationNaptanId &&
        prediction.currentLocation == trainPredictions[i].currentLocation
      ) {
        return i;
      }
    } else if (
      //Matching on destinationId and vehicleId is enough to differentiate trains
      prediction.destinationNaptanId == trainPredictions[i].destinationNaptanId
    ) {
      return i;
    }
  }

  return null;
}

function filterForHammersmithTrains(trainPredictions, stationIdSet) {
  let hammersmithTrainPredictions = [];

  trainPredictions.forEach((train) => {
    let allHammersmith = true; //Variable only true if all stations for a vehicle prediction are on the hammersmith rail line
    train.stations.forEach((station) => {
      if (
        station.lineId != "hammersmith-city" ||
        !stationIdSet.has(station.naptanId)
      ) {
        allHammersmith = false;
      }
    });
    if (allHammersmith) {
      hammersmithTrainPredictions.push(train);
    }
  });

  return hammersmithTrainPredictions;
}

function createNewTrainPrediction(prediction) {
  let train = {
    vehicleId: prediction.vehicleId,
    destinationNaptanId: prediction.destinationNaptanId,
    currentLocation: prediction.currentLocation,
    direction: prediction.direction,
    stations: [],
  };
  train.stations.push(prediction);
  if (train.currentLocation == "At Platform") {
    train.currentLocation = atPlatformUpdateName(prediction);
  }
  return train;
}

function getUniqueTrains(vehicleIdPredictions) {
  let trainPredictions = [];
  vehicleIdPredictions.forEach((prediction) => {
    if (prediction.currentLocation == "At Platform") {
      let newCurrentLocation = atPlatformUpdateName(prediction);
      prediction.currentLocation = newCurrentLocation;
    }
    let trainIndex = checkTrainExists(trainPredictions, prediction); //Check if the train the prediction is respresenting is already stored in array trains
    if (trainIndex !== null) {
      trainPredictions[trainIndex].stations.push(prediction);
    } else {
      //Train is not in trains array, create new object for this train
      let train = createNewTrainPrediction(prediction);
      trainPredictions.push(train);
    }
  });

  return trainPredictions;
}

async function generateHammersmithTrainPredictions() {
  let vehicleIdSet = new Set();
  let stationIdSet = new Set(); //Hammersmith to barking station IDs in order
  let hammersmithStationPredictions = [];
  let trainPredictions = []; //Array of all unique trains from vehicleId predictions. VehicleId is not unique therefore have to do some guesswork
  let hammersmithTrainPredictions = []; //Trains only on the hammersmith railway

  stationIdSet = generateStationIdSet();

  hammersmithStationPredictions = await getHammersmithStationPredictions(
    stationIdSet
  ); //Arrival predictions for stations on the hammersmith railway

  hammersmithStationPredictions.forEach((station) => {
    vehicleIdSet.add(station.vehicleId);
  });

  //Some train predictions for stations on hammersmith railway are from other tube lines
  //Get the vehicleId predictions to figure out if the train comes from a different line and so can remove it
  //Only want to show trains on the actual hammersmith railway
  var vehicleIdPredictions = await getVehiclePredictions(vehicleIdSet);

  trainPredictions = getUniqueTrains(vehicleIdPredictions); //VehicleIds are't unique so same Ids on multiple lines. Populate array with unique trains.

  hammersmithTrainPredictions = filterForHammersmithTrains(
    trainPredictions,
    stationIdSet
  ); //trains array contains trains serving different lines. Filter for hammersmith only trains.

  hammersmithTrainPredictions.sort((a, b) => a.vehicleId - b.vehicleId);

  hammersmithTrainPredictions.forEach((train) => {
    train.stations.sort((a, b) => a.timeToStation - b.timeToStation);
  });

  return hammersmithTrainPredictions;
}

function createDiv() {
  let el = document.createElement("div");
  el.className = "marker";
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.backgroundSize = "100%";
  return el;
}

function calculateTrainRailway(train) {
  for (let j = 0; j < railwayData["features"].length; j++) {
    if (train.direction == "outbound") {
      if (
        train.nextStation.naptanId ==
        railwayData["features"][0].properties.previousStationId
      ) {
        return 0;
      }
      if (
        train.nextStation.naptanId ==
        railwayData["features"][j].properties.nextStationId
      ) {
        return j;
      }
    } else {
      if (
        train.nextStation.naptanId ==
        railwayData["features"][railwayData["features"].length - 1].properties
          .nextStationId
      ) {
        return railwayData["features"].length - 1;
      }
      if (
        train.nextStation.naptanId ==
        railwayData["features"][j].properties.previousStationId
      ) {
        return j;
      }
    }
  }
}

function findTimetableForNextStation(train) {
  if (train.direction == "outbound") {
    for (let i = 0; i < timetableData.outbound.length; i++) {
      if (timetableData.outbound[i].to == train.nextStation.naptanId) {
        return timetableData.outbound[i].timeToArrival * 60; //Timetable data is in minutes, return in seconds
      }
    }
  } else {
    //Direction is inbound
    for (let i = 0; i < timetableData.inbound.length; i++) {
      if (timetableData.inbound[i].to == train.nextStation.naptanId) {
        return timetableData.inbound[i].timeToArrival * 60; //Timetable data is in minutes, return in seconds
      }
    }
  }
}

function calculateTrainDistanceTravelled(train) {
  let milesPerSecond = train.railwayDistance / train.timetableToStation; //How many miles a second travels for a train in terms of timetable
  let secondsTravelled = train.timetableToStation - train.timeToStation;
  if (train.direction == "outbound") {
    return milesPerSecond * secondsTravelled;
  } else {
    return train.railwayDistance - milesPerSecond * secondsTravelled;
  }
}

function createNewTrain(el, trainPrediction) {
  let train = {
    currentRail: null,
    distanceTravelled: null,
    marker: new mapboxgl.Marker(el),
    moving: true,
    startOfLine: false,
    direction: trainPrediction.stations[0].direction,
    nextStation: trainPrediction.stations[0],
    stations: trainPrediction.stations,
    vehicleId: trainPrediction.vehicleId,
    destinationNaptanId: trainPrediction.destinationNaptanId,
    currentLocation: trainPrediction.currentLocation,
    timeToStation: trainPrediction.stations[0].timeToStation,
  };
  return train;
}

function calculateTrainRailwayDistance(train) {
  return turf.length(railwayData["features"][train.currentRail], {
    units: "miles",
  }); //Current railway distance between stations
}

function checkIfStartOfLine(train) {
  if (
    train.direction == "outbound" &&
    train.nextStation.naptanId == "940GZZLUHSC"
  ) {
    return true;
  } else if (
    train.direction == "inbound" &&
    train.nextStation.naptanId == "940GZZLUBKG"
  ) {
    return true;
  }
  return false;
}

function createTrainMarkers(hammersmithTrainPredictions) {
  for (let i = 0; i < hammersmithTrainPredictions.length; i++) {
    if (hammersmithTrainPredictions[i].direction == undefined) {
      continue;
    }
    const el = createDiv();
    let train = createNewTrain(el, hammersmithTrainPredictions[i]);
    train.currentRail = calculateTrainRailway(train);
    train["railwayDistance"] = calculateTrainRailwayDistance(train);
    if (checkIfStartOfLine(train)) {
      train.startOfLine = true;
      train.distanceTravelled =
        train.direction == "outbound" ? 0 : train.railwayDistance;
    } else {
      train["timetableToStation"] = findTimetableForNextStation(train);
      if (train.timeToStation > train.timetableToStation) {
        //Next station api data isn't the actual trains next station. Api data is missing / skipping the next station the train is actually going to.
        console.log("true");
        continue;
      }
      train.distanceTravelled = calculateTrainDistanceTravelled(train);
    }
    train.marker.setRotationAlignment("map");
    setInitialTrainLngLat(train);
    train.marker.addTo(map);
    trainMarkers.push(train);
  }
}

async function main() {
  railwayData = await getJsonData("/file/getHammersmithRailData");
  stationData = await getJsonData("/file/getHammersmithStationData");
  timetableData = await getJsonData("/file/getTimetable");

  let hammersmithTrainPredictions = await generateHammersmithTrainPredictions(); //Trains cuurently on the hammersmith railway

  console.log(hammersmithTrainPredictions);

  mapboxgl.accessToken =
    "pk.eyJ1IjoiYWdyYWlzIiwiYSI6ImNrdHVnOWU0azBoeGIycnF0dGE2dHp4dXYifQ.gIMMHinrqMqWUQSQCAP4bw";
  map = new mapboxgl.Map({
    container: "map", // container ID
    style: "mapbox://styles/mapbox/light-v10", // style URL
    center: [-0.09, 51.505], // starting position [lng, lat]
    zoom: 12, // starting zoom
    minZoom: 10,
  });

  createTrainMarkers(hammersmithTrainPredictions);
  console.log(trainMarkers);

  map.on("load", () => {
    map.addSource("Hammersmith & City Line Rail", {
      type: "geojson",
      data: railwayData,
    });

    map.addSource("Hammersmith & City Line Stations", {
      type: "geojson",
      data: stationData,
    });

    map.addLayer({
      id: "HammersmithRailway",
      type: "line",
      source: "Hammersmith & City Line Rail",
      paint: {
        "line-color": "#F3A9BB",
        "line-width": 3,
      },
    });

    map.addLayer({
      id: "HammersmithStations",
      type: "circle",
      source: "Hammersmith & City Line Stations",
      paint: {
        "circle-color": "#FFFFFF",
        "circle-stroke-color": "#232e21",
        "circle-radius": 7,
        "circle-stroke-width": 2,
      },
    });

    // Create a popup, but don't add it to the map yet.
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on("mouseenter", "HammersmithStations", (e) => {
      map.getCanvas().style.cursor = "pointer";

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

    map.on("mouseleave", "HammersmithStations", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    requestAnimationFrame(animateTrain);
  });
}

main();
