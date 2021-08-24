"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// Returns ROI as percentage to 2 decimals given input.profit and input.capital
/*
input = {
    profit: premium per share
    capital: strike price (potential cost per share)
}
return = {
    roi: direct profit / capital ROI multiplied by 100 (shares per option contract)
}
 */
var calculateRoi = function calculateRoi(input) {
    if (!input) {
        console.error("calculateRoi no input!");
        return;
    }
    var rawRoi = input.profit / input.capital;
    var roi = (rawRoi * 100).toFixed(2);
    return roi;
};

// Returns AROI as percentage to 2 decimals given input.roi, input.startDate and input.endDate
/*
input = {
    startDate
    endDate
    roi: from calculateRoi function result
}
return = {
    aroi: annualized return given a basic ROI and date range (number of days)
}
 */
var calculateAroi = function calculateAroi(input) {
    if (!input) {
        console.error("calculateAroi no input!");
        return;
    }
    // Get full text string dates from numeric values
    var startDate = new Date(input.startDate);
    var endDate = new Date(input.endDate);
    // Calculate difference between dates in days
    var days = (endDate - startDate) / 86400000;
    // Calculate and return AROI as a float
    var rawDailyRoi = input.roi / days;
    var rawAroi = rawDailyRoi * 365;
    var aroi = rawAroi.toFixed(2);
    return aroi;
};

// Dashboard functions
// Open Options
// input = array of open Options
// collateral (For chart)
// numberOpen: 8,
// potentialProfit: 1500,
// nextExpiry: 1621555200000
var calculateOpenOptionsForDashboard = function calculateOpenOptionsForDashboard(input) {
    var openOptions = input.openOptions;
    var totalCollateral = 0;
    var potentialProfit = 0;
    var expirationDateArray = [];
    var nextExpiry = void 0;
    openOptions.map(function (option) {
        // Separate simple options and spreads
        // TODO smarter checking using:
        // isSpread (on legs)
        // parent (NEEDS TO BE ADDED TO OPTION-SPREAD-LEG STILL!!!!!!)
        // etc.
        if (option.spreads.length > 1) {
            // More than 1 spread?!? Most complex options....
        } else {
            // Single Spread
            if (option.spreads[0].legs.length > 1) {
                // Simple Spreads, medium complexity
                console.log("Complex Option");
            } else {
                // Single Leg, simple options
                var leg = option.spreads[0].legs[0];
                totalCollateral += leg.capitalRequirement;
                potentialProfit += leg.initialPremium * 100;
                expirationDateArray.push(leg.expirationDate);
            }
        }
    });
    nextExpiry = expirationDateArray.reduce(function (pre, cur) {
        return Date.parse(pre) > Date.parse(cur) ? cur : pre;
    });

    var result = {};
    result.collateral = totalCollateral;
    result.numberOpen = openOptions.length;
    result.potentialProfit = potentialProfit;
    result.nextExpiry = nextExpiry;
    return result;
};

var calculateTotalBalance = function calculateTotalBalance(banking) {
    var balance = 0;
    banking.map(function (trans) {
        if (trans.type == "Deposit") {
            balance += trans.amount;
        } else if (trans.type == "Withdrawal") {
            balance -= trans.amount;
        } else {
            console.error("Banking transaction type " + trans.type + " could not be added to or subtracted from calculateTotalBalance.");
        }
    });
    return balance;
};

// Returns cost basis
/*
input = {
    underlyingTrades
    optionData
}
returns = {
    rawCostBasis: (highest) cost basis of purchases / assignments without any reductions
    adjustedCostBasis: (common adjusted) cost basis with reductions due to any premium collected
    minimumCostBasis: (lowest) cost basis with reductions from premium AND dividends
}
 */
