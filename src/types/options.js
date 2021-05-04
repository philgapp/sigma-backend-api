module.exports = `
    type Option {
        _id: ID!
        userId: ID!
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
      input OptionQueryInput {
        userId: ID
        open: Boolean
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
`
