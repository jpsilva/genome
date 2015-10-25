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
var genome = require('genome');

genome.tasks = {
  // Tasks go here
};

// Run tasks passed in from command line
genome.run();
```

### Create tasks
Tasks in genome are generator functions. Task names may include colons (:) and/or hyphens (-).

```javascript
* sayhi() {
  console.log('Hello, world');
},

* 'say-something-else'() {
  console.log('Something else');
},

* 'say:goodbye'() {
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

Run a task from within another task using `genome.spawn()`.

```javascript
* speak() {
  genome.spawn('sayhi');

  // Or use genome's shorthand methods:
  genome.sayhi();
}
```

`genome.spawn()` accepts strings and arrays. Arrays of tasks will be run asyncronously.

```javascript
* speak1() {
  genome.spawn(['sayhi', 'say-something-else', 'say:goodbye']);
},

// Is the same as:

* speak2() {
  genome.spawn('sayhi');
  genome.spawn('say-something-else');
  genome.spawn('say:goodbye');
}
```

If you need tasks to run in a certain order, add the yield statement before calling `genome.spawn()`.

```javascript
* speak2() {
  yield genome.spawn('sayhi');
  yield genome.spawn('say-something-else');
  genome.spawn('say:goodbye');
}
```

### Read/write files
Genome adds `read()` and `write()` methods to strings to make reading and writing files as easy as:

```javascript
return 'dist/html.index'.write(yield 'app/html.index'.read());
```

Genome also adds a `.contents` property as a read/write shorthand, so the same code can be written as:

```javascript
'dist/html.index'.contents = yield 'app/html.index'.contents;
```

Not that `read()`, `write()` and the `.contents` *getter* all return promises, but the `.contents` *setter*
does not return anything. So if you need the file to be written *before* something else happens, use `write()`.

`.write()` accepts strings, promises, streams and arrays of file objects.

### Processing files
Genome does not require plugins like gulp or grunt. Simply install standard node packages and use their
build-in api.

```javascript
* html() {
  // Process one file and output it
  var slm = require('slm');

  return 'dist/index.html'.write(slm.render(yield 'app/index.slm'.contents));
},

* scripts() {
  // Output stream to file
  var browserify = require('browserify');

  return 'dist/scripts/app.js'.write(browserify('app/scripts/app.js', { transform: 'babelify' }).bundle());
},

* styles() {
  // Output multiple files to directory with the String.prototype.use method
  var stylus = require('stylus');

  return 'dist/styles/'.write(yield 'app/styles/*.styl'.use(stylus.render, '.css'));
}
```

### Watch files
Watch files for changes with String.prototype.onChange, passing in a function or a task name or array of task names.

```javascript
* watch() {
  'app/**/*.slm'.onChange('html');
  'app/scripts/**/*.js'.onChange('scripts');
  'app/styles/**/*.styl'.onChange('styles');
  'dist/**/*'.onChange(browserSync.reload);
}
```

## Project Goals
- Never require speciallized plugins like Gulp and Grunt
- Keep code as simple and natural as possible
