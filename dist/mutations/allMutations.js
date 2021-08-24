"use strict";

var _googleAuth = require("../logic/googleAuth");

var _mongodb = require("mongodb");

var _calculations = require("../logic/calculations");

var _util = require("../logic/util");

var _graphql = require("graphql");

var _language = require("graphql/language");

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
// Usage:
// hashIt( password )
// compareIt( password, storedPassword )

module.exports = {
    Mutation: {
        upsertUser: function upsertUser(root, args, context) {
            var userInput, query, updateQuery, options;
            return regeneratorRuntime.async(function upsertUser$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            userInput = {};

                            userInput.firstName = args.input.firstName;
                            userInput.lastName = args.input.lastName;
                            userInput.email = args.input.email;
                            userInput.authType = args.input.authType;
                            _context3.next = 7;
                            return regeneratorRuntime.awrap(hashIt(args.input.password));

                        case 7:
                            userInput.password = _context3.sent;
                            _context3.prev = 8;
                            query = { email: userInput.email };
                            updateQuery = { $set: userInput };
                            options = { upsert: true };
                            _context3.next = 14;
                            return regeneratorRuntime.awrap(context.Users.updateOne(query, updateQuery, options, function (error, result) {
                                if (error) {
                                    console.log('error upserting user');
                                    console.error(error);
                                    return error;
                                } else {
                                    var _query = void 0;
                                    if (result.upsertedCount > 0) {
                                        // New user was INSERTED
                                        if (result.upsertedId._id) {
                                            // Query by newly inserted ID
                                            _query = { _id: result.upsertedId._id };
                                        } else {
                                            console.error("Upserted new user but no ID returned by Mongo.");
                                        }
                                    } else {
                                        // Existing user was UPDATED
                                        // Query by email (possibly updated)
                                        _query = { email: userInput.email };
                                    }
                                    // Query the new or updated user document to return
                                    context.Users.findOne(_query, {}, function (error, result) {
                                        if (error) {
                                            console.error(error);
                                            return error;
                                        } else {
                                            delete result.password;
                                            console.log(result);
                                            return result;
                                        }
                                    });
                                }
                            }));

                        case 14:
                            _context3.next = 20;
                            break;

                        case 16:
                            _context3.prev = 16;
                            _context3.t0 = _context3["catch"](8);

                            console.error(_context3.t0);
                            return _context3.abrupt("return", _context3.t0);

                        case 20:
                        case "end":
                            return _context3.stop();
                    }
                }
            }, null, undefined, [[8, 16]]);
        },
        processGoogleAuth: function processGoogleAuth(root, args, context) {
            var token, session, googleResult, tempUserResult, nameArray, query, updateQuery, options, res, returnDocument;
            return regeneratorRuntime.async(function processGoogleAuth$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            token = args.input.token;
                            session = context.session;
                            _context4.next = 4;
                            return regeneratorRuntime.awrap((0, _googleAuth.processGoogleToken)(token));

                        case 4:
                            googleResult = _context4.sent;
                            tempUserResult = {};
                            //tempUserResult._id = "BS_ID"

                            nameArray = googleResult.name.split(' ');

                            tempUserResult.firstName = nameArray[0];
                            tempUserResult.lastName = nameArray[1];
                            tempUserResult.email = googleResult.email;
                            tempUserResult.authType = "Google";
                            session.user = tempUserResult;
                            //password: String
                            // TODO cleanup upsert
                            _context4.prev = 12;
                            query = { email: tempUserResult.email };
                            updateQuery = { $set: tempUserResult };
                            options = { upsert: true };
                            _context4.next = 18;
                            return regeneratorRuntime.awrap(context.Users.updateOne(query, updateQuery, options));

                        case 18:
                            res = _context4.sent;

                            //const cleanResult = prepare(res.ops[0])
                            returnDocument = {};

                            if (!res.upsertedId) {
                                _context4.next = 26;
                                break;
                            }

                            _context4.next = 23;
                            return regeneratorRuntime.awrap(context.Users.findOne({ _id: res.upsertedId._id }));

                        case 23:
                            returnDocument = _context4.sent;
                            _context4.next = 29;
                            break;

                        case 26:
                            _context4.next = 28;
                            return regeneratorRuntime.awrap(context.Users.findOne({ email: tempUserResult.email }));

                        case 28:
                            returnDocument = _context4.sent;

                        case 29:
                            return _context4.abrupt("return", returnDocument);

                        case 32:
                            _context4.prev = 32;
                            _context4.t0 = _context4["catch"](12);

                            console.error(_context4.t0);
                            return _context4.abrupt("return", _context4.t0);

                        case 36:
                        case "end":
                            return _context4.stop();
                    }
                }
            }, null, undefined, [[12, 32]]);
        },
        createOption: function createOption(root, args, context) {
            var inputData, thisLeg, capitalRequirement, initialPremium, initialRoi, startDate, endDate, res;
            return regeneratorRuntime.async(function createOption$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            inputData = args.input;
                            // TODO Validate current user....
                            // generate ObjectIds for Option, Spread(s) and Leg(s)

                            inputData._id = new _mongodb.ObjectId();
                            inputData.spreads[0]._id = new _mongodb.ObjectId();
                            thisLeg = inputData.spreads[0].legs[0];

                            thisLeg._id = new _mongodb.ObjectId();
                            // Set input object from input data and calculate ROI, AROI
                            capitalRequirement = thisLeg.strike;
                            initialPremium = thisLeg.initialPremium;
                            initialRoi = (0, _calculations.calculateRoi)({ profit: initialPremium, capital: capitalRequirement });
                            startDate = thisLeg.entryDate;
                            endDate = thisLeg.expirationDate;

                            thisLeg.initialRoi = initialRoi;
                            thisLeg.initialAroi = (0, _calculations.calculateAroi)({ startDate: startDate, endDate: endDate, roi: initialRoi });
                            thisLeg.capitalRequirement = capitalRequirement * 100;
                            _context5.prev = 13;
                            _context5.next = 16;
                            return regeneratorRuntime.awrap(context.Options.insertOne(inputData));

                        case 16:
                            res = _context5.sent;
                            return _context5.abrupt("return", (0, _util.prepare)(res.ops[0]));

                        case 20:
                            _context5.prev = 20;
                            _context5.t0 = _context5["catch"](13);
                            return _context5.abrupt("return", _context5.t0);

                        case 23:
                        case "end":
                            return _context5.stop();
                    }
                }
            }, null, undefined, [[13, 20]]);
        },
        createBanking: function createBanking(root, args, context) {
            var inputData, res;
            return regeneratorRuntime.async(function createBanking$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            inputData = args.input;
                            // TODO Validate current user....

                            _context6.prev = 1;
                            _context6.next = 4;
                            return regeneratorRuntime.awrap(context.Banking.insertOne(inputData));

                        case 4:
                            res = _context6.sent;
                            return _context6.abrupt("return", (0, _util.prepare)(res.ops[0]));

                        case 8:
                            _context6.prev = 8;
                            _context6.t0 = _context6["catch"](1);
                            return _context6.abrupt("return", _context6.t0);

                        case 11:
                        case "end":
                            return _context6.stop();
                    }
                }
            }, null, undefined, [[1, 8]]);
        },
        createUnderlying: function createUnderlying(root, args, context) {
            var rawInputData, finalInputData, allTrades, newTrade, underlyingID, existingPosition, startDate, updateQuery, options, existing, costBasisData, targetPriceData, query, res, returnDocument;
            return regeneratorRuntime.async(function createUnderlying$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            rawInputData = args.input;
                            finalInputData = {};
                            allTrades = rawInputData.underlyingTrades;
                            newTrade = rawInputData.underlyingTrades[0];

                            newTrade._id = new _mongodb.ObjectId();

                            // If ID was provided from front-end use it to prevent duplication, otherwise create new ID
                            underlyingID = rawInputData._id != null ? (0, _mongodb.ObjectId)(rawInputData._id) : new _mongodb.ObjectId();
                            //console.log("underlyingID")
                            //console.log(underlyingID)

                            existingPosition = false;
                            startDate = void 0;
                            updateQuery = void 0;
                            options = { upsert: true

                                // 1. Is there already an ACTIVE HISTORY for this SYMBOL, USER, and (OR?) ID?
                            };
                            _context7.next = 12;
                            return regeneratorRuntime.awrap(context.Underlying.findOne({
                                symbol: rawInputData.symbol,
                                userId: rawInputData.userId,
                                endDate: null }));

                        case 12:
                            existing = _context7.sent;


                            // YES - only add new trade to underlyingTrades array!
                            if (existing && typeof existing !== "undefined") {
                                existing.underlyingTrades.map(function (trade) {
                                    allTrades.push(trade);
                                });
                                existingPosition = true;
                                startDate = existing.startDate;
                                options = { upsert: false };
                                finalInputData._id = existing._id;
                                // TODO of course !!!
                                // 2. Auto close a history / position when shares = 0

                                // NO - add totally new Underlying position entry
                            } else {
                                finalInputData._id = new _mongodb.ObjectId();
                                finalInputData.userId = rawInputData.userId;
                                finalInputData.symbol = rawInputData.symbol;
                                finalInputData.startDate = rawInputData.startDate;
                                startDate = rawInputData.startDate;
                                finalInputData.underlyingTrades = rawInputData.underlyingTrades;
                            }

                            // TODO - finish, later add various cost basis methods (user preference item?) AND tranches (allow sales to be taken from specific past orders - i.e. FIFO, LILO, etc.):
                            // 3. Cost basis calculations
                            costBasisData = (0, _calculations.calculateCostBasisandShares)({ underlyingTrades: allTrades });

                            finalInputData.currentShares = costBasisData.currentShares;
                            finalInputData.rawCostBasis = costBasisData.rawCostBasis;
                            finalInputData.adjustedCostBasis = costBasisData.adjustedCostBasis;
                            finalInputData.minimumCostBasis = costBasisData.minimumCostBasis;

                            // TODO
                            // 4. Target Prices
                            targetPriceData = (0, _calculations.calculatePriceTarget)({ rawCostBasis: finalInputData.rawCostBasis, startDate: startDate });

                            finalInputData.targetPriceWeek = targetPriceData.targetPriceWeek;
                            finalInputData.targetPriceMonth = targetPriceData.targetPriceMonth;

                            // TODO
                            // 5. Errors [with calculations (i.e. fewer than 0 shares!?)] - incorrect or incomplete input, etc.

                            // 6. UPSERT
                            query = { _id: finalInputData._id };

                            updateQuery = existingPosition ? { $push: {
                                    underlyingTrades: newTrade },
                                $set: {
                                    currentShares: finalInputData.currentShares,
                                    rawCostBasis: finalInputData.rawCostBasis,
                                    //TODO any other fields that must be upserted for existing positions!
                                    targetPriceWeek: finalInputData.targetPriceWeek,
                                    targetPriceMonth: finalInputData.targetPriceMonth } } : { $set: finalInputData };
                            _context7.next = 26;
                            return regeneratorRuntime.awrap(context.Underlying.updateOne(query, updateQuery, options));

                        case 26:
                            res = _context7.sent;
                            returnDocument = {};

                            if (!res.upsertedId) {
                                _context7.next = 34;
                                break;
                            }

                            _context7.next = 31;
                            return regeneratorRuntime.awrap(context.Underlying.findOne({ _id: res.upsertedId._id }));

                        case 31:
                            returnDocument = _context7.sent;
                            _context7.next = 37;
                            break;

                        case 34:
                            _context7.next = 36;
                            return regeneratorRuntime.awrap(context.Underlying.findOne({ _id: finalInputData._id }));

                        case 36:
                            returnDocument = _context7.sent;

                        case 37:
                            return _context7.abrupt("return", returnDocument);

                        case 38:
                        case "end":
                            return _context7.stop();
                    }
                }
            }, null, undefined);
        },
        editUnderlying: function editUnderlying(root, args, context) {
            var rawInputData, finalInputData, allTrades, startDate, options, position, costBasisData, targetPriceData, query, updateQuery, res, returnDocument;
            return regeneratorRuntime.async(function editUnderlying$(_context8) {
                while (1) {
                    switch (_context8.prev = _context8.next) {
                        case 0:
                            rawInputData = args.input;
                            finalInputData = {
                                _id: rawInputData._id,
                                userId: rawInputData.userId,
                                startDate: rawInputData.startDate,
                                underlyingTrades: {
                                    _id: rawInputData.underlyingTrades._id,
                                    type: rawInputData.underlyingTrades.type,
                                    tradeDate: rawInputData.underlyingTrades.tradeDate,
                                    shares: rawInputData.underlyingTrades.shares,
                                    price: rawInputData.underlyingTrades.price
                                }
                            };

                            console.log(rawInputData);
                            console.log(finalInputData);

                            allTrades = [];
                            startDate = rawInputData.startDate;
                            options = { upsert: false };
                            _context8.next = 9;
                            return regeneratorRuntime.awrap(context.Underlying.findOne({
                                symbol: rawInputData.symbol,
                                userId: rawInputData.userId,
                                endDate: null }));

                        case 9:
                            position = _context8.sent;

                            if (position && typeof position !== "undefined") {
                                position.underlyingTrades.map(function (trade) {
                                    allTrades.push(trade);
                                });
                                //finalInputData._id = existing._id
                                // TODO of course !!!
                                // 2. Auto close a history / position when shares = 0
                            }

                            // TODO - finish, later add various cost basis methods (user preference item?) AND tranches (allow sales to be taken from specific past orders - i.e. FIFO, LILO, etc.):
                            // 3. Cost basis calculations
                            costBasisData = (0, _calculations.calculateCostBasisandShares)({ underlyingTrades: allTrades });

                            finalInputData.currentShares = costBasisData.currentShares;
                            finalInputData.rawCostBasis = costBasisData.rawCostBasis;
                            finalInputData.adjustedCostBasis = costBasisData.adjustedCostBasis;
                            finalInputData.minimumCostBasis = costBasisData.minimumCostBasis;

                            // TODO
                            // 4. Target Prices
                            targetPriceData = (0, _calculations.calculatePriceTarget)({ rawCostBasis: finalInputData.rawCostBasis, startDate: startDate });

                            finalInputData.targetPriceWeek = targetPriceData.targetPriceWeek;
                            finalInputData.targetPriceMonth = targetPriceData.targetPriceMonth;

                            query = { _id: finalInputData._id };
                            updateQuery = {
                                $set: {
                                    underlyingTrades: newTrade,

                                    currentShares: finalInputData.currentShares,
                                    rawCostBasis: finalInputData.rawCostBasis,
                                    //TODO any other fields that must be upserted for existing positions!
                                    targetPriceWeek: finalInputData.targetPriceWeek,
                                    targetPriceMonth: finalInputData.targetPriceMonth } };
                            _context8.next = 23;
                            return regeneratorRuntime.awrap(context.Underlying.updateOne(query, updateQuery, options));

                        case 23:
                            res = _context8.sent;
                            returnDocument = {};

                            if (!res.upsertedId) {
                                _context8.next = 31;
                                break;
                            }

                            _context8.next = 28;
                            return regeneratorRuntime.awrap(context.Underlying.findOne({ _id: res.upsertedId._id }));

                        case 28:
                            returnDocument = _context8.sent;
                            _context8.next = 34;
                            break;

                        case 31:
                            _context8.next = 33;
                            return regeneratorRuntime.awrap(context.Underlying.findOne({ _id: finalInputData._id }));

                        case 33:
                            returnDocument = _context8.sent;

                        case 34:
                            return _context8.abrupt("return", returnDocument);

                        case 35:
                        case "end":
                            return _context8.stop();
                    }
                }
            }, null, undefined);
        }
    },
    Date: new _graphql.GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue: function parseValue(value) {
            return value; // value from the client
        },
        serialize: function serialize(value) {
            return value; // value sent to the client
        },
        parseLiteral: function parseLiteral(ast) {
            if (ast.kind === _language.Kind.INT) return parseInt(ast.value, 10); // ast value is always in string format
            return null;
        }
    })
};