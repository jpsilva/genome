'use strict'; // Required to use classes

var browserify = require('browserify'),
    browserSync = require('browser-sync').create(),
    del = require('del'),
    genome = require('genome'),
    slm = require('slm'),
    stylus = require('stylus'),
    paths = {
      server: {
        root: 'dist'
      },
      html: {
        src: 'app/index.slm',
        dest: 'dist/index.html'
      },
      robots: {
        src: 'app/robots.txt',
        dest: 'dist/robots.txt'
      },
      scripts: {
        src: 'app/scripts/app.js',
        dest: 'dist/scripts/app.js'
      },
      styles: {
        src: 'app/styles/*.styl',
        dest: 'dist/styles/'
      }
    };

module.exports = class {
  *clean () {
    // Use plain JS
    del.sync(paths.server.root);
  }

  *robots () {
    // Copy one file to another
    paths.robots.dest.contents = yield paths.robots.src.contents;
  }

  *html () {
    // Process one file and output it
    paths.html.dest.contents = slm.render(yield paths.html.src.contents);
  }

  *scripts () {
    // Output stream to file
    return paths.scripts.dest.write(browserify(paths.scripts.src, { transform: 'babelify' }).bundle());
  }

  *styles () {
    // Output multiple files to directory
    // yield paths.styles.dest.contents = yield paths.styles.src.use(stylus.render, '.css');
    return paths.styles.dest.write(yield paths.styles.src.use(stylus.render, '.css'));
  }

  *watch () {
    yield genome.do('build');
    // genome.do('serve');

    // Watch files for changes with .onChange
    'app/**/*.slm'.onChange('html');
    'app/scripts/**/*.js'.onChange('scripts');
    'app/styles/**/*.styl'.onChange('styles');
    'dist/**/*'.onChange(browserSync.reload);
  }

  *build () {
    // Run tasks in serial with yield statement
    yield genome.do('clean');
    yield genome.do(['html', 'robots', 'scripts', 'styles']);
  }

  *serve () {
    browserSync.init({server: paths.server.root});
  }

  *short () {
    yield genome.wait(1000);
    console.log('3rd');
  }

  *medium () {
    yield genome.wait(1000);
    yield genome.wait(1000);
    yield genome.wait(1000);
    console.log('2nd');
  }

  *long () {
    console.log(yield genome.wait(2500, '1st'));
  }

  *async() {
    yield genome.do(['long']);
    yield genome.do(['medium']);
    genome.do('short');
  }
};
