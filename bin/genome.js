#!/usr/bin/env node

'use strict';

var genome = require(`${process.cwd()}/node_modules/genome/index.js`),
    Conf = require(`${process.cwd()}/genomefile`);

genome(new Conf());
