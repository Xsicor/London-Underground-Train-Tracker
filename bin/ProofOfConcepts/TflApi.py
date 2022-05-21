import requests
import json

x = requests.get('https://api.tfl.gov.uk/Line/hammersmith-city/Route/Sequence/outbound')

data = x.json()
HammersmithStations = []
stationInfo = {}

index = 0
for station in data['stopPointSequences'][0]['stopPoint']:
    stationInfo['name'] = station['name']
    stationInfo['lon'] = station['lon']
    stationInfo['lat'] = station['lat']
    stationInfo['id'] = station['id']
    if index == 0:
        stationInfo['previousStation'] = 'null'
    else:
        stationInfo['previousStation'] = HammersmithStations[index-1]['name']

    if index == len(data['stopPointSequences'][0]['stopPoint']) - 1:
        stationInfo['nextStation'] = 'null'
    else:
        stationInfo['nextStation'] = data['stopPointSequences'][0]['stopPoint'][index+1]['name']
    
    HammersmithStations.append(stationInfo)
    stationInfo = {}
    index += 1

with open('HammersmithTFLOrdered.json', 'w') as filehandle:
    json.dump(HammersmithStations, filehandle)

print('done!')
