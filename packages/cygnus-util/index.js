'use strict';

const mkdirp = require('mkdirp');

const os = require('os');
const { join } = require('path');
const { existsSync } = require('fs');

/**
 * get download dir path
 * @param {string} prefix - default: 'UNIVERSAL'
 *
 * @returns {string} download path
 */
function getDownloadDir(prefix = 'UNIVERSAL') {
  const base = join(os.homedir(), `.ANT_IDE_STUFF_${prefix}`);
  if (!existsSync(base)) {
    mkdirp.sync(base);
  }

  return base;
}

/**
 * get downloading information json path
 * @param {string} prefix - default: 'UNIVERSAL'
 *
 * @returns {string} downloading information json path
 */
function getDownloadInfoJSONPath(prefix = 'UNIVERSAL') {
  const downloadDir = getDownloadDir(prefix);

  return join(downloadDir, 'DOWNLOADED_PACKAGES_INFO.json');
}

module.exports.getDownloadDir = getDownloadDir;

module.exports.getDownloadInfoJSONPath = getDownloadInfoJSONPath;
