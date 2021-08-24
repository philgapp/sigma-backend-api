"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var prepare = exports.prepare = function prepare(o) {
    o._id = o._id.toString();
    return o;
};