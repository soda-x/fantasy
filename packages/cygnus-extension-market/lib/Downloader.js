'use strict';

const { install } = require('./util/install');

const Events = require('events');

class Downloader extends Events {
  constructor(options = {}) {
    super();
    const {
      name,
      version,
      dlPath,
    } = options;
    this.dlPath = dlPath;
    this.name = name;
    this.version = version;
  }
  download(cb = function () {}) {
    return install({
      cwd: this.dlPath,
      packageName: this.name,
      version: this.version,
      cb,
    })
  }
}

module.exports = Downloader;
