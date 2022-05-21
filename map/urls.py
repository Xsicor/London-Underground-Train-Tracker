from django.urls import path
from map import views

urlpatterns = [
    path("proofofconcept/basicmap", views.basicMap, name="basicmap"),
    path("proofofconcept/mapdrawn", views.mapDrawn, name="mapdrawn"),
    path("proofofconcept/animatedtrains", views.animatedTrains, name="animatedtrains"),
    path("finalmap", views.finalMap, name="finalMap"),
    path("testmap", views.testMap, name="testMap"),
    path("file/getHammersmithRailData", views.getHammersmithRailData, name="getHammersmithRailData"),
    path("file/getHammersmithStationData", views.getHammersmithStationData, name="getHammersmithStationData"),
    path("file/getRailData", views.getRailData, name="getRailData"),
    path("file/getStationData", views.getStationData, name="getStationData"),
    path("file/getTimetable", views.getTimetable, name="getTimetable")
]