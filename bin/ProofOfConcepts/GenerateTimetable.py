import requests
import json

timetableData = {
    'outbound': [],
    'inbound': []
}

x = requests.get('https://api.tfl.gov.uk/Line/hammersmith-city/Timetable/940GZZLUHSC/to/940GZZLUBKG')

data = x.json()
previousTime = 0
previousStopId = '940GZZLUHSC'

for station in data['timetable']['routes'][0]['stationIntervals'][0]['intervals']:
    data = {
        'to': station['stopId'],
        'from': previousStopId,
        'timeToArrival': station['timeToArrival'] - previousTime
    }
    previousStopId = station['stopId']
    previousTime = station['timeToArrival']
    timetableData['outbound'].append(data)

x = requests.get('https://api.tfl.gov.uk/Line/hammersmith-city/Timetable/940GZZLUBKG/to/940GZZLUHSC')

data = x.json()
previousTime = 0
previousStopId = '940GZZLUBKG'

for station in data['timetable']['routes'][0]['stationIntervals'][0]['intervals']:
    data = {
        'to': station['stopId'],
        'from': previousStopId,
        'timeToArrival': station['timeToArrival'] - previousTime
    }
    previousStopId = station['stopId']
    previousTime = station['timeToArrival']
    timetableData['inbound'].append(data)

with open('bin/ProofOfConcepts/HammersmithTimetable.json', 'w') as filehandle:
    json.dump(timetableData, filehandle)