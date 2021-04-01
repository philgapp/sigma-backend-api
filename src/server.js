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

        /*
        Playing with mutations from client side - adding option:

        mutation {
          createTestOption(input: {
            userId: "temp1",
            symbol: "TSLA",
            type: P,
            spreads: [
              {
                legs: [
                  {
                    qty: 1,
                    isSpread: false,
                    entryDate: 1617235200000,
                    expirationDate: 1621555200000,
                    strike: 22.5,
                    underlyingEntryPrice: 24,
                    initialPremium: 0.9,
                    notes: "Just some random test notes to play with...",
                  }
                ]
              }
            ]
          }) {
              _id
              symbol
                type
              spreads {
                _id
                legs {
                  _id
                  qty
                  entryDate
                  strike
                  expirationDate
                  initialPremium
                  initialRoi
                  initialAroi
                  capitalRequirement
                  notes
                }
              }
            }
        }


        BETTER - parameter object pattern with variable

        $input = {
            userId: "temp1",
            symbol: "TSLA",
            type: P,
            spreads: [
              {
                legs: [
                  {
                    qty: 1,
                    isSpread: false,
                    entryDate: 1617235200000,
                    expirationDate: 1621555200000,
                    strike: 22.5,
                    underlyingEntryPrice: 24,
                    initialPremium: 0.9,
                    notes: "Just some random test notes to play with...",
                  }
                ]
              }
            ]
          }

          mutation createTestOption($input: OptionInput!) {
              createTestOption(input: $input) {
                  _id
                  symbol
                    type
                  spreads {
                    _id
                    legs {
                      _id
                      qty
                      entryDate
                      strike
                      expirationDate
                      initialPremium
                      initialRoi
                      initialAroi
                      capitalRequirement
                      notes
                    }
                  }
                  user {
                    _id
                    firstName
                    email
                  }
                }
            }


        NOTES:
        Dates. From client side always send and receive numbers, for example:
        new Date("2021-05-21").getTime() = 1621555200000 (as used in mutation example above)

         */

        const testUsers = [
            {_id:'temp1',firstName:'Phillip',lastName:'Gapp',email:'philgapp@gmail.com',authType:'LOCAL',password:'password'},
            {_id:'temp2',firstName:'Demo',lastName:'User',email:'demo@test.com',authType:'LOCAL',password:'password'}
        ]

        const testOptions = []

        const typeDefs = [`
      type Query {
        viewTest(_id: ID!): Test
        viewTests: [Test]
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
      type Test {
        _id: ID!
        title: String
        content: String
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
        createTestOption(input: OptionInput): Option
        createSpread(optionId: String, content: String): Spread
        createSpreadLeg(spreadId: String, content: String): Leg
        createOptionLeg(optionId: String, content: String): Leg
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
                getOptionsByUser: async (root, args) => {
                    const userId = args._id
                    console.log(userId)
                    console.log(testOptions)
                    const res = testOptions.filter(function(option) {
                        option.userId === userId
                    })
                    console.log(res)
                    return res
                    //return (await Options.find({}).toArray()).map(prepare)
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
                createTestOption: async (root, args) => {
                    const inputData = args.input
                    // TODO Validate current user....
                    // generateIds for Option, Spread(s) and Leg(s)
                    inputData._id = generateTestId
                    inputData.spreads[0]._id = generateTestId
                    const thisLeg = inputData.spreads[0].legs[0]
                    thisLeg._id = generateTestId
                    // Set variables and calculate ROI and AROI
                    const capitalRequirement = thisLeg.strike
                    const initialPremium = thisLeg.initialPremium
                    const initialRoi = calculateRoi({profit:initialPremium,capital:capitalRequirement})
                    const startDate = thisLeg.entryDate
                    const endDate = thisLeg.expirationDate
                    thisLeg.initialRoi = initialRoi
                    thisLeg.initialAroi = calculateAroi({startDate:startDate,endDate:endDate,roi:initialRoi})
                    thisLeg.capitalRequirement = capitalRequirement * 100
                    testOptions.push(inputData)
                    return inputData
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