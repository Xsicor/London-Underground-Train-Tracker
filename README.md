# Live TFL Underground train tracker
## Setting up the project
In the root directory of this project, setup a virtual environment. <br>
For linux run the following commands:
> sudo apt-get install python3-venv    # If needed <br>
> python3 -m venv .venv <br>
> source .venv/bin/activate <br>

For windows run the following commands:
> py -3 -m venv .venv <br>
> .venv\scripts\activate <br>

Install required third party modules via npm:
> npm install

Install Django in the virtual environment by running the following command: 
> $ pip install django  

Django has been successfully installed. The development server can be run and the websites can be viewed.
## Starting the development server
In the root directory run the following command:
> $ python manage.py runserver <br>

This will start the development server at http://127.0.0.1:8000/

## Proof of concept programs
The proof of concept programs are part of the project. They are mapped to the following URLS.
1. Basic Map - http://127.0.0.1:8000/proofofconcept/basicmap
2. Map with tube lines and stations - http://127.0.0.1:8000/proofofconcept/mapdrawn
3. Map with animated trains - http://127.0.0.1:8000/proofofconcept/animatedtrains

## Test Build
The final build with test data instead of live can be viewed at the following URL.
http://127.0.0.1:8000/testmap

## Final Build
The final build running with live data can be viewed at the following URL.
http://127.0.0.1:8000/finalmap
