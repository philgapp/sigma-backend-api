import {processGoogleToken} from "../logic/googleAuth";
import {ObjectId} from "mongodb";
import {calculateAroi, calculateRoi} from "../logic/calculations";
import {prepare} from "../logic/util";
import {GraphQLScalarType} from "graphql";
import {Kind} from "graphql/language";
const bcrypt = require('bcrypt');
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

module.exports = {
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
        createBanking: async (root, args) => {
            const inputData = args.input
            // TODO Validate current user....
            try {
                const res = await Banking.insertOne(inputData)
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
    }),
}