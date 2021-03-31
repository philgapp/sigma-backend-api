import {MongoClient, ObjectId} from 'mongodb'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import {prepare} from "./util"
import {makeExecutableSchema} from 'graphql-tools'

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


        const typeDefs = [`
      type Query {
        user(_id: String): User
        users: [User]
        option(_id: String): Option
        options: [Option]
        spread(_id: String): Spread
        spreads: [Spread]
        leg(_id: String): Leg
        legs: [Leg]
        underlyingtrade(_id: String): UnderlyingTrade
        underlyingtrades: [UnderlyingTrade]
        underlyinghistory(_id: String): UnderlyingHistory
        underlyinghistories: [UnderlyingHistory]
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
        ticker: String
        type: String
      }
      type Spread {
        _id: String
        optionId: String
        content: String
        option: Option
      }
      type Leg {
        _id: String
        optionId: String
        spreadId: String
        content: String
        option: Option
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
      type Mutation {
        createOption(ticker: String, type: String): Option
        createSpread(optionId: String, content: String): Spread
        createSpreadLeg(spreadId: String, content: String): Leg
        createOptionLeg(optionId: String, content: String): Leg
        createUnderlyingTrade(underlingHistoryId: String) : UnderlyingTrade
        createUnderlyingHistory(ticker: String) : UnderlyingHistory
      }
      schema {
        query: Query
        mutation: Mutation
      }
    `];

        const resolvers = {
            Query: {
                option: async (root, {_id}) => {
                    return prepare(await Options.findOne(ObjectId(_id)))
                },
                options: async () => {
                    return (await Options.find({}).toArray()).map(prepare)
                },
                spread: async (root, {_id}) => {
                    return prepare(await Spreads.findOne(ObjectId(_id)))
                },
            },
            Post: {
                comments: async ({_id}) => {
                    return (await Comments.find({postId: _id}).toArray()).map(prepare)
                }
            },
            Comment: {
                post: async ({postId}) => {
                    return prepare(await Posts.findOne(ObjectId(postId)))
                }
            },
            Mutation: {
                createOption: async (root, args, context, info) => {
                    const res = await Options.insertOne(args)
                    return prepare(res.ops[0])  // https://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~insertOneWriteOpResult
                },
                createComment: async (root, args) => {
                    const res = await Comments.insert(args)
                    return prepare(await Comments.findOne({_id: res.insertedIds[1]}))
                },
            },
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