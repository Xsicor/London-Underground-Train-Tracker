import requests
import json

#To understand how this script works the structure and format of the data returned the TFL API needs to be understood
#The documentation for the station endpoint can be found at:
#https://api-portal.tfl.gov.uk/api-details#api=Line&operation=Line_StopPointsByPathIdQueryTflOperatedNationalRailStationsOnly

def getStationsForLine(lineId):
    query = requests.get(f'https://api.tfl.gov.uk/Line/{lineId}/StopPoints')
    return query.json()

query = requests.get('https://api.tfl.gov.uk/Line/Mode/tube')
data = query.json()

lineIds = []

for line in data:
    lineIds.append(line['id'])

stationIds = set()
stations = {'stations': []}

for line in lineIds:
    data = getStationsForLine(line)
    for station in data:
        if station['naptanId'] in stationIds:
            continue
        stationIds.add(station['naptanId'])
        stationInfo = {}
        stationInfo['naptanId'] = station['naptanId']
        stationInfo['name'] = station['commonName']
        stationInfo['lat'] = station['lat']
        stationInfo['lon'] = station['lon']
        stations['stations'].append(stationInfo)

with open('bin/stations.json', 'w') as filehandle:
    json.dump(stations, filehandle)

print('stations generated!')
