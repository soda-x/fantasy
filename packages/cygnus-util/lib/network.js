'use strict';

const superagent = require('superagent');

/**
 * Detect the network is in company or not.
 * @returns {Promise<any>} true: in Alibaba false: opposite true
 */
module.exports.isAliEnv = function isAliEnv() {
  return new Promise(resolve => {
    // try to visit a private png file
    superagent
      .get(
        'https://private-alipayobjects.alipay.com/alipay-rmsdeploy-image/rmsportal/FlPJSPwhzfagtBoHKCbu.png'
      )
      .timeout(1000)
      .end(err => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
  });
};

/**
 * do a request
 * @param {string} api: request url
 * @returns {Promise<any>}
 */
module.exports.doRequest = function doRequest(api) {
  return new Promise((resolve, reject) => {
    if (
      api &&
      (api.indexOf('http://') === 0 || api.indexOf('https://') === 0)
    ) {
      try {
        superagent
          .get(api)
          .query({ type: 'json', t: new Date().getTime() })
          .set('Content-Type', 'application/json')
          .set(
            'User-Agent',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36'
          )
          .end((err, res) => {
            if (err) {
              reject(new Error(`Error: request got ${err}`));
            } else {
              resolve(res.body || '');
            }
          });
      } catch (err) {
        reject(new Error(`Error: request got ${err}`));
      }
    } else {
      reject(new Error(`Error: request a bad url: ${api}`));
    }
  });
};
