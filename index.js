"use strict";

var path = require("path");

var swfr = require("swfr");

module.exports = swfr.activities(path.join(__dirname, "lib", "activities"));
