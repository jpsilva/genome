#!/usr/bin/env node
'use strict';
require('regenerator-runtime/runtime')
require('babel-register')({
  presets: ['es2015', 'stage-3']
});
var tasks = require(`${process.cwd()}/genomefile`);
require('../index.js').genome(tasks);
