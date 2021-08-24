'use strict';

require('babel-core/register');

require('babel-polyfill');

var _server = require('./server');

(0, _server.start)();