require('dotenv').config()
import express from 'express'
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);
import bodyParser from 'body-parser'
import cors from 'cors'

import { MongoClient } from 'mongodb'

const { graphqlHTTP } = require('express-graphql');
import { makeExecutableSchema } from 'graphql-tools'
const { mergeResolvers } = require('@graphql-tools/merge');

const optionGQL = require('./types/options');
const testGQL = require('./types/test');
const typeDefs = [
    optionGQL,
    testGQL,
];

const allQueries = require('./queries/allQueries');
const oldResolvers = require('./mutations/allMutations')
const resolversToMerge = [
    oldResolvers,
    allQueries
];
const resolvers = mergeResolvers(resolversToMerge);

export const start = async () => {
    try {
        const db = await MongoClient.connect(encodeURI(process.env.MONGO_URL))

        const app = express();

        app.use(bodyParser.json());

        // In case Node is running behind Nginx or similar proxy...
        app.set('trust proxy', 1)

        const corsOptions = {
            credentials: true,
            origin: process.env.FRONTEND_URL,
        };
        app.use(cors(corsOptions))

        const store = new MongoDBStore({
            uri: encodeURI(process.env.MONGO_URL),
            collection: 'sessions'
        });

        // Catch errors
        store.on('error', function(error) {
            console.error(error);
        });

        app.use(session({
            secret: process.env.STORE_SECRET,
            name: process.env.COOKIE_NAME,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
                sameSite: false, // this may need to be false if you are accessing from another app
                httpOnly: true, // this must be false if you want to access the cookie
                secure: false //TODO true for HTTPS later...
            },
            store: store,
            // Boilerplate options, see:
            // * https://www.npmjs.com/package/express-session#resave
            // * https://www.npmjs.com/package/express-session#saveuninitialized
            resave: false,
            saveUninitialized: false,
            unset: 'destroy'
        }));

        const schema = makeExecutableSchema({
            typeDefs,
            resolvers
        });

        const root = {}

        app.use('/graphql',
            bodyParser.json(),
            graphqlHTTP( async (req) => ({
                schema: schema,
                rootValue: root,
                context: {
                    req: req,
                    session: req.session,
                    Users: db.collection('users'),
                    Sessions: db.collection('sessions'),
                    Dashboards: db.collection('dashboards'),
                    Options: db.collection('options'),
                    Underlying: db.collection('underlying'),
                    Banking: db.collection('banking'),
                },
                graphiql: true,
            })));

        // TODO env configs!!! Deployment-worthy...
        app.listen(4000);
        console.log('Sigma GraphQL Backend API Started at http://localhost:4000/graphql');

    } catch (e) {
        // TODO better error handling!
        console.log(e)
    }
}