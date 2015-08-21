"use strict";

var assert = require("assert"),
    fs = require("fs"),
    os = require("os"),
    path = require("path");

var clone = require("clone"),
    output = require("swfr").outputAsync,
    Promise = require("bluebird"),
    rimraf = require("rimraf"),
    shell = require("swfr").shell,
    tmp = require("tmp"),
    uriJoin = require("uri-join"),
    _ = require("underscore");

var vsiCurlify = require("../vsiCurlify");

Promise.promisifyAll(tmp);
rimraf = Promise.promisify(rimraf);
shell = Promise.promisify(shell);

module.exports = function resampleToPng(inputPath, targets, options, done) {
  inputPath = vsiCurlify(inputPath);

  return Promise
    .resolve(undefined)
    .then(function() {
      // Keep the directory, we will clean it up manually.
      var tmpOptions = { };
      if (process.env.TMP_DIRECTORY) { 
        tmpOptions.dir = process.env.TMP_DIRECTORY; 
      }

      return tmp.dirAsync(tmpOptions);
    })
    .spread(function(localWorkingDir, cleanupCallback) {
      return Promise
        .resolve(targets)
        .map(function(target) {
          var resampleOutputPath = uriJoin(localWorkingDir, "resampled.tiff");

          var args = [
            "-q",
            "-te", target.extent[0], target.extent[1], target.extent[2], target.extent[3],
            "-ts", "256", "256",
            "-wm", 256, // allow GDAL to work with larger chunks (diminishing returns after 500MB, supposedly)
            "-wo", "NUM_THREADS=ALL_CPUS",
            "-multi",
            "-co", "tiled=yes",
            "-r", "bilinear"
          ];

          if(!options.nocompression) {
            args = args.concat([
              "-co", "compress=lzw",
              "-co", "predictor=2"
            ]);
          }

          if (options.overwrite) {
            args.push("-overwrite");
          }

          args = args.concat([
            inputPath,
            resampleOutputPath
          ]);

          var env = clone(process.env);

          env.GDAL_CACHEMAX = 256;
          env.GDAL_DISABLE_READDIR_ON_OPEN = true;
          env.CHECK_WITH_INVERT_PROJ = true; // handle -180/180, 90/-90 correctly

          var shellOptions = {
            env: env,
            timeout: 10 * 60e3 // 10 minutes
          };

          return shell("gdalwarp", args, shellOptions)
            .then(function(stdout, stderr) {
              var localOutputPath = uriJoin(localWorkingDir, "result.png");

              var args = ["-of", "PNG"];

              if (options.bands) {
                var len = options.bands.length;
                for (var i = 0; i < len; i++) {
                  args = args.concat(["-b", "" + options.bands[i]]);
                }
              }

              if ("nodata" in options) {
                args = args.concat(["-a_nodata", options.nodata]);
              }

              args = args.concat([
                resampleOutputPath,
                localOutputPath
              ]);

              return shell("gdal_translate", args, shellOptions)
                .then(function(stdout, stderr) {
                  console.log("Done with one.");
                  return localOutputPath;
                });
            })
            .then(function(localOutputPath) {
              var pngOutputs = [localOutputPath, target.output];
              var xmlOutputs = _.map(pngOutputs, function(x) { return x + ".aux.xml"; });
              return [ pngOutputs, xmlOutputs ];
            });
        }, { concurrency: options.concurrency || os.cpus().length })
        .then(function(results) { 
          return _.flatten(results, true);
        })
        .map(function(sourceAndDest) {
          console.log("Uploading %s", sourceAndDest[1]);
          return output(sourceAndDest[0], sourceAndDest[1]);
        }, { concurrency: options.concurrency || os.cpus().length })
        .catch(function(err) {
          return done(err);
        })
        .finally(function() {
          console.log("CLEANING UP TMP DIRECTORY - %s", localWorkingDir);
          return rimraf(localWorkingDir);
        })
        .then(function() {
          done(null, { success: true });
        });
    });


  // try {
  //   assert.ok(Array.isArray(options.targetExtent), "resampleToPng: targetExtent must be an array");
  //   assert.equal(4, options.targetExtent.length, "resampleToPng: targetExtent must be an array of 4 elements");
  //   assert.ok(Array.isArray(options.targetResolution), "resampleToPng: targetResolution must be an array");
  //   assert.equal(2, options.targetResolution.length, "resampleToPng: targetResolution must be an array of 2 elements");
  // } catch (err) {
  //   return done(err);
  // }

  // var outputs = [outputUri, outputUri + ".aux.xml"];

  // return output(outputs, done, function(err, localWorkingDir, done) {
  //   if (err) {
  //     return done(err);
  //   }

  //   var resampleOutputPath = uriJoin(localWorkingDir, "resampled.tiff");

  //   var args = [
  //     "-q",
  //     "-te", options.targetExtent[0], options.targetExtent[1], options.targetExtent[2], options.targetExtent[3],
  //     "-ts", "256", "256",
  //     "-wm", 256, // allow GDAL to work with larger chunks (diminishing returns after 500MB, supposedly)
  //     "-wo", "NUM_THREADS=ALL_CPUS",
  //     "-multi",
  //     "-co", "tiled=yes",
  //     "-r", "bilinear"
  //   ];

  //   if(!options.nocompression) {
  //     args = args.concat([
  //       "-co", "compress=lzw",
  //       "-co", "predictor=2"
  //     ]);
  //   }

  //   if (options.overwrite) {
  //     args.push("-overwrite");
  //   }

  //   args = args.concat([
  //     inputPath,
  //     resampleOutputPath
  //   ]);

  //   var env = clone(process.env);

  //   env.GDAL_CACHEMAX = 256;
  //   env.GDAL_DISABLE_READDIR_ON_OPEN = true;
  //   env.CHECK_WITH_INVERT_PROJ = true; // handle -180/180, 90/-90 correctly

  //   return shell("gdalwarp", args, {
  //     env: env,
  //     timeout: 10 * 60e3 // 10 minutes
  //   }, function(err) {
  //     if (err) {
  //       return done.apply(null, arguments);
  //     }

  //     var localOutputPath = uriJoin(localWorkingDir, "result.png");

  //     var args = ["-of", "PNG"];

  //     if (options.bands) {
  //       var len = options.bands.length;
  //       for (var i = 0; i < len; i++) {
  //         args = args.concat(["-b", "" + options.bands[i]]);
  //       }
  //     }

  //     if ("nodata" in options) {
  //       args = args.concat(["-a_nodata", options.nodata]);
  //     }

  //     args = args.concat([
  //       resampleOutputPath,
  //       localOutputPath
  //     ]);

  //     var env = clone(process.env);

  //     env.GDAL_CACHEMAX = 256;
  //     env.GDAL_DISABLE_READDIR_ON_OPEN = true;
  //     env.CHECK_WITH_INVERT_PROJ = true; // handle -180/180, 90/-90 correctly

  //     return shell("gdal_translate", args, {
  //       env: env,
  //       timeout: 10 * 60e3 // 10 minutes
  //     }, function(err) {
  //       if (err) {
  //         return done.apply(null, arguments);
  //       }

  //       var localOutputs = [
  //         localOutputPath,
  //         localOutputPath + ".aux.xml"
  //       ];

  //       return done(null, localOutputs);
  //     });
  //   });
  // });
};

module.exports.version = "1.3";
