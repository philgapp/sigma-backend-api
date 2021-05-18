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
const calculateRoi = (input) => {
    if(!input) {
        console.error("calculateRoi no input!")
        return
    }
    const rawRoi = input.profit / input.capital
    const roi = (rawRoi * 100).toFixed(2)
    return roi
}

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
const calculateAroi = (input) => {
    if(!input) {
        console.error("calculateAroi no input!")
        return
    }
    // Get full text string dates from numeric values
    const startDate = new Date(input.startDate)
    const endDate = new Date(input.endDate)
    // Calculate difference between dates in days
    const days = (endDate - startDate)/86400000
    // Calculate and return AROI as a float
    const rawDailyRoi = input.roi / days
    const rawAroi = rawDailyRoi * 365
    const aroi = rawAroi.toFixed(2)
    return aroi
}

// Dashboard functions
// Open Options
// input = array of open Options
// collateral (For chart)
// numberOpen: 8,
// potentialProfit: 1500,
// nextExpiry: 1621555200000
const calculateOpenOptionsForDashboard = (input) => {
    const openOptions = input.openOptions
    let totalCollateral = 0
    let potentialProfit = 0
    let expirationDateArray = []
    let nextExpiry
    openOptions.map(option => {
        // Separate simple options and spreads
        // TODO smarter checking using:
        // isSpread (on legs)
        // parent (NEEDS TO BE ADDED TO OPTION-SPREAD-LEG STILL!!!!!!)
        // etc.
        if(option.spreads.length > 1) {
            // More than 1 spread?!? Most complex options....
        } else {
            // Single Spread
            if(option.spreads[0].legs.length > 1) {
                // Simple Spreads, medium complexity
                console.log("Complex Option")
            } else {
                // Single Leg, simple options
                const leg = option.spreads[0].legs[0]
                totalCollateral += (leg.capitalRequirement)
                potentialProfit += (leg.initialPremium * 100)
                expirationDateArray.push(leg.expirationDate)
            }
        }
    })
    nextExpiry =  expirationDateArray.reduce(function (pre, cur) {
        return Date.parse(pre) > Date.parse(cur) ? cur : pre;
    });

    const result = {}
    result.collateral = totalCollateral
    result.numberOpen = openOptions.length
    result.potentialProfit = potentialProfit
    result.nextExpiry = nextExpiry
    return result
}


const calculateTotalBalance = (banking) => {
    let balance = 0
    banking.map(trans => {
        if(trans.type == "Deposit") {
            balance += trans.amount
        }
        else if(trans.type == "Withdrawal") {
            balance -= trans.amount
        }
        else {
            console.error("Banking transaction type " + trans.type + " could not be added to or subtracted from calculateTotalBalance.")
        }
    })
    return balance
}


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
const calculateCostBasisandShares = (input) => {
    //console.log("calc Cost Basis")
    //console.log(input)

    const underlyingTrades = input.underlyingTrades
    let averageCostBasisData = {
        totalSharesEverPurchased: 0,
        totalCostOfAllShares: 0,
        currentShares: 0,
        rawCostBasis: 0,
        totalDividends: 0,
    }

    const tradeReducer = (data, nextTrade) => {
        //console.log("tradeReducer")
        //console.log(data)
        //console.log(nextTrade)
        switch(nextTrade.type) {
            case "Buy":
                return {
                    ...data,
                    totalSharesEverPurchased: data.totalSharesEverPurchased += nextTrade.shares,
                    totalCostOfAllShares: data.totalCostOfAllShares += parseFloat(nextTrade.price * nextTrade.shares),
                    currentShares: data.currentShares += nextTrade.shares
                }
            case "Assigned":
                return {
                    ...data,
                    totalSharesEverPurchased: data.totalSharesEverPurchased += nextTrade.shares,
                    currentShares: data.currentShares += nextTrade.shares
                }
            case "Sell":
                return {
                    ...data,
                    currentShares: data.currentShares -= nextTrade.shares
                    // TODO FIFO, AVG cost basis, etc dealing with SELLS
                }
            case "Called":
                return {
                    ...data,
                    currentShares: data.currentShares -= nextTrade.shares
                    // TODO FIFO, AVG cost basis, etc dealing with CALLS
                }
            case "Dividend":
                return {
                    ...data,
                    totalDividends: data.totalDividends += parseFloat(nextTrade.price * nextTrade.shares)
                    // TODO FIFO, AVG cost basis, etc dealing with DIVS
                }
            default:
                return data
        }
    }

    const averageCostBasis = (data) => {
        return Math.round((data.totalCostOfAllShares / data.totalSharesEverPurchased) * 100) / 100
    }

    underlyingTrades.map(trade => {
        averageCostBasisData = tradeReducer(averageCostBasisData, trade)
    })

    averageCostBasisData.rawCostBasis = averageCostBasis(averageCostBasisData)
    //console.log(averageCostBasisData)

    return averageCostBasisData

    // TODO - handle timeframes, campaigns that include open and closed positions, all time, etc.
}

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
const calculatePriceTarget = (input) => {
    const costBasis = input.rawCostBasis
    const startDate = new Date(input.startDate)
    const targetReturn = input.targetReturn || 0.25
    const targetAroi = (targetReturn/365)
    const today1 = new Date()
    const today2 = new Date()
    const oneWeekTargetDate = today1.setDate(today1.getDate() + 7)
    const oneMonthTargetDate = today2.setDate(today2.getDate() + 30)
    const daysToOneWeek = (oneWeekTargetDate - startDate)/86400000
    const daysToOneMonth = (oneMonthTargetDate - startDate)/86400000

    const calculateTargets = () => {
        return {
            targetPriceWeek: Math.round( ( ( ( targetAroi * daysToOneWeek ) * costBasis ) + costBasis ) * 100 ) / 100,
            targetPriceMonth: Math.round( ( ( ( targetAroi * daysToOneMonth ) * costBasis ) + costBasis ) * 100 ) / 100,
        }
    }
    return calculateTargets()
}

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
const calculateBookedIncome = (input) => {

}

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
const generateTestId = function () {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return 'T' + Math.random().toString(36).substr(2, 9);
};

module.exports = {
    calculateRoi,
    calculateAroi,
    generateTestId,
    calculateOpenOptionsForDashboard,
    calculateTotalBalance,
    calculateCostBasisandShares,
    calculatePriceTarget
}