'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.start = undefined;

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _cors = require('cors');

var _cors2 = _interopRequireDefault(_cors);

var _mongodb = require('mongodb');

var _graphqlTools = require('graphql-tools');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('dotenv').config();

var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);

var _require = require('express-graphql'),
    graphqlHTTP = _require.graphqlHTTP;

var _require2 = require('@graphql-tools/merge'),
    mergeResolvers = _require2.mergeResolvers;

var optionGQL = require('./types/options');
var testGQL = require('./types/test');
var typeDefs = [optionGQL, testGQL];

var allQueries = require('./queries/allQueries');
var oldResolvers = require('./mutations/allMutations');
var resolversToMerge = [oldResolvers, allQueries];
var resolvers = mergeResolvers(resolversToMerge);

var start = exports.start = function _callee2() {
    var db, app, corsOptions, store, schema, root;
    return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) {
            switch (_context2.prev = _context2.next) {
                case 0:
                    _context2.prev = 0;
                    _context2.next = 3;
                    return regeneratorRuntime.awrap(_mongodb.MongoClient.connect(encodeURI(process.env.MONGO_URL)));

                case 3:
                    db = _context2.sent;
                    app = (0, _express2.default)();


                    app.use(_bodyParser2.default.json());

                    // In case Node is running behind Nginx or similar proxy...
                    app.set('trust proxy', 1);

                    corsOptions = {
                        credentials: true,
                        origin: process.env.FRONTEND_URL
                    };

                    app.use((0, _cors2.default)(corsOptions));

                    store = new MongoDBStore({
                        uri: encodeURI(process.env.MONGO_URL),
                        collection: 'sessions'
                    });

                    // Catch errors

                    store.on('error', function (error) {
                        console.error(error);
                    });

                    app.use(session({
                        secret: process.env.STORE_SECRET,
                        name: process.env.COOKIE_NAME,
                        cookie: {
                            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
                            sameSite: false, // this may need to be false if you are accessing from another app
                            httpOnly: true, // this must be false if you want to access the cookie
                            secure: false //TODO true for HTTPS later...
                        },
                        store: store,
                        // Boilerplate options, see:
                        // * https://www.npmjs.com/package/express-session#resave
                        // * https://www.npmjs.com/package/express-session#saveuninitialized
                        resave: false,
                        saveUninitialized: false,
                        unset: 'destroy'
                    }));

                    schema = (0, _graphqlTools.makeExecutableSchema)({
                        typeDefs: typeDefs,
                        resolvers: resolvers
                    });
                    root = {};


                    app.use('/graphql', _bodyParser2.default.json(), graphqlHTTP(function _callee(req) {
                        return regeneratorRuntime.async(function _callee$(_context) {
                            while (1) {
                                switch (_context.prev = _context.next) {
                                    case 0:
                                        return _context.abrupt('return', {
                                            schema: schema,
                                            rootValue: root,
                                            context: {
                                                req: req,
                                                session: req.session,
                                                Users: db.collection('users'),
                                                Sessions: db.collection('sessions'),
                                                Dashboards: db.collection('dashboards'),
                                                Options: db.collection('options'),
                                                Underlying: db.collection('underlying'),
                                                Banking: db.collection('banking')
                                            },
                                            graphiql: true
                                        });

                                    case 1:
                                    case 'end':
                                        return _context.stop();
                                }
                            }
                        }, null, undefined);
                    }));

                    app.listen(process.env.PORT);
                    console.log('Sigma GraphQL Backend API running on PORT ' + process.env.PORT);

                    _context2.next = 22;
                    break;

                case 19:
                    _context2.prev = 19;
                    _context2.t0 = _context2['catch'](0);

                    // TODO better error handling!
                    console.log(_context2.t0);

                case 22:
                case 'end':
                    return _context2.stop();
            }
        }
    }, null, undefined, [[0, 19]]);
};