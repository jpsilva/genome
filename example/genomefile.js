'use strict';

import { file, all } from '../index';
import browserify from 'browserify';
import chalk from 'chalk';
import del from 'del';
import stylus from 'stylus';

export async function css() {
  var raw = await file('src/screen.styl').read();
  var css = stylus(raw).render();
  await file('dist/screen.css').write(css);
  console.log(chalk.green('Done compiling css.'));
}

export async function html(srcFile) {
  var raw = await srcFile.read();
  await file('dist/' + srcFile.relativePath).write(raw);
  console.log(chalk.green(`Done copying ${srcFile.path}.`));
}

export async function js() {
  var js = browserify('src/main.js').bundle();
  await file('dist/main.js').write(js);
  console.log(chalk.green('Done compiling js.'));
}

export async function destroy(srcFile) {
  await del('dist/' + srcFile.relativePath);
  console.log(chalk.green(`Done deleting ${srcFile.path}.`));
}

export async function build() {
  await all(css(), js(), html.for('src/**/*.html'));
  console.log(chalk.green('Done building.'));
}

export default async function watch() {
  // Clean build directory
  await destroy.for('dist/');

  // Build files
  await build();

  // Watch files
  css.when('src/**/*.styl').changed().added();
  html.when('src/**/*.html').changed().added();
  js.when('src/**/*.js').changed().added();
  destroy.when('src/**/*').deleted();
  console.log(chalk.green(`Watching ...`));
}

function wait (time, params) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(params);
    }, time);
  });
}
