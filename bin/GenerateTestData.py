import requests
import json
import time

def queryLineArrivals(line):
    query = requests.get(f'https://api.tfl.gov.uk/Line/{line}/Arrivals')
    jsonQuery = query.json()
    print(f'Querying {query.url}')
    return jsonQuery

def getVehicleIds(jsonData):
    vehicleIdSet = set()
    for prediction in jsonData:
        vehicleIdSet.add(prediction['vehicleId'])
    return list(vehicleIdSet)

def queryVechicleArrivals(vehicleIds):
    print(vehicleIds)
    if len(vehicleIds) > 64: # TFL API vehicle arrival endpoint has 64 limit on IDs that can be queried
        listToStr = ','.join([str(elem) for elem in vehicleIds[:65]])
        query = requests.get(f'https://api.tfl.gov.uk/Vehicle/{listToStr}/Arrivals')
        firstJsonQuery = query.json()

        listToStr = ','.join([str(elem) for elem in vehicleIds[65:]]) # Split up the array so it can be queried
        query = requests.get(f'https://api.tfl.gov.uk/Vehicle/{listToStr}/Arrivals')
        secondJsonQuery = query.json()
        return firstJsonQuery + secondJsonQuery
    else:
        listToStr = ','.join([str(elem) for elem in vehicleIds])
        query = requests.get(f'https://api.tfl.gov.uk/Vehicle/{listToStr}/Arrivals')
        jsonQuery = query.json()
        return jsonQuery

lines = ['bakerloo', 'central', 'circle', 'district', 'hammersmith-city', 'jubilee', 'metropolitan', 'northern', 'piccadilly', 'victoria', 'waterloo-city']

FirstTestData = {
    'lines': [

    ]
}
for line in lines:
    jsonData = queryLineArrivals(line)
    vehicleIds = getVehicleIds(jsonData)
    testData = queryVechicleArrivals(vehicleIds)
    testInfo = {
        'id': line,
        'data': testData
    }
    FirstTestData['lines'].append(testInfo)

with open('bin/TestData/FirstTestData.json', 'w') as file:
    json.dump(FirstTestData, file)

time.sleep(60) # Wait 1 minute for new data and repeat

SecondTestData = {
    'lines': [

    ]
}
for line in lines:
    jsonData = queryLineArrivals(line)
    vehicleIds = getVehicleIds(jsonData)
    testData = queryVechicleArrivals(vehicleIds)
    testInfo = {
        'id': line,
        'data': testData
    }
    SecondTestData['lines'].append(testInfo)

with open('bin/TestData/SecondTestData.json', 'w') as file:
    json.dump(SecondTestData, file)

time.sleep(60) #Wait 1 minute and repeat for the last time

ThirdTestData = {
    'lines': [

    ]
}
for line in lines:
    jsonData = queryLineArrivals(line)
    vehicleIds = getVehicleIds(jsonData)
    testData = queryVechicleArrivals(vehicleIds)
    testInfo = {
        'id': line,
        'data': testData
    }
    ThirdTestData['lines'].append(testInfo)

with open('bin/TestData/ThirdTestData.json', 'w') as file:
    json.dump(ThirdTestData, file)

