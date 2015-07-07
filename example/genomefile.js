'use strict';

var browserify = require('browserify'),
    browserSync = require('browser-sync'),
    del = require('del'),
    genome = require('genome'),
    stylus = require('stylus'),
    paths = {
      server: {
        root: 'dist'
      },
      styles: {
        src: 'app/styles/*.styl',
        dest: 'dist/styles/'
      },
      scripts: {
        src: 'app/scripts/app.js',
        dest: 'dist/scripts/app.js'
      }
    };

module.exports = class {
  *clean () {
    del.sync(paths.server.root);
  }

  *scripts () {
    paths.scripts.dest.contents = browserify(paths.scripts.src, { transform: 'babelify' }).bundle();
  }

  *styles () {
    // Multiple files
    paths.styles.dest.contents = yield paths.styles.src.use(stylus.render, '.css');
  }

  *'styles:screen' () {
    // One file
    'dist/styles/screen.css'.contents = stylus.render(yield 'app/styles/screen.styl'.contents);
  }

  *watch () {
    yield genome.do('build');

    paths.scripts.src.onChange('scripts');
    paths.styles.src.onChange('styles');
  }

  *build () {
    yield genome.do('clean');
    genome.do(['styles', 'scripts']);
  }

  *serve () {
    browserSync({server: paths.server.root});
  }
};
