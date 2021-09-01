FROM node:latest
ENV PORT 443
ENV MONGO_URL mongodb://cloudDev:zuwtdpeo0jexQufL@sigma-db-test-cluster-shard-00-00.fk2es.mongodb.net:27017,sigma-db-test-cluster-shard-00-01.fk2es.mongodb.net:27017,sigma-db-test-cluster-shard-00-02.fk2es.mongodb.net:27017/sigmadb?replicaSet=atlas-bvm5x8-shard-0&ssl=true&authSource=admin
ENV STORE_SECRET z248&f5f4snj&fhk2fGJNMd39f9fsd!f3?
ENV COOKIE_NAME SOTASID
ENV FRONTEND_URL https://app.sigmaoptionfund.com
ENV SECURE_SESSION true
COPY . .
RUN npm install
RUN npm run build
EXPOSE $PORT
ENTRYPOINT ["npm", "start"]