'use strict';

const { join, sep } = require('path');
const { existsSync } = require('fs');
const os = require('os');

const { pathUtil, downloadUtil, logUtil } = require('cygnus-util');
const { getDownloadDir } = pathUtil;
const { download } = downloadUtil;
const { log } = logUtil;

/**
 * get cnpm remote url
 * @returns {string} cnpm url
 */
function getEncloseCnpmRemotePath() {
  const isWin32 = os.platform() === 'win32';
  const cnpmRemotePath = isWin32
    ? 'http://p.tb.cn/rmsportal_5906_cnpm-v5.2.0-win-x64.zip'
    : 'http://p.tb.cn/rmsportal_5906_cnpm-v5.2.0-darwin-x64.tar.gz';

  return cnpmRemotePath;
}

/**
 * get node remote url
 * @returns {string} node url
 */
function getNodeRemotePath() {
  const isWin32 = os.platform() === 'win32';
  const nodeRemotePath = isWin32
    ? 'http://p.tb.cn/rmsportal_5906_node-v9.3.0-win-x64.zip'
    : 'http://p.tb.cn/rmsportal_5906_node-v9.3.0-darwin-x64.tar.gz';

  return nodeRemotePath;
}

/**
 * setup node and cnpm
 * @param {string} prefix - default 'UNIVERSAL'
 */
function setupNodeAndCnpmEnvironment(prefix) {
  const isWin32 = os.platform() === 'win32';
  // remote cnpm node url
  const cnpmRemotePath = getEncloseCnpmRemotePath();
  const nodeRemotePath = getNodeRemotePath();
  // local path
  const downloadDir = join(getDownloadDir(prefix), 'bin');
  const cnpmPath = join(downloadDir, isWin32 ? 'cnpm.exe' : 'cnpm');
  const nodePath = join(
    downloadDir,
    isWin32
      ? `node-v9.3.0-win-x64${sep}node-v9.3.0-win-x64${sep}node.exe`
      : `node-v9.3.0-darwin-x64${sep}bin${sep}node`
  );

  const dlQueue = [];
  if (!existsSync(cnpmPath)) {
    dlQueue.push(cnpmRemotePath);
  }
  if (!existsSync(nodePath)) {
    dlQueue.push(nodeRemotePath);
  }
  const options = {
    progress: parseInt(process.env.DEBUG) === 1,
  };
  return new Promise((resolve, reject) => {
    if (dlQueue.length === 0) {
      resolve({
        cnpm: cnpmPath,
        node: nodePath,
      });
    } else {
      Promise.all(
        dlQueue.map(item => download(item, downloadDir, options))
      ).then(
        ret => {
          log(`Successfully downloaded ${ret}`);
          resolve({
            cnpm: cnpmPath,
            node: nodePath,
          });
        },
        err => {
          log(`Fail to setup node and cnpm env. Error: ${err}`);
          reject(err);
        }
      );
    }
  });
}

module.exports.setupNodeAndCnpmEnvironment = setupNodeAndCnpmEnvironment;
