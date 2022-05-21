from django.http import HttpResponse
from django.shortcuts import render
from django.http import JsonResponse
import json

def testMap(request):
    context = {}
    with open('bin/stations.json') as file:
        data = json.load(file)
        context.update({'stationData': data})
    
    with open('bin/railways.json') as file:
        data = json.load(file)
        context.update({'railwayData': data})

    with open('bin/timetable.json') as file:
        data = json.load(file)
        context.update({'timetableData': data})

    with open('bin/routes.json') as file:
        data = json.load(file)
        context.update({'routeData': data})

    with open('bin/TestData/FirstTestData.json') as file:
        data = json.load(file)
        context.update({'firstTestData': data})
    
    with open('bin/TestData/SecondTestData.json') as file:
        data = json.load(file)
        context.update({'secondTestData': data})
    
    with open('bin/TestData/ThirdTestData.json') as file:
        data = json.load(file)
        context.update({'thirdTestData': data})

    return render(
        request,
        'map/finalMap.html',
        context
    )

def finalMap(request):
    context = {}
    with open('bin/stations.json') as file:
        data = json.load(file)
        context.update({'stationData': data})
    
    with open('bin/railways.json') as file:
        data = json.load(file)
        context.update({'railwayData': data})

    with open('bin/timetable.json') as file:
        data = json.load(file)
        context.update({'timetableData': data})

    with open('bin/routes.json') as file:
        data = json.load(file)
        context.update({'routeData': data})

    return render(
        request,
        'map/finalMap.html',
        context
    )

def basicMap(request):
    return render(
        request,
        'map/ProofOfConcepts/basicMap.html'
    )

def mapDrawn(request):
    return render(
        request,
        'map/ProofOfConcepts/mapDrawn.html'
    )

def animatedTrains(request):
    return render(
        request,
        'map/ProofOfConcepts/animatedTrains.html'
    )

def getHammersmithRailData(request):
    jsonData = open('bin/ProofOfConcepts/hammersmithRail.geojson')
    data = json.load(jsonData)
    jsonData.close()
    return JsonResponse(data)

def getHammersmithStationData(request):
    jsonData = open('bin/ProofOfConcepts/HammersmithStations.geojson')
    data = json.load(jsonData)
    jsonData.close()
    return JsonResponse(data)

def getRailData(request):
    jsonData = open('bin/railways.json')
    data = json.load(jsonData)
    jsonData.close()
    return JsonResponse(data)

def getStationData(request):
    jsonData = open('bin/stations.json')
    data = json.load(jsonData)
    jsonData.close()
    return JsonResponse(data)

def getTimetable(request):
    jsonData = open('bin/ProofOfConcepts/HammersmithTimetable.json')
    data = json.load(jsonData)
    jsonData.close()
    return JsonResponse(data)