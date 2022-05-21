import json
import math

railwayData = None

#Takes 2 points that form a line and find the closest point on that line to the station coords
def findClosestPointOnLine(station, pointA, pointB): 
    aToStation = [station[0] - pointA[0], station[1] - pointA[1]]
    aToB = [pointB[0] - pointA[0], pointB[1] - pointA[1]]

    atb2 = aToB[0]**2 + aToB[1]**2
    aToStationDotAToB = aToStation[0] * aToB[0] + aToStation[1] * aToB[1]

    t = aToStationDotAToB / atb2

    if t > 1:
         t = 1

    if t < 0:
        t = 0

    closestPoint = [pointA[0] + aToB[0]*t, pointA[1] + aToB[1]*t]

    return closestPoint

def addStationFeatures(geoJsonStationData):
    for station in stationData:
        featureToAdd = {}
        featureToAdd['type'] = 'Feature'
        featureToAdd['properties'] = {}
        featureToAdd['properties']['name'] = station['name']
        featureToAdd['properties']['line'] = 'Hammersmith & City'
        featureToAdd['properties']['id'] = station['id']
        featureToAdd['geometry'] = {}
        featureToAdd['geometry']['type'] = 'Point'
        featureToAdd['geometry']['coordinates'] = [station['lon'], station['lat']]
        geoJsonStationData['features'].append(featureToAdd)
    
    return geoJsonStationData

def getClosestRailwayCoords(stationCoordinates):
    shortestDistance = math.inf
    shortestDistanceCoordinates = []

    for j in range(len(railwayData) - 1): #Loop through each section of railway line by line
        pointA = railwayData[j]
        pointB = railwayData[j+1]

        coordinates = findClosestPointOnLine(stationCoordinates, pointA, pointB)
        distance = math.hypot(coordinates[0] - stationCoordinates[0], coordinates[1] - stationCoordinates[1])
        if distance <= shortestDistance:
            shortestDistance = distance
            shortestDistanceCoordinates = coordinates
            dataIndex = j 
    
    return shortestDistanceCoordinates, dataIndex

def addRailwayFeature(geoJsonRailwayData, index, coordinatesToAdd):
    featureToAdd = {}
    featureToAdd['type'] = 'Feature'
    featureToAdd['properties'] = {}
    featureToAdd['properties']['name'] = stationData[index]['name'] + ' to ' + stationData[index+1]['name']
    featureToAdd['properties']['lineId'] = 'hammersmith-city'
    featureToAdd['properties']['direction'] = 'outbound'
    featureToAdd['properties']['previousStation'] = stationData[index]['name']
    featureToAdd['properties']['previousStationId'] = stationData[index]['id']
    featureToAdd['properties']['nextStation'] = stationData[index+1]['name']
    featureToAdd['properties']['nextStationId'] = stationData[index+1]['id']
    featureToAdd['geometry'] = {}
    featureToAdd['geometry']['type'] = 'LineString'
    featureToAdd['geometry']['coordinates'] = coordinatesToAdd
    geoJsonRailwayData['features'].append(featureToAdd)

    return geoJsonRailwayData
    
def generateRailwayFeatures(geoJsonRailwayData):
    stationIndex = 0
    for station in stationData:
        #Reached final station, end of railway data, don't need to calculate closest point
        # if station['id'] == stationData[len(stationData) - 1]['id']:
        #     break

        if station['id'] == stationData[0]['id']:
            continue

        shortestDistanceCoordinates, dataIndex = getClosestRailwayCoords([station['lon'], station['lat']])
        coordinatesToAdd = []

        for x in range(dataIndex + 1):
            coordinatesToAdd.append(railwayData.pop(0))
        
        coordinatesToAdd.append(shortestDistanceCoordinates)

        if coordinatesToAdd[-1] == coordinatesToAdd[-2]:
            coordinatesToAdd.pop()

        railwayData.insert(0, shortestDistanceCoordinates)

        geoJsonRailwayData = addRailwayFeature(geoJsonRailwayData, stationIndex, coordinatesToAdd)

        stationIndex += 1

    return geoJsonRailwayData

#GET STATION DATA AND CONVERT TO GEOJSON FORMAT

f = open('bin/ProofOfConcepts/HammersmithTFLOrdered.json')
stationData = json.load(f)
f.close

geoJsonStationData = {"type": "FeatureCollection",
    "features": []}

geoJsonStationData = addStationFeatures(geoJsonStationData)

with open('bin/ProofOfConcepts/HammersmithStations.geojson', 'w') as filehandle:
    json.dump(geoJsonStationData, filehandle)

#SEPARATE RAILWAY DATA

f = open('bin/ProofOfConcepts/output.json')
railwayData = json.load(f)
f.close()

geoJsonRailwayData = {"type": "FeatureCollection",
    "features": []}

geoJsonRailwayData = generateRailwayFeatures(geoJsonRailwayData)

with open('bin/ProofOfConcepts/HammersmithRail.geojson', 'w') as filehandle:
    json.dump(geoJsonRailwayData, filehandle)
    
print('done!')

