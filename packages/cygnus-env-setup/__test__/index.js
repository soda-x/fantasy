'use strict';

const { setupNodeAndCnpmEnvironment } = require('../index');

const test = require('ava');

test('should get cnpm and node bin path', async t => {
  t.deepEqual(await setupNodeAndCnpmEnvironment(), {
    cnpm: '/Users/pigcan/.ANT_IDE_STUFF_UNIVERSAL/bin/cnpm',
    node:
      '/Users/pigcan/.ANT_IDE_STUFF_UNIVERSAL/bin/node-v9.3.0-darwin-x64/bin/node',
  });
});
