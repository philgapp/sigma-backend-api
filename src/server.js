import express from 'express'
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);
import bodyParser from 'body-parser'
import cors from 'cors'

import {MongoClient, ObjectId} from 'mongodb'
import {prepare} from "./util"
const { graphqlHTTP } = require('express-graphql');
import {makeExecutableSchema} from 'graphql-tools'

// Next two imports required to create custom Date scalar type
import {GraphQLScalarType} from "graphql";
import { Kind } from 'graphql/language';

import { generateTestId, calculateRoi, calculateAroi } from './logic/calculations'
import { processGoogleToken } from './logic/googleAuth'

const bcrypt = require('bcrypt');

const MONGO_URL = 'mongodb://app:6%f)8iUfdERd883*@localhost:27017/sigmadb'
const STORE_SECRET = '925f4sfnj&fhsk2fGJNSMdk39f_9/fsdf'

// Password hash functions
// Hash a new password
async function hashIt(password){
    const salt = await bcrypt.genSalt(6);
    const hashed = await bcrypt.hash(password, salt);
    return hashed
}

// Compare input password with hashed password
async function compareIt(password, hashedPassword){
    const validPassword = await bcrypt.compare(password, hashedPassword);
    return validPassword
}
// hashIt(password);
// compareIt(password);

export const start = async () => {
    try {
        const db = await MongoClient.connect(encodeURI(MONGO_URL))

        const Users = db.collection('users')
        const Sessions = db.collection('sessions')
        const Options = db.collection('options')
        const UnderlyingTrades = db.collection('underlyingtrades')
        const UnderlyingHistories = db.collection('underlyinghistories')

        const app = express();

        app.use(bodyParser.json());

        // In case Node is running behind Nginx or similar proxy...
        app.set('trust proxy', 1)

        const corsOptions = {
            origin: "http://localhost:3000",
            credentials: true
        };
        app.use(cors(corsOptions))

        const store = new MongoDBStore({
            uri: encodeURI(MONGO_URL),
            collection: 'sessions'
        });

        // Catch errors
        store.on('error', function(error) {
            console.error(error);
        });

        app.use(session({
            secret: STORE_SECRET,
            name: "SOTASID_DEV",
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
                sameSite: false, // this may need to be false is you are accessing from another React app
                httpOnly: true, // this must be false if you want to access the cookie
                secure: false
            },
            store: store,
            // Boilerplate options, see:
            // * https://www.npmjs.com/package/express-session#resave
            // * https://www.npmjs.com/package/express-session#saveuninitialized
            resave: true,
            saveUninitialized: true,
            unset: 'destroy'
        }));

        /*
        const sessionMiddleware = (req, res, next) => {
            console.log('sessionMiddleware for dev: req.session:')
            console.log(req.session.id)
            //console.log(req.session.cookie)
            /*
            req.session.user = {
                username: 'testing',
                password: 'eels',
                authType: 'something'
            }
            //
            next();
        }
        app.use(sessionMiddleware);
        */


        const testUsers = [
            {_id:'temp1',firstName:'Phillip',lastName:'Gapp',email:'philgapp@gmail.com',authType:'LOCAL',password:'password'},
            {_id:'temp2',firstName:'Demo',lastName:'User',email:'demo@test.com',authType:'LOCAL',password:'password'}
        ]

        const typeDefs = [`
      type Query {
        getSession: String
        getSessionUser(session: String!): User
        login(input: LoginInput!): User
        destroySession(session: String!): String
        user(_id: ID): User
        users: [User]
        option(_id: String): Option
        getDashboardForUser(_id: ID): Dashboard
        getOptionsByUser(_id: ID): [Option]
        spread(_id: String): Spread
        spreads: [Spread]
        leg(_id: String): Leg
        legs: [Leg]
        underlyingTrade(_id: String): UnderlyingTrade
        underlyingTrades: [UnderlyingTrade]
        underlyingHistory(_id: String): UnderlyingHistory
        underlyingHistories: [UnderlyingHistory]
      }
      type User {
        _id: ID
        firstName: String
        lastName: String
        email: String
        authType: AuthType
        password: String
      }
      type Dashboard {
        user: User!
        balance: Float!
        aroi: Float!
        bookedIncome: Float!
        chart: Chart!
        options: OptionDashboard!
        underlying: UnderlyingDashboard!
      }
      type Chart {
        cash: Float!
        options: Float!
        underlying: Float!
      }
      type OptionDashboard {
        numberOpen: Int!
        potentialProfit: Float!
        nextExpiry: Date!
      }
      type UnderlyingDashboard {
        numberOpen: Int!
        symbols: [SymbolDashboard] 
      }
      type SymbolDashboard  {
        symbol: String!
        qty: Int!
        targetPrice: Float!
      }
      type Option {
        _id: ID!
        userId: ID!
        symbol: String!
        type: OptionType!
        spreads: [Spread]
        legs: [Leg]
      }
      type Spread {
        _id: ID
        legs: [Leg]
      }
      type Leg {
        _id: ID
        qty: Int
        isSpread: Boolean
        entryDate: Date
        expirationDate: Date
        exitDate: Date
        strike: Float
        entryCost: Float
        exitCost: Float
        underlyingEntryPrice: Float
        underlyingExitPrice: Float
        initialPremium: Float
        actualPremium: Float
        initialRoi: Float
        actualRoi: Float
        initialAroi: Float
        actualAroi: Float
        daysInTrade: Int
        capitalRequirement: Float
        totalPremium: Float
        missedPremium: Float
        result: String
        notes: String
        riskMitigation: String
      }
      input OptionInput {
        userId: ID!
        symbol: String!
        type: OptionType!
        spreads: [SpreadInput]
        legs: [LegInput]
      }
      input SpreadInput {
        legs: [LegInput]
      }
      input LegInput {
        qty: Int
        isSpread: Boolean
        entryDate: Date
        expirationDate: Date
        exitDate: Date
        strike: Float
        entryCost: Float
        exitCost: Float
        underlyingEntryPrice: Float
        underlyingExitPrice: Float
        initialPremium: Float
        actualPremium: Float
        result: String
        notes: String
        riskMitigation: String
      }
      type UnderlyingHistory {
        _id: ID
        symbol: String
        startDate: Date
        endDate: Date
        underlyingTrades: [UnderlyingTrade]!
      }
      type UnderlyingTrade {
        _id: ID
        type: UnderlyingTradeType
        date: String
        shares: String
        price: String
      }
      input LoginInput {
        username: String!
        password: String!
      }
      input GoogleAuth {
        token: String!
      }
      input UserInput {
        _id: ID
        firstName: String
        lastName: String
        email: String
        authType: AuthType
        password: String
      }
      type Mutation {
        upsertUser(input: UserInput!): User
        processGoogleAuth(input: GoogleAuth!): User 
        createOption(input: OptionInput): Option
        createUnderlyingTrade(underlingHistoryId: String) : UnderlyingTrade
        createUnderlyingHistory(ticker: String) : UnderlyingHistory
      }
      scalar Date
      enum AuthType {
        LOCAL
        GOOGLE
      }
      enum OptionType {
        P
        C
        BUPS
        BUCS
        BEPS
        BECS
      }
      enum DirectionType {
        BUY
        SELL
      }
      enum UnderlyingTradeType {
        BUY
        SELL
        ASSIGNED
        CALLED
        DIVIDEND
      }
      schema {
        query: Query
        mutation: Mutation
      }
    `];

        const resolvers = {
            Query: {
                getSession: async (root, args, ctx) => {
                    const sessionId = ctx.session.id ? ctx.session.id : null
                    //console.log('getSession Resolver: user:')
                    //console.log(ctx.session.user)
                    if(sessionId == null) {
                        return ""
                    } else {
                        return sessionId
                    }
                },
                getSessionUser: async (root, args, ctx) => {
                    const sessionId = args.session
                    const sessionUser = ctx.session.user || null
                    const dbSession = prepare(await Sessions.findOne({"_id": sessionId}))
                    let result
                    if (sessionUser == null) {
                        result = {
                            _id: null,
                            firstName: null,
                            lastName: null,
                            email: null,
                            authType: null
                        }
                    } else {
                        const dbUser = prepare(await Users.findOne({"email": dbSession.session.user.email}))
                        ctx.session.user._id = ObjectId(dbUser._id)
                        result = sessionUser
                    }
                    return result
                },
                login: async (root, args, ctx) => {
                    const dbUser = prepare(await Users.findOne({"email": args.input.username}))
                    if(dbUser) {
                        const hashedPassword = dbUser.password
                        const password = await compareIt(args.input.password, hashedPassword)
                        if (password) {
                            // Complete validation logic and return the user data
                            delete dbUser.password
                            const session = ctx.session
                            session.user = dbUser
                            return dbUser
                        } else {
                            // Errors for failed logins (user and API facing)
                            console.error("Invalid password for " + dbUser.email)
                        }
                    } else {
                        console.error("No matching user found for " + args.input.username)
                    }

                },
                destroySession: async (root, args, ctx) => {
                    /*
                    console.log("destroySession:")
                    console.log(args.session)
                    console.log(ctx.session.id)
                     */
                    let result
                    if(args.session == ctx.session.id) {
                        console.log("destroying session " + args.session)
                        ctx.session.destroy(error => {
                            //console.log(error)
                            if(error) {
                                result = "Error destroying session."
                            } else {
                                result = "Session destroyed."
                            }
                        })
                    } else {
                        result = "Cannot destroy session because session ID does not match."
                    }
                    return result
                },
                user: async (root, args) => {
                    const id = args._id
                    const res = testUsers.filter(function(user) {
                        return user._id === id
                    })
                    return res[0]
                },
                option: async (root, {_id}) => {
                    return prepare(await Options.findOne(ObjectId(_id)))
                },
                getDashboardForUser: async (root, args) => {
                    const userId = args._id
                    const dashboard = {}
                    const userObject = testUsers.filter(function(user) {
                        return user._id === userId
                    })
                    dashboard.user = userObject[0]
                    dashboard.balance = 55000
                    dashboard.aroi = 9.09
                    dashboard.bookedIncome = 5000
                    dashboard.chart = {
                        cash: 21000,
                        options: 30000,
                        underlying: 4000
                    }
                    dashboard.options = {
                        numberOpen: 8,
                        potentialProfit: 1500,
                        nextExpiry: 1621555200000
                    }
                    dashboard.underlying = {
                        numberOpen: 2,
                        symbols: [
                            {
                                symbol: 'TSLA',
                                qty: 200,
                                targetPrice: 500.5
                            },
                            {
                                symbol: 'AAPL',
                                qty: 100,
                                targetPrice: 130
                            }
                        ]
                    }
                    return dashboard
                },
                getOptionsByUser: async (root, args) => {
                    const userId = args._id
                    const res = (await Options.find({ userId: { $eq: userId } }).toArray()).map(prepare)
                    return res
                },
                spread: async (root, {_id}) => {
                    return prepare(await Spreads.findOne(ObjectId(_id)))
                },
            },
            Mutation: {
                upsertUser: async (root, args, ctx) => {
                    // hashIt(password);
                    // compareIt(password);
                    const userInput = {}
                    userInput.firstName = args.input.firstName
                    userInput.lastName = args.input.lastName
                    userInput.email = args.input.email
                    userInput.authType = args.input.authType
                    userInput.password = await hashIt(args.input.password);
                    try {
                        const query = {email: userInput.email}
                        const updateQuery = {$set: userInput}
                        const options = { upsert: true };
                        await Users.updateOne(query, updateQuery, options, function (error, result) {
                            if (error) {
                                console.error(error)
                                return error
                            } else {
                                let query
                                if(result.upsertedCount > 0) {
                                    // New user was INSERTED
                                    if(result.upsertedId._id) {
                                        // Query by newly inserted ID
                                        query = {_id: result.upsertedId._id}
                                    } else {
                                        console.error("Upserted a new user but no ID returned by Mongo.")
                                    }
                                } else {
                                    // Existing user was UPDATED
                                    // Query by email (possibly updated)
                                    query = {email: userInput.email}
                                }
                                // Query the new or updated user document to return
                                Users.findOne(query, {}, function(error,result) {
                                    if(error) {
                                        console.error(error)
                                        return error
                                    } else {
                                        delete result.password
                                        console.log(result)
                                        return result
                                    }
                                })
                            }
                        })
                    }
                    catch (e) {
                        console.error(e)
                        return e
                    }
                },
                processGoogleAuth: async (root, args, ctx) => {
                    const token = args.input.token
                    const session = ctx.session
                    const googleResult = await processGoogleToken(token)
                    const tempUserResult = {}
                    //tempUserResult._id = "BS_ID"
                    const nameArray = googleResult.name.split(' ')
                    tempUserResult.firstName = nameArray[0]
                    tempUserResult.lastName = nameArray[1]
                    tempUserResult.email = googleResult.email
                    tempUserResult.authType = "GOOGLE"
                    session.user = tempUserResult

                    //password: String

                    // TODO handle upsert into DB
                    try {
                        const query = {email: tempUserResult.email}
                        const updateQuery = {$set: tempUserResult}
                        const options = { upsert: true };
                        const res = await Users.updateOne(query, updateQuery, options)
                        //const cleanResult = prepare(res.ops[0])
                        console.log(res.upsertedId)
                        const upsertResult = {
                            _id:"FAKEID",
                            firstName:tempUserResult.firstName,
                            lastName:tempUserResult.lastName,
                            email:tempUserResult.email,
                            authType:tempUserResult.authType
                        }
                        return upsertResult
                    }
                    catch (e) {
                        console.error(e)
                        return e
                    }
                    //return tempUserResult
                },
                createOption: async (root, args) => {
                    const inputData = args.input
                    // TODO Validate current user....
                    // generate ObjectIds for Option, Spread(s) and Leg(s)
                    inputData._id = new ObjectId
                    inputData.spreads[0]._id = new ObjectId
                    const thisLeg = inputData.spreads[0].legs[0]
                    thisLeg._id = new ObjectId
                    // Set input object from input data and calculate ROI, AROI
                    const capitalRequirement = thisLeg.strike
                    const initialPremium = thisLeg.initialPremium
                    const initialRoi = calculateRoi({profit:initialPremium,capital:capitalRequirement})
                    const startDate = thisLeg.entryDate
                    const endDate = thisLeg.expirationDate
                    thisLeg.initialRoi = initialRoi
                    thisLeg.initialAroi = calculateAroi({startDate:startDate,endDate:endDate,roi:initialRoi})
                    thisLeg.capitalRequirement = capitalRequirement * 100
                    try {
                        const res = await Options.insertOne(inputData)
                        return prepare(res.ops[0])
                    }
                    catch (e) {
                        return e
                    }
                },
            },
            Date: new GraphQLScalarType({
                name: 'Date',
                description: 'Date custom scalar type',
                parseValue(value) {
                    return value; // value from the client
                },
                serialize(value) {
                    return value; // value sent to the client
                },
                parseLiteral(ast) {
                    if (ast.kind === Kind.INT) {
                        return parseInt(ast.value, 10); // ast value is always in string format
                    }
                    return null;
                },
            })
        }

        const schema = makeExecutableSchema({
            typeDefs,
            resolvers
        })

        const root = {
            sessionId: function (args, request) {
                return request.session.id;
            }
        }

        app.use('/graphql', graphqlHTTP({
            schema: schema,
            rootValue: root,
            graphiql: true,
        }));

        /*

        app.get('/', function(req, res) {
            res.send('Hello ' + JSON.stringify(req.session));
        });

         */

        app.listen(4000);
        console.log('Running GraphQL API at http://localhost:4000/graphql');

    } catch (e) {
        console.log(e)
    }
}