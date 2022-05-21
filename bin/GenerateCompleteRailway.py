import json
import math
import os
# Given a line and an arbitrary point, find the closest point on that line to the arbitrary point
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

def distanceBetweenPoints(pointA, pointB):
    return math.hypot(pointB[0] - pointA[0], pointB[1] - pointA[1])
# Given the raw railway data and first station on the route coordinates, find the beginning coordinates of the railway data
def findBeginningOfRailway(firstStationCoordinates, rawCoordinateData):
    closestCoordinate = []
    closestDistance = math.inf

    for railway in rawCoordinateData['features']: # Find the coordinate closest to the beginning station
        distance = distanceBetweenPoints(firstStationCoordinates, railway['geometry']['coordinates'][0]) # Check first coordinate from list
        if distance < closestDistance:
            closestDistance = distance
            closestCoordinate = railway['geometry']['coordinates'][0]
        # Check last coordinate from list
        distance = distanceBetweenPoints(firstStationCoordinates, railway['geometry']['coordinates'][len(railway['geometry']['coordinates']) - 1])
        if distance < closestDistance:
            closestDistance = distance
            closestCoordinate = railway['geometry']['coordinates'][len(railway['geometry']['coordinates']) - 1]
        
    return closestCoordinate

def popRailwayFeature(coordinates, rawCoordinateData):
    railwayFeature = next((railway for railway in rawCoordinateData['features'] if coordinates in railway['geometry']['coordinates']), None)
    if railwayFeature == None:
        return False

    rawCoordinateData['features'].remove(railwayFeature)
    return railwayFeature
# Given the beginning coordinates of the railway data, order the coordinates to the end of the route
def orderRawCoordinateData(beginningCoordinates, rawCoordinateData):
    orderedRailwayCoordinates = [beginningCoordinates]

    while len(rawCoordinateData['features']) > 0:
        connectingCoordinates = orderedRailwayCoordinates[-1] # Each feature has repeating a repeating coordinate to link it with another feature
        railwayFeature = popRailwayFeature(connectingCoordinates, rawCoordinateData)
        if railwayFeature == False: #Remaining features are platform data which isn't needed
            break

        coordinates = railwayFeature['geometry']['coordinates']

        if coordinates.index(connectingCoordinates) != 0: # The connecting feature has the coordinates in wrong direction
            coordinates.reverse()
        
        coordinates.pop(0) #Remove connecting coordinate as it is a duplicate

        orderedRailwayCoordinates.extend(coordinates)
        
    return orderedRailwayCoordinates
# Given a station along a route and the railway data, find coordinates in that data closest to the station
def closestCoordToStation(stationCoordinates, orderedRailwayCoordinates):
    closestCoordinate = []
    closestDistance = math.inf

    for i in range(len(orderedRailwayCoordinates) - 1): # Go through each coordinate in the data 
        pointA = orderedRailwayCoordinates[i]
        pointB = orderedRailwayCoordinates[i+1]

        coordinate = findClosestPointOnLine(stationCoordinates, pointA, pointB)
        distance = distanceBetweenPoints(stationCoordinates, coordinate)

        if distance <= closestDistance:
            closestCoordinate = coordinate
            closestDistance = distance
            index = i + 1
    
    return closestCoordinate, index

def createRailwayData(stationCoordinatesDict, routeStationIds, orderedRailwayCoordinates, lineInfo, via):

    routeInfo = { # Information about the railway coordinates
        'direction': 'outbound',
        'departureNaptanId': routeStationIds[0],
        'destinationNaptanId': routeStationIds[-1],
        'via': via,
        'railways': []
    }

    for i in range(1, len(routeStationIds)):
        railwayInfo = {
            'departureNaptanId': routeStationIds[i-1],
            'destinationNaptanId': routeStationIds[i],
            'coordinates': []
        }
        closestCoordinate, index = closestCoordToStation(stationCoordinatesDict.get(routeStationIds[i]), orderedRailwayCoordinates)
        for j in range(index):
            railwayInfo['coordinates'].append(orderedRailwayCoordinates.pop(0))

        railwayInfo['coordinates'].append(closestCoordinate)

        if railwayInfo['coordinates'][-1] == railwayInfo['coordinates'][-2]:
            railwayInfo['coordinates'].pop() #The calculated closest coordinate is part of the raw data, remove duplicate coordinate
        
        routeInfo['railways'].append(railwayInfo)

        orderedRailwayCoordinates.insert(0, closestCoordinate) #Insert the last coordinate so that it connects the next railways

    lineInfo['data'].append(routeInfo)
    createReversedRailwayData(routeInfo, lineInfo)

