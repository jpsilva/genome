'use strict';

import chalk from 'chalk';
// import co from 'co';
import fs from 'mz/fs';
import gaze from 'gaze';
import glob from 'glob';
import mkdirp from 'mkdirp';
import parseGlob from 'parse-glob';
import path from 'path';

class Genome {
  constructor(tasks) {
    // Wrap passed task generator functions in co() and add to this
    Object.keys(tasks).forEach((key) => {
      var originalFunction = tasks[key];

      tasks[key].do = async function(...args) {
        try {
          await originalFunction.apply(tasks, args);
        } catch (err) {
          logError(err, key);
        }
      };

      /**
       * Shortcut for files(...).foreach(task)
       * @param string (glob pattern)
       */
      tasks[key].for = (pathglob) => {
        return files(pathglob).forEach(tasks[key]);
      };

      /**
       * Shortcut for files(...).onAdd(task) and files(...).onChange(task)
       * @param string (glob pattern)
       */
      tasks[key].when = (pathglob) => {
        var theseFiles = files(pathglob);

        return {
          added() {
            theseFiles.onAdd(tasks[key]);
            return this;
          },

          changed() {
            theseFiles.onChange(tasks[key]);
            return this;
          },

          deleted() {
            theseFiles.onDelete(tasks[key]);
            return this;
          }
        }
      };
    });

    setTimeout(this._run.bind(this, tasks), 0);
  }

  async _run(tasks) {
    try {
      var commands = process.argv.slice(2);
      if (commands.length) {
        commands.forEach((command) => {
          if (typeof tasks[command] === 'function') {
            tasks[command]();
          }
        });
      } else if (tasks.default) {
        await tasks.default.call(tasks);
      }
    } catch (err) {
      logError(err);
    }
  }
}

class File {
  constructor({ filepath, relativePath }) {
    var pathParts = path.parse(filepath);

    this.path = filepath;
    this.dir = pathParts.dir;
    this.base = pathParts.base;
    this.ext = pathParts.ext;
    this.name = pathParts.name;

    this.relativePath = relativePath;

    this.read = this.read.bind(this);
    this.write = this.write.bind(this);
  }

  read() {
    return fs.readFile(this.path, 'utf8');
  }

  write(contents) {
    mkdirp.sync(path.dirname(this.path));
    if (contents.pipe) {
      // If stream
      contents.on('error', logError).pipe(fs.createWriteStream(this.path));
    } else {
      // If string
      return fs.writeFile(this.path, contents, 'utf8');
    }
  }
}

class Files {
  constructor(path) {
    this.path = path;
    this.base = parseGlob(path).base;

    this.forEach = this.forEach.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  async forEach(task) {
    await new Promise((resolve, reject) => {
      glob(this.path, (err, filepaths) => {
        if (err) {
          logError(err);
          reject(err);
        } else {
          Promise.all(filepaths.map(async (filepath) => {
            var relativePath = path.relative(this.base, filepath);
            var file = new File({ filepath, relativePath });
            await task.do(file);
          })).then(resolve);
        }
      })
    });
  }

  onAdd(task) {
    gaze(this.path, (err, watcher) => {
      if (err) {
        logError(err);
      } else {
        watcher.on('added', (filepath) => {
          var relativePath = path.relative(this.base, filepath);
          var file = new File({ filepath, relativePath });

          console.log(chalk.blue(`${filepath} was added.`));
          task.do(file);
        });
      }
    });
  }

  onChange(task) {
    gaze(this.path, (err, watcher) => {
      if (err) {
        logError(err);
      } else {
        watcher.on('changed', (filepath) => {
          var relativePath = path.relative(this.base, filepath);
          var file = new File({ filepath, relativePath });

          console.log(chalk.blue(`${filepath} was changed.`));
          task.do(file);
        });
      }
    });
  }

  onDelete(task) {
    gaze(this.path, (err, watcher) => {
      if (err) {
        logError(err);
      } else {
        watcher.on('deleted', (filepath) => {
          var relativePath = path.relative(this.base, filepath);
          var file = new File({ filepath, relativePath });

          console.log(chalk.blue(`${filepath} was deleted.`));
          task.do(file);
        });
      }
    });
  }
}

function genome(tasks) {
  return new Genome(tasks);
}

function file(filepath) {
  return new File({ filepath });
}

function files(pathglob) {
  return new Files(pathglob);
}

function all(...promises) {
  return Promise.all(promises);
}

function logError(err) {
  if (err, taskName) {
    console.error(chalk.red(`Error while running${ taskName || ''}:`), err);
  }
}

module.exports = { Genome, genome, file, files, all };
