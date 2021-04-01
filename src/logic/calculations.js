// Returns ROI as percentage to 2 decimals given input.profit and input.capital
const calculateROI = (input) => {
    if(!input) return
    const rawRoi = input.profit / input.capital
    const roi = (rawRoi * 100).toFixed(2)
    return roi
}

// Returns AROI as percentage to 2 decimals given input.roi, input.startdate and input.enddate
const calculateAROI = (input) => {
    if(!input) return
    const days = input.endDate - input.startDate
    const rawDailyRoi = input.roi / days
    const rawAroi = rawDailyRoi * 365
    const aroi = rawAroi.toFixed(2)
    return aroi
}

// Returns price target to 2 decimals given
const calculatePriceTarget = (input) => {

}