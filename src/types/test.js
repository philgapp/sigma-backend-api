module.exports = `
      type Query {
        getSession: String
        getSessionUser(session: String!): User
        login(input: LoginInput!): User
        destroySession(session: String!): String
        getDashboard(_id: ID): Dashboard
        getOptions(input: OptionQueryInput): [Option]
        getUnderlying(input: UnderlyingQueryInput): [Underlying]
        getBanking(input: BankingQueryInput): [Banking]
        user(_id: ID): User
        users: [User]
        option(_id: String): Option
        spread(_id: String): Spread
        spreads: [Spread]
        leg(_id: String): Leg
        legs: [Leg]
      }
      type User {
        _id: ID
        firstName: String
        lastName: String
        email: String
        authType: AuthType
        password: String
      }
      type Dashboard {
        user: ID!
        balance: Float!
        aroi: Float!
        bookedIncome: Float!
        chart: Chart!
        options: OptionDashboard!
        underlying: UnderlyingDashboard!
      }
      type Chart {
        cash: Float!
        options: Float!
        underlying: Float!
      }
      type OptionDashboard {
        numberOpen: Int!
        potentialProfit: Float!
        nextExpiry: Date!
      }
      type UnderlyingDashboard {
        numberOpen: Int!
        symbols: [SymbolDashboard] 
      }
      type SymbolDashboard  {
        symbol: String!
        qty: Int!
        targetPrice: Float!
      }
      type Underlying {
        _id: ID
        userId: ID
        symbol: String
        currentShares: Float
        rawCostBasis: Float
        adjustedCostBasis: Float
        minimumCostBasis: Float
        targetPriceWeek: Float
        targetPriceMonth: Float
        startDate: Date
        endDate: Date
        underlyingTrades: [UnderlyingTrade]
      }
      type UnderlyingTrade {
        _id: ID
        type: UnderlyingTradeType
        tradeDate: Date
        shares: Float
        price: Float
      }
      type Banking {
        _id: ID
        userId: ID
        amount: Float
        type: String
        date: Date
      }
      input UnderlyingQueryInput {
        userId: ID
        open: Boolean
      }
      input BankingQueryInput {
        userId: ID
        open: Boolean
      }
      input UnderlyingInput {
        _id: ID 
        userId: ID
        symbol: String
        startDate: Date
        endDate: Date
        underlyingTrades: [UnderlyingTradeInput]
      }
      input UnderlyingTradeInput {
        type: UnderlyingTradeType
        tradeDate: Date
        shares: Float
        price: Float
      }
      input LoginInput {
        username: String!
        password: String!
      }
      input GoogleAuth {
        token: String!
      }
      input UserInput {
        _id: ID
        firstName: String
        lastName: String
        email: String
        authType: AuthType
        password: String
      }
      input BankingInput {
        userId: ID
        amount: Float
        type: String
        date: Date
      }
      type Mutation {
        upsertUser(input: UserInput!): User
        processGoogleAuth(input: GoogleAuth!): User 
        createOption(input: OptionInput!): Option
        createBanking(input: BankingInput!): Banking
        createUnderlying(input: UnderlyingInput!): Underlying
        createUnderlyingTrade(input: UnderlyingTradeInput!): Underlying
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
        Buy
        Sell
        Assigned
        Called
        Dividend
      }
      schema {
        query: Query
        mutation: Mutation
      }
`