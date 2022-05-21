# OpenStreetMap doesn't have data for certain routes, however they can be made by combining other routes
# This script will go through a list of missing routes that can be created from the available coordinate data
# The file used will contain the missing routes, and the complete routes to combine and create the data from
# View the file MissingRailwayData.json in the RailwayCoordinates folder to understand how this code works
import json

def createMissingRailway(missingRailway, railwayData, lineName):
    routeInfo = {
        'direction': 'outbound',
        'departureNaptanId': missingRailway['missingRailway']['departureNaptanId'],
        'destinationNaptanId': missingRailway['missingRailway']['destinationNaptanId'],
        'via': missingRailway['missingRailway']['via'],
        'railways': []
    }

    for connectingRailway in missingRailway['combiningRailways']:
        railwayLineData = next((line for line in railwayData['lines'] if line['id'] == lineName), None)
        connectingRailwayData = next(( # Find the complete railway data used to combine with other data to create this missing data
            railway for railway in railwayLineData['data'] if railway['departureNaptanId'] == connectingRailway['departureNaptanId']
            and railway['destinationNaptanId'] == connectingRailway['destinationNaptanId']
            and railway['via'] == connectingRailway['via']), None)
        
        for i, railway in enumerate(connectingRailwayData['railways']): # Find the index's of the section of complete railway data used
            if railway['departureNaptanId'] == connectingRailway['connectingRailway']['departureNaptanId']:
                startIndex = i
            
            if railway['departureNaptanId'] == connectingRailway['connectingRailway']['destinationNaptanId']:
                endIndex = i
                
        if endIndex < startIndex:
            endIndex = len(connectingRailwayData['railways'])

        for railway in connectingRailwayData['railways'][startIndex:endIndex]:
            routeInfo['railways'].append(railway) # Add the connecting railway data to the array 
    
    railwayLineData['data'].append(routeInfo)

    reverseRailwayData(routeInfo, railwayLineData)

def reverseRailwayData(routeInfo, lineInfo):
    reversedRouteInfo = {
        'direction': 'inbound', #All railway data is outbound. Make inbound version. 
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

with open('bin/railways.json') as file:
    railwayData = json.load(file)

with open('bin/RailwayCoordinates/MissingRailwayData.json') as file:
    missingRailwayData = json.load(file)

with open('bin/routes.json') as file:
    routeData = json.load(file)

for line in missingRailwayData['lines']:
    for missingRailway in line['data']:
        createMissingRailway(missingRailway, railwayData, line['id'])

with open('bin/railways.json', 'w') as filehandle:
    json.dump(railwayData, filehandle)