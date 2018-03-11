'use strict';

const { networkUtil } = require('cygnus-util');
const { doRequest } = networkUtil;
/**
 * Get whitelist infomation
 * @param {string} url: fengdie h5data json url
 * @returns {Promise<any>}
 */

module.exports = function getWhiteList(url = '') {
  if (url) {
    return doRequest(url);
  }
  return Promise.resolve([]);
};
