async function Main() {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYWdyYWlzIiwiYSI6ImNrdHVnOWU0azBoeGIycnF0dGE2dHp4dXYifQ.gIMMHinrqMqWUQSQCAP4bw";
    const map = new mapboxgl.Map({
      container: "map", // container ID
      style: "mapbox://styles/mapbox/light-v10", // style URL
      center: [-0.09, 51.505], // starting position [lng, lat]
      zoom: 12, // starting zoom
      minZoom: 10,
    });
  
    railwayData = await getJsonData("/file/getHammersmithRailData");
    stationData = await getJsonData("/file/getHammersmithStationData");
  
    map.on("load", () => {
      map.addSource("Railways", {
        type: "geojson",
        data: railwayData,
      });
  
      map.addSource("Stations", {
        type: "geojson",
        data: stationData,
      });
  
      map.addLayer({
        id: "Railway Style",
        type: "line",
        source: "Railways",
        paint: {
          "line-color": "#F3A9BB",
          "line-width": 3,
        },
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
      
      // Create a popup, but don't add it to the map yet.
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });
  
      map.on("mouseenter", "Station Style", (e) => {
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
  
      map.on("mouseleave", "Station Style", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    });
  }
  
  Main();
  