"use strict";

var path = require("path"),
    util = require("util");

var url = require("url"),
    _ = require("underscore");

// Turns a gdal input URI into a vsicurl URI if it's an s3 or http URI.
module.exports = function vsiCurlify(uri) {
  var parsed = url.parse(uri);
  if(parsed.protocol == "http:") {
    return "/vsicurl/" + uri;
  }

  if(parsed.protocol == "s3:") {
    return util.format("/vsicurl/http://%s.s3.amazonaws.com%s", parsed.hostname, parsed.path);
  }

  return uri;
};
