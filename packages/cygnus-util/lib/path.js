'use strict';

const mkdirp = require('mkdirp');

const os = require('os');
const { join } = require('path');
const { existsSync } = require('fs');


/**
 * get download dir path of universal bin
 * suffix - default: 'BIN'Bin
 * The BIN directory is currently being used as the global base tool directory. Names are temporarily not allowed to change.
 * @returns {string} download path
 */
function getDownloadDirOfBin() {
  const suffix = 'BIN';
  const base = join(os.homedir(), `.ANT_IDE_STUFF_${suffix}`);
  if (!existsSync(base)) {
    mkdirp.sync(base);
  }

  return base;
}

/**
 * get download dir path
 * @param {string} suffix - default: 'UNIVERSAL'
 *
 * @returns {string} download path
 */
function getDownloadDir(suffix = 'UNIVERSAL') {
  const base = join(os.homedir(), `.ANT_IDE_STUFF_${suffix}`);
  if (!existsSync(base)) {
    mkdirp.sync(base);
  }

  return base;
}

/**
 * get downloading information json path
 * @param {string} suffix - default: 'UNIVERSAL'
 *
 * @returns {string} downloading information json path
 */
function getDownloadInfoJSONPath(suffix = 'UNIVERSAL') {
  const downloadDir = getDownloadDir(suffix);

  return join(downloadDir, 'DOWNLOADED_PACKAGES_INFO.json');
}

/**
 * get debug logs path
 * @param {string} suffix - default: 'LOGS'
 *
 * @returns {string} ddebug logs path
 */

function getLogsPath(suffix = 'LOGS') {
  const downloadDir = getDownloadDir(suffix);

  return join(downloadDir, 'LOGS.txt');
}

module.exports.getDownloadDirOfBin = getDownloadDirOfBin;
module.exports.getDownloadDir = getDownloadDir;
module.exports.getDownloadInfoJSONPath = getDownloadInfoJSONPath;
module.exports.getLogsPath = getLogsPath;
