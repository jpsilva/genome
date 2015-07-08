'use strict';

var cp = require('fs-cp'),
    fs = require('fs'),
    gaze = require('gaze'),
    glob = require('glob'),
    mkdirp = require('mkdirp'),
    path = require('path');

class Genome {
  /**
   * Genome constructor
   */
  constructor () {
    prototypeString(this);
  }

  /**
   * Spawns tasks passed in through command line
   * @return {Promise}
   */
  run () {
    return this.spawn(process.argv.slice(2));
  }

  /**
   * genome task runner
   * @param  {string | [string]} tasks Tasks to perform
   * @return {Promise} Resolves when all tasks are complete
   */
  spawn (tasks) {
    var promises = [],
        all;

    // Accept a string or an array
    if (typeof tasks === 'string') {
      tasks = [tasks];
    }

    tasks.forEach(function(task, index, array) {
      if (this._tasks[task]) {
        console.log(`Doing ${task}...`);

        promises.push(runGenerator(this._tasks[task]));
      } else {
        console.warn(`'${task}' is not a valid task`);
      }
    }.bind(this));

    return Promise.all(promises).then(function() {
      console.log('Done ', tasks.join(', '));
    });

    return all;
  }

  /**
   * Promise wrapper for setTimout
   * Useful for testing, but should not be necessary in production
   * @param  {int} time         Passes to setTimeout()
   * @param  {anything} params  Passes to resolve()
   * @return {promise}
   */
  wait (time, params) {
    return new Promise(function(resolve) {
      setTimeout(function() {
        resolve(params);
      }, time);
    });
  }

  get tasks() {
    return this._tasks;
  }

  set tasks(tasks) {
    this._tasks = tasks;

    for (let taskName in tasks) {
      this[taskName] = this[taskName] || this.spawn.bind(this, taskName);
    }
  }
}

/**
 * Run generator as async function
 * @param  {fn} generatorFunc
 * @return {Promise}
 */
function runGenerator(generatorFunc) {
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
function prototypeString(genome) {
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
          genome.spawn(task);
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

module.exports = new Genome();
