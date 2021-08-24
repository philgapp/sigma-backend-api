"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.processGoogleToken = processGoogleToken;

var _require = require('google-auth-library'),
    OAuth2Client = _require.OAuth2Client;
// TODO ENV VAR!!!


var googleClientID = "536166203532-t30d4mei41eujd50df8e5brk4n0o8rn3.apps.googleusercontent.com";
var client = new OAuth2Client(googleClientID);

function processGoogleToken(token) {
    var ticket, _ticket$getPayload, name, email, picture, result;

    return regeneratorRuntime.async(function processGoogleToken$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    if (!token) {
                        _context.next = 15;
                        break;
                    }

                    _context.prev = 1;
                    _context.next = 4;
                    return regeneratorRuntime.awrap(client.verifyIdToken({
                        idToken: token,
                        audience: googleClientID
                    }));

                case 4:
                    ticket = _context.sent;
                    _ticket$getPayload = ticket.getPayload(), name = _ticket$getPayload.name, email = _ticket$getPayload.email, picture = _ticket$getPayload.picture;
                    result = {};

                    result.name = name;
                    result.email = email;
                    return _context.abrupt("return", result);

                case 12:
                    _context.prev = 12;
                    _context.t0 = _context["catch"](1);

                    console.error(_context.t0);

                case 15:
                case "end":
                    return _context.stop();
            }
        }
    }, null, this, [[1, 12]]);
}

exports.default = processGoogleToken();