def createReversedRailwayData(routeInfo, lineInfo):
    reversedRouteInfo = {
        'direction': 'inbound', #All raw railway data is outbound. Make inbound version. 
        'departureNaptanId': routeInfo['destinationNaptanId'],
        'destinationNaptanId': routeInfo['departureNaptanId'],
        'via': routeInfo['via'],
        'railways': []
    }

    for railway in reversed(routeInfo['railways']):
        railwayInfo = {
            'departureNaptanId': railway['destinationNaptanId'],
            'destinationNaptanId': railway['departureNaptanId'],
            'coordinates': railway['coordinates'][::-1]
        }
        reversedRouteInfo['railways'].append(railwayInfo)
    
    lineInfo['data'].append(reversedRouteInfo)

def mapStationsToCoordinates(route):
    stationsToCoordinates = {}
    for stationId in route:
        stationInfo = next((station for station in stationData['stations'] if station['naptanId'] == stationId), None)
        coordinates = [stationInfo['lon'], stationInfo['lat']]
        stationsToCoordinates.update({stationId: coordinates})

    return stationsToCoordinates

def getRouteFromFileName(fileName):
    if '#' in fileName:
        stationsVia = fileName.split('#') # The # character means the route uses a via
        via = stationsVia[1]
        stations = stationsVia[0].split('-')
    else:
        stations = fileName.split('-')
        via = 'null'
    
    return stations[0], stations[1], via
# Takes the directory where complete railway data is stored and loops through each folder of data creating railway data
def loopCompleteRawRailwayCoordinates(root, railwayJson):
    dirs = os.listdir(root)     
    for dir in dirs: # Loop through each folder, which represents a line
        files = os.listdir(f'{root}\{dir}')
        routes = next((line for line in routeData['lines'] if line['id'] == dir), None)['data'] # Get route data for line
        lineInfo = {
            'id': dir,
            'data': []
        }

        for file in files: # Each file represents railway data for a route
            filepath = os.path.join(f'{root}\{dir}', file)
            with open(filepath) as f:
                rawCoordinateData = json.load(f)

            fileName = os.path.splitext(file)[0] # The filename is the starting and ending station IDs
            departureStation, destinationStation, via = getRouteFromFileName(fileName)
            
            for route in routes: # Find the matching route data for the current file
                if route['departureNaptanId'] == departureStation and route['destinationNaptanId'] == destinationStation and route['via'] == via:
                    routeStationIds = route['stations']
                    stationCoordinatesDict = mapStationsToCoordinates(routeStationIds)
                    beginningCoordinates = findBeginningOfRailway(stationCoordinatesDict[routeStationIds[0]], rawCoordinateData)
                    orderedRailwayCoordinates = orderRawCoordinateData(beginningCoordinates, rawCoordinateData)
                    createRailwayData(stationCoordinatesDict, routeStationIds, orderedRailwayCoordinates, lineInfo, via)
        
        railwayJson['lines'].append(lineInfo)
                    
with open('bin/routes.json') as file:
    routeData = json.load(file)

with open('bin/stations.json') as file:
    stationData = json.load(file)

railwayJson = {
    'lines': [
    ]
}

loopCompleteRawRailwayCoordinates('bin/railwayCoordinates/CompletedRoutes', railwayJson)

with open('bin/railways.json', 'w') as filehandle:
    json.dump(railwayJson, filehandle)