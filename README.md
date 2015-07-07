# genome

Simple build system using ES6 classes, generators, and promises

## Installation
genome requires io.js or node.js with harmony flags.

```
npm i -g genome
npm i -save-dev genome
```

## Usage
Create a `genomefile.js` in your project's root directory.

```javascript
'use strict'; // Required to use classes

var genome = require('genome');

module.exports = class {
  // Tasks go here
}
```

### Create tasks
Tasks in genome are generator functions. Task names may include colons (:) and/or hyphens (-).

```javascript
*sayhi () {
  console.log('Hello, world');
}

*'say-something-else' () {
  console.log('Something else');
}

*'say:goodbye' () {
  console.log('See ya later');
}
```

### Run tasks
In your command line, run:

```
genome sayhi
```

genome commands may accept multiple tasks to run asyncronously:

```
genome sayhi say-something-else say:goodbye
```

Run a task from within another task using `genome.do()`.

```javascript
*speak () {
  genome.do('sayhi');
}
```

`genome.do()` accepts strings and arrays. Arrays of tasks will be run asyncronously.

```javascript
*speak1 () {
  genome.do(['sayhi', 'say-something-else', 'say:goodbye']);
}

// Is the same as:

*speak2 () {
  genome.do('sayhi');
  genome.do('say-something-else');
  genome.do('say:goodbye');
}
```

If you need tasks to run in a certain order, add the yield statement before calling `genome.do()`.

```javascript
*speak2 () {
  yield genome.do('sayhi');
  yield genome.do('say-something-else');
  genome.do('say:goodbye');
}
```

### Read/write files
Genomen adds a `.contents` property to strings to make reading and writing files as easy as:

```javascript
'dist/html.index'.contents = yield 'app/html.index'.contents;
```

Genome does not require plugins like gulp or grunt. Simply install standard node packages and use their
build-in api.

```javascript
*html () {
  // Process one file and output it
  var slm = require('slm');

  yield 'dist/index.html'.contents = slm.render(yield 'app/index.slm'.contents);
  browserSync.reload(paths.html.dest);
}

*scripts () {
  // Output stream to file
  var browserify = require('browserify');

  yield 'dist/scripts/app.js'.contents = browserify('app/scripts/app.js', { transform: 'babelify' }).bundle();
  browserSync.reload(paths.scripts.dest);
}

*styles () {
  // Output multiple files to directory with the String.prototype.use method
  var stylus = require('stylus');

  yield 'dist/styles/'.contents = yield 'app/styles/*.styl'.use(stylus.render, '.css');
  browserSync.reload(paths.styles.dest);
}
```

### Watch files
Watch files for changes with String.prototype.onChange, passing in a function or a task name or array of task names.

```javascript
*watch () {
  'app/**/*.slm'.onChange('html');
  'app/scripts/**/*.js'.onChange('scripts');
  'app/styles/**/*.styl'.onChange('styles');
  'dist/**/*'.onChange(browserSync.reload);
}
```