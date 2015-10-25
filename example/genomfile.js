'use strict';
'use nodent-es7';

var browserify = require('browserify'),
    browserSync = require('browser-sync').create(),
    co = require('co'),
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
        src: 'app/styles/screen.styl',
        include: 'app/styles/',
        dest: 'dist/styles/screen.css'
      }
    };

genome.tasks = {
  * clean() {
    // Use plain JS
    del.sync(paths.server.root);
  },

  * robots() {
    // Copy one file to another
    return paths.robots.dest.write(yield paths.robots.src.contents);
  },

  * html() {
    // Process one file and output it
    return paths.html.dest.write(slm.render(yield paths.html.src.contents));
  },

  * scripts() {
    // Output stream to file
    return paths.scripts.dest.write(browserify(paths.scripts.src, { transform: 'babelify' }).bundle());
  },

  * styles() {
    // Output multiple files to directory
    // return paths.styles.dest.write(yield paths.styles.src.use(stylus.render, '.css'));

    var css = stylus(yield paths.styles.src.read()).include(paths.styles.include).render();
    return paths.styles.dest.write(css);
  },

  * watch() {
    yield genome.build();
    genome.serve();

    // Watch files for changes with .onChange
    'app/**/*.slm'.onChange('html');
    'app/scripts/**/*.js'.onChange('scripts');
    'app/styles/**/*.styl'.onChange('styles');
    'dist/**/*'.onChange(browserSync.reload);
  },

  * build() {
    // Run tasks in serial with yield statement
    yield genome.clean();
    yield [genome.html(), genome.robots(), genome.scripts(), genome.styles()];
    // return genome.spawn(['html', 'robots', 'scripts', 'styles']);
  },

  * serve() {
    browserSync.init({server: paths.server.root});
  },

  // For testing synchronicity
  * short() {
    yield genome.wait(1000);
    console.log('3rd');
  },

  * medium() {
    yield genome.wait(1000);
    yield genome.wait(1000);
    console.log('2nd');
  },

  * long() {
    console.log(yield genome.wait(2500, '1st'));
  },

  * async() {
    // yield *this.long();
    // yield *this.medium();
    // yield *this.short();
    yield *[this.long(), this.medium(), this.short()];
  }
};

genome.run();
