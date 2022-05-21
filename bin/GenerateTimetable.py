import requests
import json
from requests.auth import HTTPBasicAuth
import time

#To understand how this script works the structure and format of the data returned the TFL API needs to be understood
#The documentation for the timetable endpoint can be found at:
#https://api-portal.tfl.gov.uk/api-details#api=Line&operation=Line_TimetableByPathFromStopPointIdPathId

class GenerateTimetable:
    def __init__(self):
        self.timetableJson = {
            'lines': []
        }
        with open('bin/routes.json') as file:
            self.routeData = json.load(file)

    def createLineData(self):
        self.lineDataArray = []
        for line in self.routeData['lines']:
            self.lineDataArray.append(LineData(line))

    def main(self):
        self.createLineData()
        for lineData in self.lineDataArray:
            self.createLineTimetable(lineData)
    
    def queryTimetable(self, lineId, stopPointId, disambiguation, direction):
        while True:
            auth = HTTPBasicAuth('apiKey', '89a6802a84af46beb60ef2ae0df8c71f')
            if disambiguation:
                query = requests.get(f'https://api.tfl.gov.uk/Line/{lineId}/Timetable/{stopPointId}?direction={direction}', auth=auth)
            else:
                query = requests.get(f'https://api.tfl.gov.uk/Line/{lineId}/Timetable/{stopPointId}', auth=auth)
            print('Querying: ', query.url)
            print('Returns status code: ', query.status_code)
            time.sleep(1) # Wait as to not spam and reach api limit
            if query.status_code == 200: # Timetable endpoint not consistent, sometimes returns error when it shouldn't
                break
        return query.json()        

    def checkDisambiguation(self, timetableData):
        if 'disambiguation' in timetableData:
            return True
        
        return False

    def findDirection(self, station, lineData):
        for route in lineData.routeData:
            if route['departureNaptanId'] == station:
                return route['direction']

    def createLineTimetable(self, lineData):
        for station in lineData.departureSet:
            timetableData = self.queryTimetable(lineData.name, station, False, None)
            if self.checkDisambiguation(timetableData): # Sometimes the api asks for a direction
                direction = self.findDirection(station, lineData)
                timetableData = self.queryTimetable(lineData.name, station, True, direction)

            routes = lineData.getRoutesForStation(station)
            for route in routes: # Loop through each route and match with timetable data
                breakOutFlag = False
                for timetableRoutes in timetableData['timetable']['routes']:
                    for stationIntervals in timetableRoutes['stationIntervals']: # StationIntervals holds the timetable data
                        if self.stationIntervalsMatchRoute(stationIntervals, route):
                            routeTimetable = self.createRouteTimetable(stationIntervals, route, timetableData['direction'], station)
                            lineData.timetable['data'].append(routeTimetable)
                            breakOutFlag = True
                            break
                    if breakOutFlag:
                        break
        
        self.timetableJson['lines'].append(lineData.timetable)
    
    def stationIntervalsMatchRoute(self, stationIntervals, route):
        if stationIntervals['intervals'][-1]['stopId'] != route['stations'][-1]:
            return False

        for index, interval in enumerate(stationIntervals['intervals']):
            if interval['stopId'] != route['stations'][index]:
                return False

        return True
    
    def createRouteTimetable(self, stationIntervals, route, direction, departureNaptanId):
        routeTimetable = {
            'departureNaptanId': departureNaptanId,
            'destinationNaptanId': route['stations'][-1],
            'via': route['via'],
            'direction': direction,
            'timetable': []
        }

        previousStationNaptanId = departureNaptanId
        previousTime = 0
        for interval in stationIntervals['intervals']:
            data = {
                'departureNaptanId': previousStationNaptanId,
                'destinationNaptanId': interval['stopId'],
                'timeToArrival': interval['timeToArrival'] - previousTime
            } # Desired format has time between stations, TFL API has accumulated time from the beginning, so minus previous time
            previousStationNaptanId = interval['stopId']
            previousTime = interval['timeToArrival']
            routeTimetable['timetable'].append(data)
        
        return routeTimetable
# Class holds route information used to match with timetable data
class LineData:
    def __init__(self, routeData):
        self.routeData = routeData['data']
        self.name = routeData['id']
        self.timetable = {'id': self.name,
        'data': []} 
        self.createDepartureSet() # ID of all stations that are at the beginning of a route

    def createDepartureSet(self):
        self.departureSet = set()
        for route in self.routeData:
            self.departureSet.add(route['departureNaptanId'])
    
    def getRoutesForStation(self, station): # Returns all the routes a given station serves
        routes = []
        for route in self.routeData:
            if route['departureNaptanId'] == station:
                route['stations'].pop(0)
                routes.append(route)

        return routes

generate = GenerateTimetable()
generate.main()

print('Finished generating timetable data')

with open('bin/timetable.json', 'w') as filehandle:
    json.dump(generate.timetableJson, filehandle)