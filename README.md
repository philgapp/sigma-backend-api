# Sigma Option Tracker - Backend API

Sigma Option Tracker backend API. A full app meant to replace all the spreadsheets folks use to track options trades with better reporting, UI/UX, etc.

The app has two parts for now, a GraphQL NodeJS backend API and a React frontend.

This is the GraphQL API. It uses Express and Node and is configured to run on port 4000.

To run the API backend in development:

`npm run startdev`

To deploy the API with Docker:

`npm install`

`npm run build`

`docker-compose up --build` (using --build optionally to create a new image)

Notes:
1. In the Dockerfile make sure the ENV parameters are correct:
2. Mainly if running the API container and trying to connect to the unique MongoDB container, then one needs to use 'host.docker.internal' instead of 'localhost' for MONGO_URL.


Then access the server:

`http://localhost:4000/graphql`




Using Powershell, setup Docker MongoDB (for scratch config only):

`docker volume create --name=sigmadb`

`docker run --name sigmadb -v mongodata:/data/db -d -p 27017:27017 mongo`

To add authentication:

winpty docker exec -it sigmadb bash

mongo

use mydatabase

db.createUser({user:"app", pwd:"6%f)8iUfdERd883*", roles:[{role:"readWrite", db: "sigmadb"}]});

docker stop sigmadb

docker rm sigmadb

docker run --name sigmadb -v mongodata:/data/db -d -p 27017:27017 mongo --auth

Then can use auth to connect:

`mongodb://myuser:secret@localhost:27017/mydatabase`