#!/usr/bin/env node

'use strict';

var genome = require('../index.js'),
    Conf = require(`${process.cwd()}/genomefile`);

genome(new Conf());
