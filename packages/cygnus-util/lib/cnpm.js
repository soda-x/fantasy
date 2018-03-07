'use strict';

/**
 * constant
 * @REGISTRY_ALI {string} ali registry
 * @REGISTRY_OUT_ALI {string} taobao registry
 * @SEARCH_NAME_BY_KEYWORDS_ALI {string} ali registry keyword search
 * @SEARCH_NAME_BY_KEYWORDS_OUT_ALI {string} taobao registry keyword search
 */
const REGISTRY_ALI = 'http://registry.npm.alibaba-inc.com';
const REGISTRY_OUT_ALI = 'https://registry.npm.taobao.org';
const SEARCH_NAME_BY_KEYWORDS_ALI =
  'http://web.npm.alibaba-inc.com/browse/keyword/';
const SEARCH_NAME_BY_KEYWORDS_OUT_ALI =
  'https://npm.taobao.org/browse/keyword/';

/**
 * Get current network registry
 * @param {boolean} isAli: true represent the current network is alibaba
 * @returns {string} REGISTRY_ALI or REGISTRY_OUT_ALI
 */
module.exports.getRegistry = function getRegistry(isAli) {
  let registry = REGISTRY_OUT_ALI;
  if (isAli) {
    registry = REGISTRY_ALI;
  }

  return registry;
};

/**
 * Get the keyword corresponding to the search link under the current network
 * @param {boolean} isAli: true represent the current network is alibaba
 * @param {string} keyword: search keywords
 * @returns {string} complete search link
 */
module.exports.getSearchURL = function getSearchURL(isAli, keyword) {
  let searchURL = SEARCH_NAME_BY_KEYWORDS_OUT_ALI + keyword;
  if (isAli) {
    searchURL = SEARCH_NAME_BY_KEYWORDS_ALI + keyword;
  }

  return searchURL;
};

/**
 * Get the search link for the specified package name under the current network
 * @param {boolean} isAli: true represent the current network is alibaba
 * @param packageName : package name
 * @returns {string} complete search link
 */
module.exports.getNamedPackageInfoURL = function getNamedPackageInfoURL(
  isAli,
  packageName
) {
  let searchURL = `${REGISTRY_OUT_ALI}/${packageName}`;
  if (isAli) {
    searchURL = `${REGISTRY_ALI}/${packageName}`;
  }

  return searchURL;
};

/**
 * Get whitelist infomation
 * @param {string} url: fengdie h5data json url
 * @returns {Promise<any>}
 */
module.exports.getWhiteList = function getWhiteList(url) {
  return module.exports.doRequest(url);
};