var calculateCostBasisandShares = function calculateCostBasisandShares(input) {
    //console.log("calc Cost Basis")
    //console.log(input)

    var underlyingTrades = input.underlyingTrades;
    var averageCostBasisData = {
        totalSharesEverPurchased: 0,
        totalCostOfAllShares: 0,
        currentShares: 0,
        rawCostBasis: 0,
        totalDividends: 0
    };

    var tradeReducer = function tradeReducer(data, nextTrade) {
        //console.log("tradeReducer")
        //console.log(data)
        //console.log(nextTrade)
        switch (nextTrade.type) {
            case "Buy":
                return _extends({}, data, {
                    totalSharesEverPurchased: data.totalSharesEverPurchased += nextTrade.shares,
                    totalCostOfAllShares: data.totalCostOfAllShares += parseFloat(nextTrade.price * nextTrade.shares),
                    currentShares: data.currentShares += nextTrade.shares
                });
            case "Assigned":
                return _extends({}, data, {
                    totalSharesEverPurchased: data.totalSharesEverPurchased += nextTrade.shares,
                    currentShares: data.currentShares += nextTrade.shares
                });
            case "Sell":
                return _extends({}, data, {
                    currentShares: data.currentShares -= nextTrade.shares
                    // TODO FIFO, AVG cost basis, etc dealing with SELLS
                });
            case "Called":
                return _extends({}, data, {
                    currentShares: data.currentShares -= nextTrade.shares
                    // TODO FIFO, AVG cost basis, etc dealing with CALLS
                });
            case "Dividend":
                return _extends({}, data, {
                    totalDividends: data.totalDividends += parseFloat(nextTrade.price * nextTrade.shares)
                    // TODO FIFO, AVG cost basis, etc dealing with DIVS
                });
            default:
                return data;
        }
    };

    var averageCostBasis = function averageCostBasis(data) {
        return Math.round(data.totalCostOfAllShares / data.totalSharesEverPurchased * 100) / 100;
    };

    underlyingTrades.map(function (trade) {
        averageCostBasisData = tradeReducer(averageCostBasisData, trade);
    });

    averageCostBasisData.rawCostBasis = averageCostBasis(averageCostBasisData);
    //console.log(averageCostBasisData)

    return averageCostBasisData;

    // TODO - handle timeframes, campaigns that include open and closed positions, all time, etc.
};

// Returns price target to 2 decimals given
/*
input = {
    rawCostBasis: basic, unadjusted cost basis
    startDate: earliest date for current campaign
    targetReturn: user preferred AROI target (default 25%)
}
return = {
    targetPriceWeek: target price to achieve return within next 7 days
    targetPriceMonth: same, but for 30 days out
}
 */
var calculatePriceTarget = function calculatePriceTarget(input) {
    var costBasis = input.rawCostBasis;
    var startDate = new Date(input.startDate);
    var targetReturn = input.targetReturn || 0.25;
    var targetAroi = targetReturn / 365;
    var today1 = new Date();
    var today2 = new Date();
    var oneWeekTargetDate = today1.setDate(today1.getDate() + 7);
    var oneMonthTargetDate = today2.setDate(today2.getDate() + 30);
    var daysToOneWeek = (oneWeekTargetDate - startDate) / 86400000;
    var daysToOneMonth = (oneMonthTargetDate - startDate) / 86400000;

    var calculateTargets = function calculateTargets() {
        return {
            targetPriceWeek: Math.round((targetAroi * daysToOneWeek * costBasis + costBasis) * 100) / 100,
            targetPriceMonth: Math.round((targetAroi * daysToOneMonth * costBasis + costBasis) * 100) / 100
        };
    };
    return calculateTargets();
};

// Returns total booked income for time period
/*
input = {
    startDate: optional (all time if not provided)
    endDate: optional (all time if not provided)
    type: all, option or underlying
    data: array of option or underlying data to calculate
    allData: array with 2 arrays for option AND underlying data
}
 */
var calculateBookedIncome = function calculateBookedIncome(input) {};

// Random ID (TESTING ONLY)
// Generate unique IDs for use as pseudo-private/protected names.
// Similar in concept to
// <http://wiki.ecmascript.org/doku.php?id=strawman:names>.
//
// The goals of this function are twofold:
//
// * Provide a way to generate a string guaranteed to be unique when compared
//   to other strings generated by this function.
// * Make the string complex enough that it is highly unlikely to be
//   accidentally duplicated by hand (this is key if you're using `ID`
//   as a private/protected name on an object).
//
// Use:
//
//     var privateName = ID();
//     var o = { 'public': 'foo' };
//     o[privateName] = 'bar';
var generateTestId = function generateTestId() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return 'T' + Math.random().toString(36).substr(2, 9);
};

module.exports = {
    calculateRoi: calculateRoi,
    calculateAroi: calculateAroi,
    generateTestId: generateTestId,
    calculateOpenOptionsForDashboard: calculateOpenOptionsForDashboard,
    calculateTotalBalance: calculateTotalBalance,
    calculateCostBasisandShares: calculateCostBasisandShares,
    calculatePriceTarget: calculatePriceTarget
};