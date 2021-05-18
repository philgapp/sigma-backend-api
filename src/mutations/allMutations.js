import {processGoogleToken} from "../logic/googleAuth";
import {ObjectId} from "mongodb";
import {calculateAroi, calculateCostBasisandShares, calculatePriceTarget, calculateRoi} from "../logic/calculations";
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
        upsertUser: async (root, args, context) => {
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
                await context.Users.updateOne(query, updateQuery, options, function (error, result) {
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
                                console.error("Upserted new user but no ID returned by Mongo.")
                            }
                        } else {
                            // Existing user was UPDATED
                            // Query by email (possibly updated)
                            query = {email: userInput.email}
                        }
                        // Query the new or updated user document to return
                        context.Users.findOne(query, {}, function(error,result) {
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
        processGoogleAuth: async (root, args, context) => {
            const token = args.input.token
            const session = context.session
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
            // TODO cleanup upsert
            try {
                const query = {email: tempUserResult.email}
                const updateQuery = {$set: tempUserResult}
                const options = { upsert: true };
                const res = await context.Users.updateOne(query, updateQuery, options)
                //const cleanResult = prepare(res.ops[0])
                console.log(res.upsertedId)
                const upsertResult = {
                    // TODO get new or updated user _id and return!!!
                    _id:"TODO",
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
        createOption: async (root, args, context) => {
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
                const res = await context.Options.insertOne(inputData)
                return prepare(res.ops[0])
            }
            catch (e) {
                return e
            }
        },
        createBanking: async (root, args, context) => {
            const inputData = args.input
            // TODO Validate current user....
            try {
                const res = await context.Banking.insertOne(inputData)
                return prepare(res.ops[0])
            }
            catch (e) {
                return e
            }
        },
        createUnderlying: async (root, args, context) => {
            const rawInputData = args.input
            const finalInputData = {}
            const allTrades = rawInputData.underlyingTrades
            const newTrade = rawInputData.underlyingTrades[0]

            // If ID was provided from front-end use it to prevent duplication, otherwise create new ID
            const underlyingID = rawInputData._id != null ? ObjectId(rawInputData._id) : new ObjectId
            //console.log("underlyingID")
            //console.log(underlyingID)

            let existingTrade = false
            let startDate
            let updateQuery
            let options = { upsert: true };

            // 1. Is there already an ACTIVE HISTORY for this SYMBOL, USER, and (OR?) ID?
            const existing = await context.Underlying.findOne({ symbol: rawInputData.symbol, userId: rawInputData.userId, endDate: null } )

            // YES - only add new trade to underlyingTrades array!
            if(existing && typeof(existing) != "undefined") {
                existing.underlyingTrades.map(trade => {
                    allTrades.push(trade)
                })
                existingTrade = true
                startDate = existing.startDate
                options = { upsert: false };
                finalInputData._id = existing._id
                // TODO of course
                // 2. Auto close a history / position when shares = 0

            // NO - add totally new Underlying position entry
            } else {
                finalInputData._id = new ObjectId
                finalInputData.userId = rawInputData.userId
                finalInputData.symbol = rawInputData.symbol
                finalInputData.startDate = rawInputData.startDate
                startDate = rawInputData.startDate
                finalInputData.underlyingTrades = rawInputData.underlyingTrades
            }

            // TODO - finish, later add various cost basis methods (user preference item?) AND tranches (allow sales to be taken from specific past orders - i.e. FIFO, LILO, etc.):
            // 3. Cost basis calculations
            const costBasis = calculateCostBasisandShares({ underlyingTrades: allTrades } )
            finalInputData.currentShares = costBasis.currentShares
            finalInputData.rawCostBasis = costBasis.rawCostBasis
            finalInputData.adjustedCostBasis = costBasis.adjustedCostBasis
            finalInputData.minimumCostBasis = costBasis.minimumCostBasis

            // TODO
            // 4. Target Prices
            const targetPriceData = calculatePriceTarget({ rawCostBasis: finalInputData.rawCostBasis, startDate: startDate } )
            finalInputData.targetPriceWeek = targetPriceData.targetPriceWeek
            finalInputData.targetPriceMonth = targetPriceData.targetPriceMonth

            // TODO
            // 5. Errors [with calculations (i.e. fewer than 0 shares!?)] - incorrect or incomplete input, etc.

            // 6. UPSERT
            let query = { _id: finalInputData._id }
            updateQuery = existingTrade
                ? { $push: {
                        underlyingTrades: newTrade
                    },
                    $set: {
                        currentShares: finalInputData.currentShares,
                        rawCostBasis: finalInputData.rawCostBasis,
                        //TODO any other fields that must be upserted for existing positions!
                        targetPriceWeek: finalInputData.targetPriceWeek,
                        targetPriceMonth: finalInputData.targetPriceMonth,
                    }
                    }
                : { $set: finalInputData }
            const res = await context.Underlying.updateOne(query, updateQuery, options)
            let returnDocument = {}
            if (res.upsertedId) {
                returnDocument = (await context.Underlying.findOne({ _id: res.upsertedId._id } ))
            } else {
                returnDocument = (await context.Underlying.findOne({ _id: finalInputData._id } ))
            }

            // TODO return properly...
            return returnDocument

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