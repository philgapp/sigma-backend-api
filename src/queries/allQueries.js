import { prepare } from "../logic/util";
import { ObjectId } from 'mongodb'
import {calculateOpenOptionsForDashboard, calculateTotalBalance} from "../logic/calculations";
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
    Query: {
        /*
        user: async (root, args) => {
            const id = args._id
            const res = testUsers.filter(function (user) {
                return user._id === id
            })
            return res[0]
        },

         */
        option: async (root, {_id}) => {
            return prepare(await Options.findOne(ObjectId(_id)))
        },
        getSession: (root, args, context) => {
            const session = context.req.session
            if(session && !session.user) {
                session.user = {saveNewSession:true}
            }
            const sessionId = session.id ? session.id : null
            if (sessionId == null) {
                return ""
            } else {
                return sessionId
            }
        },
        getSessionUser: async (root, args, context) => {
            const sessionId = args.session
            if(!context.req.session.user) return
            const sessionUser = context.req.session.user.saveNewSession ? null : context.req.session.user
            const dbSession = prepare(await context.Sessions.findOne({"_id": sessionId}))
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
                const dbUser = prepare(await context.Users.findOne({"email": dbSession.session.user.email}))
                context.req.session.user._id = ObjectId(dbUser._id)
                result = sessionUser
            }
            return result
        },
        login: async (root, args, ctx) => {
            const dbUser = prepare(await ctx.Users.findOne({"email": args.input.username}))
            if (dbUser) {
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
            if (args.session == ctx.session.id) {
                console.log("destroying session " + args.session)
                ctx.session.destroy(error => {
                    if (error) {
                        console.error(error)
                        result = "Error destroying session."
                    } else {
                        ctx.session = null
                        result = "Session destroyed."
                    }
                })
            } else {
                result = "Cannot destroy session because session ID does not match."
            }
            return result
        },
        getDashboard: async (root, args, ctx) => {
            const userId = args._id
            let finalDashboard
            const bankingArray = (await ctx.Banking.find({userId: {$eq: userId}}).toArray()).map(prepare)
            const totalBalance = calculateTotalBalance(bankingArray)
            await ctx.Dashboards.findOne({user: {userId}})
                .then(async (error, result) => {
                    if (error) {
                        console.error(error)
                    } else {
                        if (result) {
                            // 1. If there is a dashboard in the db for this user, return that data
                            console.log(result)
                            return result
                        } else {
                            // 2. If there is no dashboard for this user, calculate and store the data
                            // -- Do this anyway? For example if there is new option data run those calculations and upsert?
                            // -- need a helper function / family of functions that can be used in multiple places to update the dashboard
                            const openOptions = (await ctx.Options.find({
                                $and: [
                                    {userId: {$eq: userId}},
                                    {endDate: null}
                                ]
                            }).toArray()).map(prepare)

                                    if (!openOptions) {
                                        console.error("Error getting open options for Dashboard")
                                    } else {
                                        const input = {openOptions: openOptions}
                                        const openOptionCalculations = calculateOpenOptionsForDashboard(input)
                                        // TODO UNDERLYING
                                        const underlyingCalculations = {
                                            currentValue: 0
                                        }

                                        // 3. If the dashboard cannot be retrieved or created, explain to the user why
                                        // 3a. No banking data, balance
                                        // 3b: No options data (collateral, number of open positions, potential profit)
                                        // 3c. Anything else that prevents us from making the minimum dashboard calculations!

                                        const dashboard = {}
                                        dashboard.user = userId
                                        dashboard.balance = totalBalance
                                        dashboard.aroi = 9.09
                                        dashboard.bookedIncome = 5000
                                        dashboard.chart = {
                                            cash: (totalBalance - dashboard.bookedIncome - openOptionCalculations.collateral - underlyingCalculations.currentValue),
                                            options: openOptionCalculations.collateral,
                                            underlying: underlyingCalculations.currentValue
                                        }
                                        dashboard.options = {
                                            numberOpen: openOptionCalculations.numberOpen,
                                            potentialProfit: openOptionCalculations.potentialProfit,
                                            nextExpiry: openOptionCalculations.nextExpiry
                                        }
                                        dashboard.underlying = {
                                            numberOpen: 0,
                                            // TODO
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
                                        // Dashboard DB Upsert
                                        const query = {user: userId}
                                        const updateQuery = {$set: dashboard}
                                        const options = {upsert: true};
                                        /*
                                        (async () => {
                                            await Dashboards.updateOne(query, updateQuery, options)
                                                .then((error, result) => {
                                                    if(error) {
                                                        console.error(error)
                                                    } else {
                                                        console.log(result)
                                                    }
                                                })
                                        })().catch(error => {
                                            console.error(error)
                                        })

                                         */
                                        finalDashboard = dashboard
                                        return dashboard
                                    }
                        }
                    }
                })
            return finalDashboard
        },
        getOptions: async (root, args, ctx) => {
            const userId = args.input.userId
            let query = {userId: {$eq: userId}}

            if (args.input.open == true) {
                query = {
                    $and: [
                        {userId: {$eq: userId}},
                        {endDate: null}
                    ]
                }
            } else if (args.input.open == false) {
                query = {
                    $and: [
                        {userId: {$eq: userId}},
                        {endDate: {$exists: true}}
                    ]
                }
            }

            const res = (await ctx.Options.find(query).toArray()).map(prepare)
            return res
        },
        getUnderlying: async (root, args, ctx) => {
            const userId = args.input.userId
            let query = {userId: {$eq: userId}}
            if (args.input.open) {
                query = {
                    $and: [
                        { userId: { $eq: userId } },
                        { endDate: null }
                    ]
                }
            }
            const res = (await ctx.Underlying.find(query).toArray()).map(prepare)
            return res
        },
        getBanking: async (root, args, ctx) => {
            const userId = args.input.userId
            let query = {userId: {$eq: userId}}
            const res = (await ctx.Banking.find(query).toArray()).map(prepare)
            return res
        },
        spread: async (root, {_id}) => {
            return prepare(await Spreads.findOne(ObjectId(_id)))
        },
    },
}