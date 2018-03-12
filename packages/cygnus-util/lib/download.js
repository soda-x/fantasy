'use strict';

const dl = require('download');
const ProgressBar = require('progress');

const { log } = require('./log');

/**
 * private download method
 * @param {string} url URL to download.
 * @param {string} destination Path to where your file will be written.
 * @param {object} dlOptions options Same options as [download](https://www.npmjs.com/package/download)
 * @param {number} oneMoreTryForUnZip
 * @param {function} resolve
 * @param {function} reject
 */
function tryToDownload(
  url,
  destination,
  dlOptions,
  oneMoreTryForUnZip,
  resolve,
  reject
) {
  const { progress } = dlOptions;
  dl(url, destination, dlOptions)
    .on('response', res => {
      const item =
        res.requestUrl ||
        res.headers['content-disposition'] ||
        res.headers['x-oss-meta-filename'];
      const info = `Downloading ${item} \n`;
      log(info);
      if (progress) {
        const bar = new ProgressBar(
          '  downloading [:bar] :rate/bps :percent :etas',
          {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: 0,
          }
        );
        bar.total = res.headers['content-length'];
        res.on('data', data => {
          bar.tick(data.length);
        });
      }
      res.on('end', () => {
        const info = `Downloaded ${item} \n`;
        log(info);
      });
    })
    .then(() => {
      resolve(url);
    })
    .catch(err => {
      const info = `Failed with error: ${err} ---> ${url}\n`;
      log(info);
      if (oneMoreTryForUnZip === 1 && err.code === 'Z_DATA_ERROR') {
        const info = `Due to ${
          err.code
        }, download ${url} would like to try again\n`;
        log(info);
        tryToDownload(url, destination, dlOptions, 0, resolve, reject);
      } else {
        reject(err);
      }
    });
}
/**
 * download a file
 * @param {string} url URL to download.
 * @param {string} destination Path to where your file will be written.
 * @param {object} options Same options as [download](https://www.npmjs.com/package/download)
 * @returns {Promise<any>}
 */
function download(url = '', destination = '', options = {}) {
  const oneMoreTryForUnZip = 1;

  return new Promise((resolve, reject) => {
    if (!url || !destination) {
      const cb = options.cb || '';
      const err = new Error('url and destination should not empty');
      cb(err);
      reject(err);
    } else {
      const dlOptions = Object.assign({}, options, {
        timeout: 300000,
        retries: (retry, error) => {
          const info = `Retry ${retry}/3.\n Error: ${error} \n`;
          log(info);
          if (retry === 3) {
            return 0;
          }

          return 10000;
        },
        extract: true,
        useElectronNet: false,
      });
      tryToDownload(
        url,
        destination,
        dlOptions,
        oneMoreTryForUnZip,
        resolve,
        reject
      );
    }
  });
}

module.exports.download = download;
