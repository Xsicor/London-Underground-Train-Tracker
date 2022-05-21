import requests
import json

#To understand how this script works, the TFL API route endpoint return data structure and format must be understood
#The documentation for the TFL API route endpoint can be found at:
#https://api-portal.tfl.gov.uk/api-details#api=Line&operation=Line_RouteSequenceByPathIdPathDirectionQueryServiceTypesQueryExcludeCrowding

def queryForRoute(lineId, direction):
    query = requests.get(f'https://api.tfl.gov.uk/Line/{lineId}/Route/Sequence/{direction}')
    print('Querying: ', query.url)
    print('Returns status code: ', query.status_code)
    return query.json()

def createRouteInfo(data):
    allRouteInfo = [] # Holds all route information for a specific direction
    for route in data['orderedLineRoutes']:
        routeInfo = {}
        routeInfo['direction'] = data['direction']
        routeInfo['stations'] = route['naptanIds']
        routeInfo['departureNaptanId'] = routeInfo['stations'][0]
        routeInfo['destinationNaptanId'] = routeInfo['stations'][len(routeInfo['stations']) - 1]
        if ' via ' in route['name']:
            start = route['name'].find('via ') + 4
            end = len(route['name'])
            stationName = route['name'][start:end]
            print(stationName)
            viaStation = next((station for station in stationData['stations'] if station['name'] == f'{stationName} Underground Station'), None)['naptanId']
            routeInfo['via'] = viaStation
        else:
            routeInfo['via'] = 'null'

        allRouteInfo.append(routeInfo)

    return allRouteInfo

def addRouteInfoToLineInfo(routeInfoList, lineInfo):
    for routeInfo in routeInfoList:
        lineInfo['data'].append(routeInfo)

def generateRoutesForLine(lineId, routes):
    lineInfo = {
        'id': lineId,
        'data': []}

    data = queryForRoute(lineId, 'outbound')
    routeInfoList = createRouteInfo(data)
    addRouteInfoToLineInfo(routeInfoList, lineInfo)

    data = queryForRoute(lineId, 'inbound')
    routeInfoList = createRouteInfo(data)
    addRouteInfoToLineInfo(routeInfoList, lineInfo)

    routes['lines'].append(lineInfo)

def getAllLineIds():
    query = requests.get('https://api.tfl.gov.uk/Line/Mode/tube')
    data = query.json()

    lineIds = []

    for line in data:
        lineIds.append(line['id'])
    
    return lineIds

routes = {
    'lines': [
    ]
}

with open('bin\stations.json') as file:
    stationData = json.load(file)

lineIds = getAllLineIds()
for line in lineIds:
    generateRoutesForLine(line, routes)

with open('bin/routes.json', 'w') as filehandle:
    json.dump(routes, filehandle)

print('routes generated!')