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
 * @param  {[string]} tasks All available tasks
 * @return {Promise} Resolves when all tasks are complete
 */
module.exports = genome = function(tasks) {
  prototypeString();
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

function prototypeString() {
  // String prototyping
  String.prototype.onChange = function(task) {
    var filename = this;
    console.log(`Watching ${filename}...`);

    gaze(filename, function(err, watcher) {
      this.on('all', function(event, filepath) {
        console.log(`${filepath} ${event}`);
        genome.do(task);
      });
    });
  };

  /**
   * [use description]
   * @param  {string} filter [description]
   * @param  {string} ext    [description]
   * @return {Promise}       [description]
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

  Object.defineProperty(String.prototype, 'filenames', {
    get: function () {
      return glob(this);
    }
  });
}