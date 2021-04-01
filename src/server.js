import {MongoClient, ObjectId} from 'mongodb'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import {prepare} from "./util"
import {makeExecutableSchema} from 'graphql-tools'
// Next two imports required to create custom Date scalar type
import {GraphQLScalarType} from "graphql";
import { Kind } from 'graphql/language';

const { graphqlHTTP } = require('express-graphql');

const MONGO_URL = 'mongodb://app:6%f)8iUfdERd883*@localhost:27017/sigmadb'

export const start = async () => {
    try {
        const db = await MongoClient.connect(encodeURI(MONGO_URL))

        const Users = db.collection('users')
        const Options = db.collection('options')
        const Spreads = db.collection('spreads')
        const Legs = db.collection('legs')
        const UnderlyingTrades = db.collection('underlyingtrades')
        const UnderlyingHistories = db.collection('underlyinghistories')

        const tests = [
            {_id:'dsdfser',title:'Test 1',content:'Test 1 content'},
            {_id:'dsdfser2',title:'Test 2',content:'Test 2 content'},
            {_id:'dsdfser3',title:'Test 3',content:'Test 3 content'},
            {_id:'dsdfser4',title:'Test 4',content:'Test 4 content'}
        ]

        const typeDefs = [`
      type Query {
        viewTest(_id: ID!): Test
        viewTests: [Test]
        user(_id: String): User
        users: [User]
        option(_id: String): Option
        getOptionsByUser(_id: String): [Option]
        spread(_id: String): Spread
        spreads: [Spread]
        leg(_id: String): Leg
        legs: [Leg]
        underlyingTrade(_id: String): UnderlyingTrade
        underlyingTrades: [UnderlyingTrade]
        underlyingHistory(_id: String): UnderlyingHistory
        underlyingHistories: [UnderlyingHistory]
      }
      type Test {
        _id: String
        title: String
        content: String
      }
      type User {
        _id: String
        firstName: String
        lastName: String
        email: String
        authType: String
        password: String
      }
      type Option {
        _id: String
        symbol: String!
        type: OptionType!
        spreads: [Spread]
        legs: [Leg]
      }
      type Spread {
        _id: String
        optionId: String
        legs: [Leg]
      }
      type Leg {
        _id: String
        optionId: String
        spreadId: String
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
      type UnderlyingTrade {
        _id: String
        underlyingHistoryId: String
        type: String
        date: String
        shares: String
        price: String
      }
      type UnderlyingHistory {
        _id: String
        ticker: String
      }
      input OptionInput {
        ticker: String
        type: String
      }
      type Mutation {
        createOption(input: OptionInput): Option
        createSpread(optionId: String, content: String): Spread
        createSpreadLeg(spreadId: String, content: String): Leg
        createOptionLeg(optionId: String, content: String): Leg
        createUnderlyingTrade(underlingHistoryId: String) : UnderlyingTrade
        createUnderlyingHistory(ticker: String) : UnderlyingHistory
      }
      scalar Date
      enum OptionType {
        P
        C
        BUPS
        BUCS
        BEPS
        BECS
      }
      schema {
        query: Query
        mutation: Mutation
      }
    `];

        const resolvers = {
            Query: {
                viewTest: async (root, args) => {
                    const id = args._id
                    const res = tests.filter(function(test) {
                        return test._id === id
                    })
                    return res[0]
                },
                viewTests: () => {
                    return tests
                },
                option: async (root, {_id}) => {
                    return prepare(await Options.findOne(ObjectId(_id)))
                },
                getOptionsByUser: async () => {
                    return (await Options.find({}).toArray()).map(prepare)
                },
                spread: async (root, {_id}) => {
                    return prepare(await Spreads.findOne(ObjectId(_id)))
                },
            },
            /*Post: {
                comments: async ({_id}) => {
                    return (await Comments.find({postId: _id}).toArray()).map(prepare)
                }
            },
            Comment: {
                post: async ({postId}) => {
                    return prepare(await Posts.findOne(ObjectId(postId)))
                }
            },*/
            Mutation: {
                createOption: async (root, args, context, info) => {
                    const res = await Options.insertOne(args)
                    return prepare(res.ops[0])  // https://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~insertOneWriteOpResult
                },
                /*createComment: async (root, args) => {
                    const res = await Comments.insert(args)
                    return prepare(await Comments.findOne({_id: res.insertedIds[1]}))
                },*/
            },
            Date: new GraphQLScalarType({
                name: 'Date',
                description: 'Date custom scalar type',
                parseValue(value) {
                    return new Date(value); // value from the client
                },
                serialize(value) {
                    return value.getTime(); // value sent to the client
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