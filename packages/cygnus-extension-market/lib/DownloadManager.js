'use strict';

const { join } = require('path');
const { existsSync } = require('fs');

const Queue = require('p-queue');
const pathIsAbsolute = require('path-is-absolute');
const mkdirp = require('mkdirp');
const { pathUtil, logUtil } = require('cygnus-util');

const { getDownloadDir } = pathUtil;
const { log } = logUtil;

const Downloader = require('./Downloader');

const singleton = Symbol();
const downloadManager = Symbol();

class DownloadManager {
  constructor(enforcer) {
    if (enforcer !== downloadManager) {
      throw new Error('Cannot construct singleton');
    }
    this._suffix = 'UNIVERSAL';
    this._type = 'DownloadManager';
    this.queue = new Queue({concurrency:1});
  }
  static get instance() {
    if (!this[singleton]) {
      this[singleton] = new DownloadManager(downloadManager);
    }

    return this[singleton];
  }
  get type() {
    return this._type;
  }
  set type(value) {
    this._type = value;
  }
  get suffix() {
    return this._suffix;
  }
  set suffix(value) {
    this._suffix = value;
  }
  downloadAPackage(path = '', name = '', version = 'latest') {
    let dlPath = path;
    if (!dlPath || !pathIsAbsolute(path)) {
      dlPath = join(getDownloadDir(this._suffix), dlPath)
    }
    if (!existsSync(dlPath)) {
      mkdirp.sync(dlPath);
    }

    if (name !== '' && typeof name === 'string') {
      const info = `${name} ${version} add to the download queue.`;
      log(info);
      const dl = new Downloader({
        dlPath,
        name,
        version,
      });

      return this.queue.add(() => {
        return dl.download();
      });

    }
  }
}

module.exports = DownloadManager;
