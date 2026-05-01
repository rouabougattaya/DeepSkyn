// CJS shim for uuid v14 (ESM-only) — used by Jest via moduleNameMapper
// Provides a simple v4 implementation without importing uuid ESM
'use strict';

const crypto = require('crypto');

function v4() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function v1() {
  return v4(); // good enough for tests
}

module.exports = { v4, v1 };
module.exports.v4 = v4;
module.exports.v1 = v1;
module.exports.default = { v4, v1 };
