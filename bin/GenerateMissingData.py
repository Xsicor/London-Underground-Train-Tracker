#This file is used as a temporary script to generate missing data that needed be done manually
#DO NOT RUN AGAIN as it will duplicate data
import json

with open('bin/timetable.json') as file:
    timetableData = json.load(file)

centralData = timetableData['lines'][1]['data']
tempNewData = []
for routeInfo in centralData:
    reversedRouteInfo = {
        'direction': 'outbound',
        'departureNaptanId': routeInfo['destinationNaptanId'],
        'destinationNaptanId': routeInfo['departureNaptanId'],
        'via': routeInfo['via'],
        'timetable': []
    }
    for timetable in reversed(routeInfo['timetable']):
        timetableInfo = {
            'departureNaptanId': timetable['destinationNaptanId'],
            'destinationNaptanId': timetable['departureNaptanId'],
            'timeToArrival': timetable['timeToArrival']
        }
        reversedRouteInfo['timetable'].append(timetableInfo)

    tempNewData.append(reversedRouteInfo)

centralData.extend(tempNewData)

tempNewData = []
metropolitanData = timetableData['lines'][6]['data']
for routeInfo in metropolitanData:
    if routeInfo['departureNaptanId'] == '940GZZLUALD' and routeInfo['destinationNaptanId'] == '940GZZLUAMS':
        reversedRouteInfo = {
        'direction': 'outbound',
        'departureNaptanId': routeInfo['destinationNaptanId'],
        'destinationNaptanId': routeInfo['departureNaptanId'],
        'via': routeInfo['via'],
        'timetable': []
        }
        for timetable in reversed(routeInfo['timetable']):
            timetableInfo = {
                'departureNaptanId': timetable['destinationNaptanId'],
                'destinationNaptanId': timetable['departureNaptanId'],
                'timeToArrival': timetable['timeToArrival']
            }
            reversedRouteInfo['timetable'].append(timetableInfo)
        
        tempNewData.append(reversedRouteInfo)

metropolitanData.extend(tempNewData)
with open('bin/timetable.json', 'w') as file:
    json.dump(timetableData, file)