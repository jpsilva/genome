'use strict';

var cp = require('fs-cp'),
    fs = require('fs'),
    gaze = require('gaze'),
    glob = require('glob'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    Q = require('q'),
    genome;

/**
 * genome constructor
 * Takes in task object
 * Runs all tasks from command line
 * @param  {object} tasks           All available tasks
 * @param  {boolean} extendString   If true, adds methods and properties to strings. Default = true
 * @return {Promise} Resolves when all tasks are complete
 */
module.exports = genome = function(tasks, extendString = true) {
  if (extendString) {
    prototypeString();
  }

  genome.tasks = tasks;
  return genome.do(process.argv.slice(2));
}

/**
 * genome task runner
 * @param  {string | [string]} tasks Tasks to perform
 * @return {Promise} Resolves when all tasks are complete
 */
genome.do = function(tasks) {
  var promises = [];

  // Accept a string or an array
  if (typeof tasks === 'string') {
    tasks = [tasks];
  }

  tasks.forEach(function(task, index, array) {
    if (genome.tasks[task]) {
      console.log(`Doing ${task}`);
      promises.push(Q.async(genome.tasks[task])());
    } else {
      console.warn(`'${task}' is not a valid task`);
    }
  });

  return Q.all(promises);
};

// Error handler
Q.onerror = function(err) {
  console.error(err);
};

/**
 * Adds string methods and properties
 */
function prototypeString() {
  /**
   * Watch file(s)
   * @param  {fn, string, [string]} task   Function or task to call when files change
   */
  String.prototype.onChange = function(task) {
    var filename = this;
    console.log(`Watching ${filename}...`);

    gaze(filename, function(err, watcher) {
      if (err) {
        return console.error(err);
      }

      this.on('all', function(event, whichFile) {
        console.log(`${whichFile} was ${event}`);

        if (typeof task === 'function') {
          task(whichFile);
        } else {
          genome.do(task);
        }
      });
    });
  };

  /**
   * Process glob string, passing file contents into filter
   * @param  {fn} filter    File contents get passed into this
   * @param  {string} ext   Optional, change the extension of the file for output
   * @return {Promise}
   */
  String.prototype.use = function(filter, ext) {
    var globPath = this;

    return new Promise(function(resolve) {
      var filenames = glob.sync(globPath),
          files = [],
          promises = [];

      filenames.forEach(function(filename) {
        promises.push(Q.async(function* () {
          var parsedPath = path.parse(filename);

          if (ext) {
            parsedPath.ext = ext;
          }

          files.push({
            filename: filename,
            path: parsedPath,
            data: filter(yield filename.contents)
          });
        })());
      });

      Q.all(promises)
        .then(function() {
          resolve(files);
        });
    });
  };

  Object.defineProperty(String.prototype, 'contents', {
    get: function () {
      var filename = this;

      return new Promise(function(resolve, reject) {
        fs.readFile(filename, 'utf8', function(err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    },
    set: function(data) {
      var dest = this;

      return new Promise(function(resolve, reject) {
        if (data.readable) {
          // If stream
          cp(data, dest).then(function() {
            resolve();
          });
        } else if (data.splice) {
          // If array
          data.forEach(function(file) {
            path.normalize(`${dest}/${file.path.name}${file.path.ext}`).contents = file.data;
          });
        } else {
          // If string
          mkdirp.sync(path.dirname(dest));
          fs.writeFile(dest, data, 'utf8', function(err) {
            if (err) {
              reject(err);
              console.log('err ' , err);
            } else {
              resolve(data);
            }
          });
        }
      });
    }
  });
}