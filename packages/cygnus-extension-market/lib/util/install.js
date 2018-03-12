'use strict';

const { dirname } = require('path');

const { setupNodeAndCnpmEnvironment } = require('cygnus-env-setup');
const { runUtil, logUtil, cnpmUtil, networkUtil } = require('cygnus-util');

const { runCmd } = runUtil;
const { log } = logUtil;
const { getRegistry } = cnpmUtil;
const { isAliEnv } = networkUtil;

/**
 *
 * @param {string} suffix: suffix of download dir name, more see cygnus/util/lib/path.js
 * @param {string} cwd: current working directory
 * @param {string} packageName: package name
 * @param {string} version: package version
 * @param {function} cb: install callback
 * @returns {Promise<any>}
 */
module.exports.install = async function install({
  suffix = 'BIN',
  cwd,
  packageName = '',
  version = 'latest',
  cb = function() {},
} = {}) {
  const args = ['install'];
  if (packageName !== '' && typeof packageName === 'string') {
    if (version !== '' && typeof version === 'string') {
      args.push(`${packageName}@${version}`);
    } else {
      args.push(`${packageName}@latest`);
    }
  }
  let nodePath = '';
  let cnpmPath = '';
  let errObj;
  try {
    const isAli = await isAliEnv();
    const registry = getRegistry(isAli);
    args.push(`--registry=${registry}`);
    const { cnpm, node } = await setupNodeAndCnpmEnvironment(suffix);
    cnpmPath = cnpm;
    nodePath = dirname(node);
  } catch (err) {
    errObj = err;
  }

  return new Promise((resolve, reject) => {
    if (errObj) {
      const info = `Something bad happened to setup node and cnpm environment. Error: ${errObj} \n`;
      log(info);
      reject(errObj);
    } else {
      runCmd(nodePath, cnpmPath, args, cwd, code => {
        if (parseInt(code, 10) === 0) {
          resolve({
            name: packageName,
            version,
            path: cwd,
          });
        } else {
          const info = `Error:Run Install With Exitcode ${code}`;
          log(info);
          reject(new Error(info));
        }
        cb(code, {
          name: packageName,
          path: cwd,
        });
      });
    }
  });
};
