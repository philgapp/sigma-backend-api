FROM node:latest
ENV PORT 4000
ENV MONGO_URL mongodb://cloudDev:zuwtdpeo0jexQufL@sigma-db-test-cluster-shard-00-00.fk2es.mongodb.net:27017,sigma-db-test-cluster-shard-00-01.fk2es.mongodb.net:27017,sigma-db-test-cluster-shard-00-02.fk2es.mongodb.net:27017/sigmadb?replicaSet=atlas-bvm5x8-shard-0&ssl=true&authSource=admin
ENV STORE_SECRET 925f4sfnj&fhsk2fGJNSMdk39f_9/fsdf
ENV COOKIE_NAME SOTASID_DEV
ENV FRONTEND_URL http://localhost:3000
COPY . .
RUN npm install
EXPOSE $PORT
ENTRYPOINT ["npm", "start"]