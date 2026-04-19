'use strict';

const assert = require('assert');
const plugin = require('../index.js');

assert.strictEqual(typeof plugin, 'function', 'default export should be a function');
assert.strictEqual(typeof plugin.generateGraphData, 'function');
assert.strictEqual(typeof plugin.buildGraphHTML, 'function');
assert.strictEqual(typeof plugin.getConfig, 'function');
