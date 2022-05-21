import json

orderedCoordinates = []  # Ordered list of coordinates from hammersmith to barking
lastCoordinate = []  # The last coordinate of a feature, there will be another exact coordinate in another feature that links them together

railFile = open("bin/ProofOfConcepts/RawHammersmithCoordinates.geojson")
data = json.load(railFile)

# First feature in this dataset begins at hammersmith, which is the beginning
for coordinate in data['features'][0]['geometry']['coordinates']:
    orderedCoordinates.append(coordinate)

del data['features'][0]
lastCoordinate = orderedCoordinates[len(orderedCoordinates) - 1]
featureIndex = 0  # Used to delete the feature from data dictionary after copying coordinates

for i in range(len(data['features'])):
    for feature in data['features']:
        if feature['geometry']['coordinates'][0] == lastCoordinate:
            for coordinate in feature['geometry']['coordinates']:
                if coordinate == lastCoordinate:  # This coordinate is already in the orderedCoordinates list, don't want duplicates
                    continue
                orderedCoordinates.append(coordinate)

            del data['features'][featureIndex]
            lastCoordinate = orderedCoordinates[len(orderedCoordinates) - 1]
            featureIndex = 0
            break

        featureIndex += 1

x = len(data['features'][0]['geometry']['coordinates'])
for i in range(x - 1):
    orderedCoordinates.append(
        data['features'][0]['geometry']['coordinates'][x - 1])
    x -= 1

railFile.close()

with open('bin/ProofOfConcepts/output.json', 'w') as filehandle:
    json.dump(orderedCoordinates, filehandle)
