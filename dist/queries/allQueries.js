"use strict";

var _util = require("../logic/util");

var _mongodb = require("mongodb");

var _calculations = require("../logic/calculations");

var bcrypt = require('bcrypt');

// Password hash functions
// Hash a new password
function hashIt(password) {
    var salt, hashed;
    return regeneratorRuntime.async(function hashIt$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return regeneratorRuntime.awrap(bcrypt.genSalt(6));

                case 2:
                    salt = _context.sent;
                    _context.next = 5;
                    return regeneratorRuntime.awrap(bcrypt.hash(password, salt));

                case 5:
                    hashed = _context.sent;
                    return _context.abrupt("return", hashed);

                case 7:
                case "end":
                    return _context.stop();
            }
        }
    }, null, this);
}

// Compare input password with hashed password
function compareIt(password, hashedPassword) {
    var validPassword;
    return regeneratorRuntime.async(function compareIt$(_context2) {
        while (1) {
            switch (_context2.prev = _context2.next) {
                case 0:
                    _context2.next = 2;
                    return regeneratorRuntime.awrap(bcrypt.compare(password, hashedPassword));

                case 2:
                    validPassword = _context2.sent;
                    return _context2.abrupt("return", validPassword);

                case 4:
                case "end":
                    return _context2.stop();
            }
        }
    }, null, this);
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
        option: function option(root, _ref) {
            var _id = _ref._id;
            return regeneratorRuntime.async(function option$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            _context3.t0 = _util.prepare;
                            _context3.next = 3;
                            return regeneratorRuntime.awrap(Options.findOne((0, _mongodb.ObjectId)(_id)));

                        case 3:
                            _context3.t1 = _context3.sent;
                            return _context3.abrupt("return", (0, _context3.t0)(_context3.t1));

                        case 5:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, null, undefined);
        },
        getSession: function getSession(root, args, context) {
            var session = context.req.session;
            if (session && !session.user) {
                session.user = { saveNewSession: true };
            }
            var sessionId = session.id ? session.id : null;
            if (sessionId == null) {
                return "";
            } else {
                return sessionId;
            }
        },
        getSessionUser: function getSessionUser(root, args, context) {
            var sessionId, sessionUser, dbSession, result, dbUser;
            return regeneratorRuntime.async(function getSessionUser$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            sessionId = args.session;

                            if (context.req.session.user) {
                                _context4.next = 3;
                                break;
                            }

                            return _context4.abrupt("return");

                        case 3:
                            sessionUser = context.req.session.user.saveNewSession ? null : context.req.session.user;
                            _context4.t0 = _util.prepare;
                            _context4.next = 7;
                            return regeneratorRuntime.awrap(context.Sessions.findOne({ _id: sessionId }));

                        case 7:
                            _context4.t1 = _context4.sent;
                            dbSession = (0, _context4.t0)(_context4.t1);
                            result = void 0;

                            if (!(sessionUser == null)) {
                                _context4.next = 14;
                                break;
                            }

                            result = {
                                _id: null,
                                firstName: null,
                                lastName: null,
                                email: null,
                                authType: null
                            };
                            _context4.next = 21;
                            break;

                        case 14:
                            _context4.t2 = _util.prepare;
                            _context4.next = 17;
                            return regeneratorRuntime.awrap(context.Users.findOne({ email: dbSession.session.user.email }));

                        case 17:
                            _context4.t3 = _context4.sent;
                            dbUser = (0, _context4.t2)(_context4.t3);

                            context.req.session.user._id = (0, _mongodb.ObjectId)(dbUser._id);
                            result = sessionUser;

                        case 21:
                            return _context4.abrupt("return", result);

                        case 22:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, null, undefined);
        },
        login: function login(root, args, ctx) {
            var dbUser, hashedPassword, password, session;
            return regeneratorRuntime.async(function login$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            _context5.t0 = _util.prepare;
                            _context5.next = 3;
                            return regeneratorRuntime.awrap(ctx.Users.findOne({ email: args.input.username }));

                        case 3:
                            _context5.t1 = _context5.sent;
                            dbUser = (0, _context5.t0)(_context5.t1);

                            if (!dbUser) {
                                _context5.next = 20;
                                break;
                            }

                            hashedPassword = dbUser.password;
                            _context5.next = 9;
                            return regeneratorRuntime.awrap(compareIt(args.input.password, hashedPassword));

                        case 9:
                            password = _context5.sent;

                            if (!password) {
                                _context5.next = 17;
                                break;
                            }

                            // Complete validation logic and return the user data
                            delete dbUser.password;
                            session = ctx.session;

                            session.user = dbUser;
                            return _context5.abrupt("return", dbUser);

                        case 17:
                            // Errors for failed logins (user and API facing)
                            console.error("Invalid password for " + dbUser.email);

                        case 18:
                            _context5.next = 21;
                            break;

                        case 20:
                            console.error("No matching user found for " + args.input.username);

                        case 21:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, null, undefined);
        },
        destroySession: function destroySession(root, args, ctx) {
            var result;
            return regeneratorRuntime.async(function destroySession$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            /*
                            console.log("destroySession:")
                            console.log(args.session)
                            console.log(ctx.session.id)
                             */
                            result = void 0;

                            if (args.session == ctx.session.id) {
                                console.log("destroying session " + args.session);
                                ctx.session.destroy(function (error) {
                                    if (error) {
                                        console.error(error);
                                        result = "Error destroying session.";
                                    } else {
                                        ctx.session = null;
                                        result = "Session destroyed.";
                                    }
                                });
                            } else {
                                result = "Cannot destroy session because session ID does not match.";
                            }
                            return _context6.abrupt("return", result);

                        case 3:
                        case "end":
                            return _context6.stop();
                    }
                }
            }, null, undefined);
        },
        getDashboard: function getDashboard(root, args, ctx) {
            var userId, finalDashboard, bankingArray, totalBalance;
            return regeneratorRuntime.async(function getDashboard$(_context8) {
                while (1) {
                    switch (_context8.prev = _context8.next) {
                        case 0:
                            userId = args._id;
                            finalDashboard = void 0;
                            _context8.next = 4;
                            return regeneratorRuntime.awrap(ctx.Banking.find({ userId: { $eq: userId } }).toArray());

                        case 4:
                            _context8.t0 = _util.prepare;
                            bankingArray = _context8.sent.map(_context8.t0);
                            totalBalance = (0, _calculations.calculateTotalBalance)(bankingArray);
                            _context8.next = 9;
                            return regeneratorRuntime.awrap(ctx.Dashboards.findOne({ user: { userId: userId } }).then(function _callee(error, result) {
                                var openOptions, input, openOptionCalculations, underlyingCalculations, bookedIncome, dashboard, query, updateQuery, options;
                                return regeneratorRuntime.async(function _callee$(_context7) {
                                    while (1) {
                                        switch (_context7.prev = _context7.next) {
                                            case 0:
                                                if (!error) {
                                                    _context7.next = 4;
                                                    break;
                                                }

                                                console.error(error);
                                                _context7.next = 27;
                                                break;

                                            case 4:
                                                if (!result) {
                                                    _context7.next = 9;
                                                    break;
                                                }

                                                // 1. If there is a dashboard in the db for this user, return that data
                                                console.log(result);
                                                return _context7.abrupt("return", result);

                                            case 9:
                                                _context7.next = 11;
                                                return regeneratorRuntime.awrap(ctx.Options.find({
                                                    $and: [{ userId: { $eq: userId } }, { endDate: null }] }).toArray());

                                            case 11:
                                                _context7.t0 = _util.prepare;
                                                openOptions = _context7.sent.map(_context7.t0);

                                                if (openOptions) {
                                                    _context7.next = 17;
                                                    break;
                                                }

                                                console.error("Error getting open options for Dashboard");
                                                _context7.next = 27;
                                                break;

                                            case 17:
                                                input = { openOptions: openOptions };
                                                openOptionCalculations = (0, _calculations.calculateOpenOptionsForDashboard)(input);
                                                // TODO UNDERLYING

                                                underlyingCalculations = {
                                                    currentValue: 0

                                                    // 3. If the dashboard cannot be retrieved or created, explain to the user why
                                                    // 3a. No banking data, balance
                                                    // 3b: No options data (collateral, number of open positions, potential profit)
                                                    // 3c. Anything else that prevents us from making the minimum dashboard calculations!

                                                };
                                                bookedIncome = 5000;
                                                dashboard = {
                                                    user: userId,
                                                    balance: totalBalance,
                                                    aroi: 9.09,
                                                    bookedIncome: bookedIncome,
                                                    chart: {
                                                        cash: totalBalance - bookedIncome - openOptionCalculations.collateral - underlyingCalculations.currentValue,
                                                        options: openOptionCalculations.collateral,
                                                        underlying: underlyingCalculations.currentValue },
                                                    options: {
                                                        numberOpen: openOptionCalculations.numberOpen,
                                                        potentialProfit: openOptionCalculations.potentialProfit,
                                                        nextExpiry: openOptionCalculations.nextExpiry },
                                                    underlying: {
                                                        numberOpen: 0,
                                                        // TODO
                                                        symbols: [{ symbol: 'TSLA',
                                                            qty: 200,
                                                            targetPrice: 500.5 }, { symbol: 'AAPL',
                                                            qty: 100,
                                                            targetPrice: 130 }] }
                                                    // Dashboard DB Upsert
                                                };
                                                query = { user: userId };
                                                updateQuery = { $set: dashboard };
                                                options = { upsert: true
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
                                                };
                                                finalDashboard = dashboard;
                                                return _context7.abrupt("return", dashboard);

                                            case 27:
                                            case "end":
                                                return _context7.stop();
                                        }
                                    }
                                }, null, undefined);
                            }));

                        case 9:
                            return _context8.abrupt("return", finalDashboard);

                        case 10:
                        case "end":
                            return _context8.stop();
                    }
                }
            }, null, undefined);
        },
        getOptions: function getOptions(root, args, ctx) {
            var userId, query, res;
            return regeneratorRuntime.async(function getOptions$(_context9) {
                while (1) {
                    switch (_context9.prev = _context9.next) {
                        case 0:
                            userId = args.input.userId;
                            query = { userId: { $eq: userId } };


                            if (args.input.open === true) {
                                query = {
                                    $and: [{ userId: { $eq: userId } }, { endDate: null }] };
                            } else if (args.input.open === false) {
                                query = {
                                    $and: [{ userId: { $eq: userId } }, { endDate: { $exists: true } }] };
                            }

                            _context9.next = 5;
                            return regeneratorRuntime.awrap(ctx.Options.find(query).toArray());

                        case 5:
                            _context9.t0 = _util.prepare;
                            res = _context9.sent.map(_context9.t0);
                            return _context9.abrupt("return", res);

                        case 8:
                        case "end":
                            return _context9.stop();
                    }
                }
            }, null, undefined);
        },
        getUnderlying: function getUnderlying(root, args, ctx) {
            var userId, query, res;
            return regeneratorRuntime.async(function getUnderlying$(_context10) {
                while (1) {
                    switch (_context10.prev = _context10.next) {
                        case 0:
                            userId = args.input.userId;
                            query = { userId: { $eq: userId } };


                            if (args.input.open === true) {
                                query = {
                                    $and: [{ userId: { $eq: userId } }, { endDate: null }] };
                            } else if (args.input.open === false) {
                                query = {
                                    $and: [{ userId: { $eq: userId } }, { endDate: { $exists: true } }] };
                            }
                            _context10.next = 5;
                            return regeneratorRuntime.awrap(ctx.Underlying.find(query).toArray());

                        case 5:
                            _context10.t0 = _util.prepare;
                            res = _context10.sent.map(_context10.t0);
                            return _context10.abrupt("return", res);

                        case 8:
                        case "end":
                            return _context10.stop();
                    }
                }
            }, null, undefined);
        },
        getBanking: function getBanking(root, args, ctx) {
            var userId, query, res;
            return regeneratorRuntime.async(function getBanking$(_context11) {
                while (1) {
                    switch (_context11.prev = _context11.next) {
                        case 0:
                            userId = args.input.userId;
                            query = { userId: { $eq: userId } };
                            _context11.next = 4;
                            return regeneratorRuntime.awrap(ctx.Banking.find(query).toArray());

                        case 4:
                            _context11.t0 = _util.prepare;
                            res = _context11.sent.map(_context11.t0);
                            return _context11.abrupt("return", res);

                        case 7:
                        case "end":
                            return _context11.stop();
                    }
                }
            }, null, undefined);
        },
        spread: function spread(root, _ref2) {
            var _id = _ref2._id;
            return regeneratorRuntime.async(function spread$(_context12) {
                while (1) {
                    switch (_context12.prev = _context12.next) {
                        case 0:
                            _context12.t0 = _util.prepare;
                            _context12.next = 3;
                            return regeneratorRuntime.awrap(Spreads.findOne((0, _mongodb.ObjectId)(_id)));

                        case 3:
                            _context12.t1 = _context12.sent;
                            return _context12.abrupt("return", (0, _context12.t0)(_context12.t1));

                        case 5:
                        case "end":
                            return _context12.stop();
                    }
                }
            }, null, undefined);
        }
    }
};