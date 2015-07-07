'use strict';

var cp = require('fs-cp'),
    fs = require('fs'),
    gaze = require('gaze'),
    glob = require('glob'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    genome;

/**
 * genome constructor
 * Takes in task object
 * Runs all tasks from command line
 * @param  {object} tasks           All available tasks
 * @param  {boolean} extendString   If true, adds methods and properties to strings. Default = true
 * @return {Promise} Resolves when all tasks are complete
 */
module.exports = genome = function(tasks, extendString) {
  if (extendString === undefined || extendString) {
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
      console.log(`Doing ${task}...`);

      promises.push(spawn(genome.tasks[task]));
    } else {
      console.warn(`'${task}' is not a valid task`);
    }
  });

  return Promise.all(promises).then(function() {
      console.log('Done ', tasks.join(', '));
    });
};

/**
 * Promise wrapper for setTimout
 * @param  {int} time         Passes to setTimeout()
 * @param  {anything} params  Passes to resolve()
 * @return {promise}
 */
genome.wait = function(time, params) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(params);
    }, time);
  });
}

/**
 * Run generator as async function
 * @param  {fn} generatorFunc
 * @return {Promise}
 */
function spawn(generatorFunc) {
  function continuer(verb, arg) {
    var result;
    try {
      result = generator[verb](arg);
    } catch (err) {
      return Promise.reject(err);
    }
    if (result.done) {
      return result.value;
    } else {
      return Promise.resolve(result.value).then(onFulfilled, onRejected);
    }
  }
  var generator = generatorFunc();
  var onFulfilled = continuer.bind(continuer, "next");
  var onRejected = continuer.bind(continuer, "throw");
  return onFulfilled();
}

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
          files = [];

      var promises = filenames.map(function(filename) {
        return filename.contents.then(function(contents) {
          var parsedPath = path.parse(filename);

          if (ext) {
            parsedPath.ext = ext;
          }

          files.push({
            filename: filename,
            path: parsedPath,
            data: filter(contents)
          });
        });
      });

      Promise
        .all(promises)
        .then(function() {
          resolve(files);
        });
    });
  };

  String.prototype.read = function() {
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
  };

  String.prototype.write = function(data) {
    var dest = this;

    if (data.readable) {
      // If stream
      return cp(data, dest);
    } else if (data.splice) {
      // If array of files
      let promises = data.map(function(file) {
        return path.normalize(`${dest}/${file.path.name}${file.path.ext}`).write(file.data);
      });

      return Promise.all(promises);
    } else {
      // If string
      return new Promise(function(resolve, reject) {
        mkdirp.sync(path.dirname(dest));
        fs.writeFile(dest, data, 'utf8', function(err) {
          if (err) {
            reject(err);
            console.log('err ' , err);
          } else {
            resolve(data);
          }
        });
      });
    }
  };

  Object.defineProperty(String.prototype, 'contents', {
    get: function () {
      return this.read();
    },
    set: function(data) {
      this.write(data);
    }
  });
}
