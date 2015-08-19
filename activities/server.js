"use strict";

var os = require("os"),
    path = require("path");

var async = require("async"),
    env = require("require-env");

var activities = require("./index"),
    activity = require("swfr").activity;

async.times(os.cpus().length, function(i) {
  return activity({
    domain: env.require("OAM_SWF_DOMAIN"),
    taskList: env.require("OAM_SWF_ACTIVITY_TASKLIST"),
    activities: activities,
    workerId: i
  });
}, function(err, workers) {
  if (err) {
    throw err;
  }

  process.on("SIGTERM", function() {
    return workers.forEach(function(w) {
      return w.cancel();
    });
  });
});
