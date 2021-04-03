import {MongoClient, ObjectId} from 'mongodb'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import {prepare} from "./util"
import {makeExecutableSchema} from 'graphql-tools'
// Next two imports required to create custom Date scalar type
import {GraphQLScalarType} from "graphql";
import { Kind } from 'graphql/language';
import { generateTestId, calculateRoi, calculateAroi } from './logic/calculations'

const { graphqlHTTP } = require('express-graphql');

const MONGO_URL = 'mongodb://app:6%f)8iUfdERd883*@localhost:27017/sigmadb'

export const start = async () => {
    try {
        const db = await MongoClient.connect(encodeURI(MONGO_URL))

        const Users = db.collection('users')
        const Options = db.collection('options')
        const UnderlyingTrades = db.collection('underlyingtrades')
        const UnderlyingHistories = db.collection('underlyinghistories')


        const testUsers = [
            {_id:'temp1',firstName:'Phillip',lastName:'Gapp',email:'philgapp@gmail.com',authType:'LOCAL',password:'password'},
            {_id:'temp2',firstName:'Demo',lastName:'User',email:'demo@test.com',authType:'LOCAL',password:'password'}
        ]

        const typeDefs = [`
      type Query {
        user(_id: ID): User
        users: [User]
        option(_id: String): Option
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
        _id: ID!
        firstName: String
        lastName: String
        email: String
        authType: AuthType
        password: String
      }
      type Option {
        _id: ID!
        user: User!
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
      type Mutation {
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
                getOptionsByUser: async (root, args) => {
                    const userId = args._id
                    const res = (await Options.find({ userId: { $eq: userId } }).toArray()).map(prepare)
                    return res
                },
                spread: async (root, {_id}) => {
                    return prepare(await Spreads.findOne(ObjectId(_id)))
                },
            },
            Option: {
              user: async (root) => {
                  const id = root.userId
                  const res = testUsers.filter(function(user) {
                      return user._id === id
                  })
                  return res[0]
              }
            },
            Mutation: {
                createOption: async (root, args) => {
                    const inputData = args.input
                    // TODO Validate current user....
                    // generate ObjectIds for Option, Spread(s) and Leg(s)
                    inputData._id = new ObjectId
                    inputData.spreads[0]._id = new ObjectId
                    const thisLeg = inputData.spreads[0].legs[0]
                    thisLeg._id = new ObjectId
                    // Set variables and calculate ROI and AROI
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
                    return new Date(value); // value from the client
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

        const app = express();

        app.use('/graphql', graphqlHTTP({
            schema: schema,
            //rootValue: root,
            graphiql: true,
        }));

        app.listen(4000);
        console.log('Running a GraphQL API server at http://localhost:4000/graphql');

    } catch (e) {
        console.log(e)
    }

}