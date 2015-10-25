'use strict';
'use nodent-es7';

var cp = require('fs-cp'),
    fs = require('mz/fs'),
    gaze = require('gaze'),
    glob = require('glob'),
    mkdirp = require('mkdirp'),
    parseGlob = require('parse-glob'),
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
   * @param {string | array} defaultTask Optional. If present and no tasks were called form the command line, run this task.
   * @return {Promise}
   */
  run (defaultTask) {
    var commands = process.argv.slice(2);
    if (commands.length) {
      return this.spawn(commands);
    } else if (defaultTask) {
      return this.spawn(defaultTask);
    }
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

        promises.push(runGenerator(this._tasks[task].bind(this._tasks)));
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
      console.error('err ' , err);
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
    var filepath = this;
    console.log(`Watching ${filepath}...`);

    gaze(filepath, function(err, watcher) {
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

  // /**
  //  * Process glob string, passing file contents into filter
  //  * @param  {fn} filter    File contents get passed into this
  //  * @param  {string} ext   Optional, change the extension of the file for output
  //  * @return {Promise}
  //  */
  // String.prototype.use = function(filter, ext) {
  //   var globPath = this;

  //   return new Promise(function(resolve) {
  //     var filepaths = glob.sync(globPath),
  //         files = [];

  //     var promises = filepaths.map(function(filepath) {
  //       return filepath.contents.then(function(contents) {
  //         var parsedPath = path.parse(filepath);

  //         if (ext) {
  //           parsedPath.ext = ext;
  //         }

  //         files.push({
  //           filepath: filepath,
  //           path: parsedPath,
  //           data: filter(contents)
  //         });
  //       });
  //     });

  //     Promise
  //       .all(promises)
  //       .then(function() {
  //         resolve(files);
  //       });
  //   });
  // };

  String.prototype.read = function() {
    return fs.readFile(this, 'utf8');
  };

  String.prototype.write = function(data) {
    var dest = this;

    if (typeof data.then === 'function') {
      // If promise, write after resolve
      data.then(function(resolvedData) {
        dest.write(resolvedData);
      });
    } else if (data.readable) {
      // If stream
      return cp(data, dest);
    } else if (data.splice) {
      // If array of files
      let promises = data.map(function(file) {
        return path.normalize(`${dest}/${file.path.dir}/${file.path.name}${file.path.ext}`).write(file.data);
      });

      return Promise.all(promises);
    } else {
      // If string
      mkdirp.sync(path.dirname(dest));
      return fs.writeFile(dest, data, 'utf8');
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

  Object.defineProperty(String.prototype, 'filepaths', {
    get: function () {
      var pattern = this,
          parsedGlob = parseGlob(pattern),
          files;

      return new Promise(function(resolve, reject) {
        glob(pattern, function(err, filepaths) {
          if (err) {
            console.error('err ' , err);
            reject(err);
          } else {
            files = filepaths.map(function(filepath) {
              return {
                full: filepath,
                relative: path.relative(parsedGlob.base, filepath)
              };
            });

            resolve(files);
          }
        })
      });
    }
  });

  Object.defineProperty(String.prototype, 'file', {
    get: function () {
      return {
        filepath: this,
        path: path.parse(this),
        data: this.read()
      };
    }
  });

  Object.defineProperty(String.prototype, 'files', {
    get: function* () {
      var paths = yield this.filepaths;

      var files = yield Promise.all(paths.map(function(filepath) {
        return filepath.full.read().then(function(contents) {
          return {
            filepath: filepath.full,
            path: path.parse(filepath.relative),
            data: contents
          };
        });
      }));

      return files;
    }
  });
}

module.exports = new Genome();
