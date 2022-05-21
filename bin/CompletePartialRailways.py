#OSM has coordinate data for parts of a route, but not the full route
#The partial route data can be combined with parts of full route data to fill out and complete the partial route
import json
from GenerateCompleteRailway import *
# Get the complete raw OSM railway coordinates that will be used to combine with the partial data
def createRawCoordsList(lineName, firstStation, lastStation, via):
    rawCoordsList = []
    if via == 'null':
        with open(f'bin/RailwayCoordinates/CompletedRoutes/{lineName}/{firstStation}-{lastStation}.geojson') as file:
            rawCoords = json.load(file)
    else:
        with open(f'bin/RailwayCoordinates/CompletedRoutes/{lineName}/{firstStation}-{lastStation}#{via}.geojson') as file:
            rawCoords = json.load(file)
    
    for feature in rawCoords['features']:
        rawCoordsList.extend(feature['geometry']['coordinates'])
    
    return rawCoordsList
# Given the partial railway data and lineName, find the coordinates that will be used to combine with the partial data to create complete data
def getConnectingRouteCoordinates(partialRailwayData, lineName):
    connectingRailwayCoords = []
    railwayLineInfo = next((line for line in railwayData['lines'] if line['id'] == lineName), None)
    combiningRouteData = next(( # The partial railway data has info about what route should be used to combine with to complete it, find this route
        route for route in railwayLineInfo['data'] if route['departureNaptanId'] == partialRailwayData['combineRoute']['departureNaptanId']
        and route['destinationNaptanId'] == partialRailwayData['combineRoute']['destinationNaptanId'] 
        and route['via'] == partialRailwayData['combineRoute']['via']), None)
    
    endIndex = len(combiningRouteData['railways'])
    for i, railway in enumerate(combiningRouteData['railways']): # Find the index's of the railway data that is used for combining
        if railway['departureNaptanId'] == partialRailwayData['combineRoute']['connectingRoute']['departureNaptanId']:
            startIndex = i
        
        if railway['departureNaptanId'] == partialRailwayData['combineRoute']['connectingRoute']['destinationNaptanId']:
            endIndex = i

    rawCoords = createRawCoordsList(lineName, partialRailwayData['combineRoute']['departureNaptanId'], partialRailwayData['combineRoute']['destinationNaptanId'], partialRailwayData['combineRoute']['via'])
    # Loop through the combining part of the complete route and append railway coordinates
    for i, railway in enumerate(combiningRouteData['railways'][startIndex:endIndex]): 
        if startIndex == 0 and i == 0: # If at the start of the railway data, the first coordinate will be orginally from the raw OSM data
            if railway['coordinates'][-1] in rawCoords: # Check the last railway coordinate is from OSM data or made from GenerateCompleteRailway
                connectingRailwayCoords.extend(railway['coordinates'][0:])
            else: # The last coordinate is self made GenerateCompleteRailway, don't include it
                connectingRailwayCoords.extend(railway['coordinates'][0:-1])
        else: # The first railway coordinate will be created from GenerateCompleteRailway as the connecting coordinate, only want raw data from OSM
            if railway['coordinates'][-1] in rawCoords: # Check the last railway coordinate is from OSM data or made from GenerateCompleteRailway
                connectingRailwayCoords.extend(railway['coordinates'][1:])
            else: # The last coordinate is self made GenerateCompleteRailway, don't include it
                connectingRailwayCoords.extend(railway['coordinates'][1:-1])

    return connectingRailwayCoords
# Takes the directory where partial railway data is stored and loops through each folder of data creating railway data
def loopRailwayRawData(root, railwayData):
    dirs = os.listdir(root)     
    for dir in dirs: # Loop through each folder, which represents a line
        files = os.listdir(f'{root}\{dir}')
        for file in files: # Each file represents railway data for a route
            filepath = os.path.join(f'{root}\{dir}', file)
            with open(filepath) as f:
                partialRailwayData = json.load(f)
            filename = os.path.splitext(file)[0] # The filename is the starting and ending station IDs
            stations = filename.split('-')
            partialFirstStation = stations[0]
            lineName = dir
            stationInfo = next((station for station in stationData['stations'] if station['naptanId'] == partialFirstStation), None)
            firstStationCoord = [stationInfo['lon'], stationInfo['lat']]
            beginningCoords = findBeginningOfRailway(firstStationCoord, partialRailwayData)
            orderedPartialRailwayCoords = orderRawCoordinateData(beginningCoords, partialRailwayData)
            connectingRailwayCoords = getConnectingRouteCoordinates(partialRailwayData, lineName)
            # Check if the first station from partial data is at the beginning of the complete route
            if partialFirstStation == partialRailwayData['completeRoute']['departureNaptanId']:
                if connectingRailwayCoords[-1] == orderedPartialRailwayCoords[0]: # Check for duplicate coordinates
                    completeRailwayCoords = orderedPartialRailwayCoords[0:-1] # Slice to remove duplicate coordinates
                    completeRailwayCoords.extend(connectingRailwayCoords)
                else:
                    completeRailwayCoords = orderedPartialRailwayCoords
                    completeRailwayCoords.extend(connectingRailwayCoords)
            else: # First station of partial data is somewhere in the middle of the complete route, start with the connecting railway coords
                if connectingRailwayCoords[-1] == orderedPartialRailwayCoords[0]: # Check for duplicate coordinates
                    completeRailwayCoords = connectingRailwayCoords[0:-1] # Slice to remove duplicate coordinates
                    completeRailwayCoords.extend(orderedPartialRailwayCoords)
                else:
                    completeRailwayCoords = connectingRailwayCoords
                    completeRailwayCoords.extend(orderedPartialRailwayCoords)
            line = next((line for line in routeData['lines'] if line['id'] == lineName), None)['data']
            route = next((
                    route for route in line if route['departureNaptanId'] == partialRailwayData['completeRoute']['departureNaptanId']
                    and route['destinationNaptanId'] == partialRailwayData['completeRoute']['destinationNaptanId'] 
                    and route['via'] == partialRailwayData['completeRoute']['via']), None)

            stationsToCoords = mapStationsToCoordinates(route['stations'])
            railwayDataLineInfo = next((line for line in railwayData['lines'] if line['id'] == lineName), None)
            # Use function from GenerateCompleteRailway to create the railway data in desired format
            createRailwayData(stationsToCoords, route['stations'], completeRailwayCoords, railwayDataLineInfo, route['via'])
        
with open('bin/stations.json') as file:
    stationData = json.load(file)

with open('bin/railways.json') as file:
    railwayData = json.load(file)

with open('bin/routes.json') as file:
    routeData = json.load(file)

loopRailwayRawData('bin/railwayCoordinates/PartialRoutes', railwayData)

with open('bin/railways.json', 'w') as filehandle:
    json.dump(railwayData, filehandle)