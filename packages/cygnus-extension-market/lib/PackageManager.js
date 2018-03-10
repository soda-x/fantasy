'use strict';

const { sep, join, dirname } = require('path');

const set = require('lodash.set');
const merge = require('lodash.merge');
const cloneDeep = require('lodash.clonedeep')
const map = require('lodash.map');
const { readJson } = require('fs-extra');
const semver = require('semver')
const pathIsAbsolute = require('path-is-absolute');
const rimraf = require('rimraf');

const { pathUtil, networkUtil, cnpmUtil } = require('cygnus-util');

const { getDownloadDir } = pathUtil;
const { doRequest, isAliEnv } = networkUtil;
const { getSearchURL, getNamedPackageInfoURL, getWhiteList } = cnpmUtil;

const DownloadManager = require('./DownloadManager');
const StatusJSONManager = require('./StatusJSONManager');

function isEmptyObj(obj) {
  for (let k in obj) {
    if (obj.hasOwnProperty(k)) {
      return false;
    }
  }
  return true;
}

class PackageManager {
  /**
   * Returns the package is a project plugin or simple plugin
   * @pkg {Object} package info
   * @returns {Number} 0 -> project-plugin, 1 -> simple plugin, 2 -> normal npm module
   */
  static getPackageType(pkg) {
    let type = 2;
    if (pkg && pkg.cygnus) {
      if (pkg.cygnus.isProject) {
        type = 0;
      } else {
        type = 1;
      }
    }

    return type;
  }
  constructor(options = {}) {
    const {
      prefix = 'cygnus-ide',
      suffix = 'UNIVERSAL',
      whiteListUrl = '',
    } = options;
    this.whiteListUrl = whiteListUrl;
    this.prefix = prefix;
    this.suffix = suffix;
    this.packagers = null;
    DownloadManager.instance.suffix = this.suffix;
    this.downloadManager = DownloadManager.instance;
    this.statusJSONManager = new StatusJSONManager(this.suffix);
  }

  async doNameAndDescriptionSearch() {
    let ret = [];
    try {
      if (this.isAli === undefined) {
        this.isAli = await isAliEnv();
      }
      const packageListURL = getSearchURL(this.isAli, this.prefix);
      const packageListResponse = await doRequest(packageListURL);
      if (!process.env.IGNORE_WhiteList) {
        const whiteList = await getWhiteList(this.whiteListUrl);
        if (whiteList.length) {
          const list = map(whiteList, 'name');
          const packages = packageListResponse.packages;
          const filterPackages = packages.filter((pkg) => {
            if (list.indexOf(pkg.name) > -1) {
              return true;
            }
            return false;
          });
          ret = [null, filterPackages];
        } else {
          ret = [null, packageListResponse.packages];
        }
      } else {
        ret = [null, packageListResponse.packages];
      }
    } catch (err) {
      ret = [err, null];
    }

    return ret;
  }

  async doAllPackagesDetailSearch() {
    let ret = [];
    try {
      if (this.isAli === undefined) {
        this.isAli = await isAliEnv();
      }
      const packageListURL = getSearchURL(this.isAli, this.prefix);
      const packageListResponse = await doRequest(packageListURL);
      const packageList = packageListResponse.packages || [];
      if (packageList.length) {
        const packageInfoList = [];
        let filterPackageList;
        if (!process.env.IGNORE_WhiteList) {
          const whiteList = await getWhiteList(this.whiteListUrl);
          if (whiteList.length) {
            const list = map(whiteList, 'name');
            const filterPackages = packageList.filter((pkg) => {
              if (list.indexOf(pkg.name) > -1) {
                return true;
              }
              return false;
            });
            filterPackageList = filterPackages;
          } else {
            filterPackageList = packageList;
          }
        } else {
          filterPackageList = packageList;
        }
        for (let i = 0; i < filterPackageList.length; i ++) {
          packageInfoList.push(doRequest(getNamedPackageInfoURL(this.isAli, filterPackageList[i]['name'])));
        }
        let allPakcagesInfo = await Promise.all(packageInfoList);
        allPakcagesInfo = this.normalizePackagesInfo(allPakcagesInfo, true);
        this.packagers = Object.keys(allPakcagesInfo).reduce((prev, pkgName) => {
          const pkg = allPakcagesInfo[pkgName];
          let obj = {};
          if (pkg.type === 0) {
            obj = {
              Project: {
                [pkgName]: {
                  [pkgName]: pkg,
                },
              },
            }
          }
          if (pkg.type === 1) {
            obj = {
              Plugin: {
                [pkgName]: {
                  [pkgName]: pkg,
                },
              },
            }
          }
          obj = merge(prev, obj);

          return obj;
        }, {});
        ret = [null, this.packagers];
      }
    } catch (err) {
      ret = [err, null];
    }

    return ret;
  }

  normalizePackagesInfo(packagesInfo = [], rawMode) {
    let packages;
    packages = Array.isArray(packagesInfo) ? packagesInfo : [packagesInfo];

    return packages.reduce((prev, p) => {
      let pkg = null;
      if (rawMode) {
        pkg = p.versions[p['dist-tags'].latest];
        pkg.versionsList = Object.keys(p.versions);
        pkg['dist-tags'] = p['dist-tags'];
      } else {
        pkg = p;
      }
      const type = PackageManager.getPackageType(pkg);
      let author = '';
      if (pkg.author && typeof pkg.author === 'object') {
        author = pkg.author.name || pkg.author.email || '';
      }
      if (pkg.author && typeof pkg.author === 'string') {
        author = pkg.author;
      }
      let cname = '';
      let iconForSearch = '';
      let ideDeps = [];
      let disableUninstall = false;
      if (type !== 2) {
        cname = pkg.cygnus.cname || pkg.cygnus.description.cname || pkg.cygnus.description.name || '';
        iconForSearch = pkg.cygnus.description.iconForSearch || '';
        ideDeps = pkg.cygnus.plugins || [];
        disableUninstall = pkg.cygnus.disableUninstall || false;
      }
      const link = pkg.cygnus.description.link || '';

      let newPkg = {
        type,
        status: pkg.status || '',
        enable: true,
        name: pkg.name,
        cname: cname,
        link,
        path: pkg.path,
        iconForSearch,
        version: pkg.version,
        aversion: pkg.aversion || '',
        latestVersion: pkg.latestVersion || '',
        description: pkg.description || '',
        author,
        ideDeps,
        disableUninstall,
        dependencies: pkg.dependencies,
        readme: pkg.readme || '空空如也',
      }
      if (rawMode) {
        newPkg = Object.assign(newPkg, {
          versionsList: pkg.versionsList,
          ['dist-tags']: pkg['dist-tags'],
        })
      }
      const newObj = Object.assign({}, prev, {
        [pkg.name]: newPkg,
      });

      return newObj;
    }, {});
  }

  /**
   * Returns all installed packages info or named package info
   * @name {String} pkg name
   * @type {Number} pkg type, should be one of 0, 1; 0 stands for project plugin, 1 stands for normal plugin
   * @returns {Object}
   */
  getInstalledObj(name, type) {
    const downloadInfo = StatusJSONManager.readStatusJSON();
    const dlType = Object.keys(downloadInfo);
    // 存在下载信息
    if (dlType.length) {
      // 类型循环
      dlType.forEach((t) => {
        const items = Object.keys(downloadInfo[t]);
        if (items.length) {
          // 主体循环
          items.forEach((parent) => {
            const childs = Object.keys(downloadInfo[t][parent]);
            if (childs.length) {
              childs.forEach((child) => {
                const p = downloadInfo[t][parent][child];
                if (p.status === 'installing') {
                  if (parent === child) {
                    delete downloadInfo[t][parent];
                  } else {
                    delete downloadInfo[t][parent][child];
                  }
                }
              });
            }
          });
        }
      });
    }

    if (name && typeof name === 'string' && type.indexOf([0, 1]) > -1) {
      const typ = type === 0 ? 'Project' : 'Plugin';
      return downloadInfo[typ][name]
    }

    return downloadInfo;
  }

  async doFinalValidatedSearch() {
    const finalObj = {
      finalValidatedAllPackages: {},
      finalValidatedUnInstallPackages: {},
      finalValidatedInstalledPackages: {},
    };
    try {
      if (!this.packagers) {
        await this.doAllPackagesDetailSearch();
      }
      const p = this.packagers;
      const packages = cloneDeep(p);
      const backupForFilterInstalled = cloneDeep(p);
      const installedObj = this.getInstalledObj();
      if (!isEmptyObj(installedObj)) {
        const projectsObj = installedObj.Project || {};
        const pluginsObj = installedObj.Plugin || {};
        const projects = Object.keys(projectsObj);
        const plugins = Object.keys(pluginsObj);
        installedObj.Project = projects.reduce((prev1, project) => {
          const items = Object.keys(projectsObj[project]);
          const newChild = items.reduce((prev2, item) => {
            const pkg = projectsObj[project][item];
            //pkg.status = 'installing';
            const type = pkg.type;
            const version = pkg.version;
            const aversion = pkg.aversion;
            let versionsList = [];
            let distTags = [];
            // project should be updated always
            if (type === 0) {
              const name = pkg.name;
              if (project === name) {
                delete backupForFilterInstalled.Project[project];
              } else {
                delete backupForFilterInstalled.Project[project][name];
              }
              //packages.Project[project][name].status = 'installing';
              packages.Project[project][name].path = pkg.path || '';
              versionsList = packages.Project[project][name].versionsList;
              distTags = packages.Project[project][name]['dist-tags'];
              if (semver.gt(distTags.latest, aversion)) {
                pkg.status = 'outdate';
                pkg.latestVersion = distTags.latest;
                packages.Project[project][name].status = 'outdate';
                packages.Project[project][name].latestVersion = distTags.latest;
              }
            }
            // plugins should be updated by semver
            if (type === 1) {
              const name = pkg.name;
              if (project === name) {
                delete backupForFilterInstalled.Project[project];
              } else {
                delete backupForFilterInstalled.Project[project][name];
              }
              //packages.Plugin[project][name].status = 'installing';
              packages.Plugin[project][name].path = pkg.path || '';
              versionsList = packages.Plugin[project][name].versionsList;
              distTags = packages.Plugin[project][name]['dist-tags'];
              // situation 1: use tag
              if (distTags[version]) {
                if (semver.gt(distTags[version], aversion)) {
                  pkg.status = 'outdate';
                  pkg.latestVersion = distTags[version];
                  packages.Plugin[project][name].status = 'outdate';
                  packages.Plugin[project][name].latestVersion = distTags[version];
                }
              }
              // situation 2: use semver
              versionsList.some((ver) => {
                if (semver.satisfies(ver, version) && semver.gt(ver, aversion)) {
                  pkg.status = 'outdate';
                  pkg.latestVersion = ver;
                  packages.Plugin[project][name].status = 'outdate';
                  packages.Plugin[project][name].latestVersion = ver;

                  return true;
                }

                return false;
              });
            }

            return Object.assign({}, prev2, {
              [item]: pkg,
            });
          }, {});

          return Object.assign({}, prev1, {
            [project]: newChild,
          });
        }, {});

        installedObj.Plugin = plugins.reduce((prev1, plugin) => {
          const items = Object.keys(pluginsObj[plugin]);
          const newChild = items.reduce((prev2, item) => {
            const pkg = pluginsObj[plugin][item];
            const name = pkg.name;
            //pkg.status = 'installing';
            if (plugin === name) {
              delete backupForFilterInstalled.Plugin[plugin];
            } else {
              delete backupForFilterInstalled.Plugin[plugin][name];
            }
            //packages.Plugin[plugin][name].status = 'installing';
            const type = pkg.type;
            const version = pkg.version;
            const aversion = pkg.aversion;
            const versionsList = packages.Plugin[plugin][name].versionsList;
            const distTags = packages.Plugin[plugin][name]['dist-tags'];
            // root plugin should be updated always
            if (type === 1 && plugin === item) {
              if (semver.gt(distTags.latest, aversion)) {
                pkg.status = 'outdate';
                pkg.latestVersion = distTags.latest;
                packages.Plugin[plugin][name].status = 'outdate';
                packages.Plugin[plugin][name].latestVersion = distTags.latest;
              }
            }
            // child plugins should be updated by semver
            if (type === 1 && plugin !== item) {
              // situation 1: use tag
              if (distTags[version]) {
                if (semver.gt(distTags[version], aversion)) {
                  pkg.status = 'outdate';
                  pkg.latestVersion = distTags[version];
                  packages.Plugin[plugin][name].status = 'outdate';
                  packages.Plugin[plugin][name].latestVersion = distTags[version];

                }
              }
              // situation 2: use semver
              versionsList.some((ver) => {
                if (semver.satisfies(ver, version) && semver.gt(ver, aversion)) {
                  pkg.status = 'outdate';
                  pkg.latestVersion = ver;
                  packages.Plugin[plugin][name].status = 'outdate';
                  packages.Plugin[plugin][name].latestVersion = ver;

                  return true;
                }

                return false;
              });
            }

            return Object.assign({}, prev2, {
              [item]: pkg,
            });
          }, {});

          return Object.assign({}, prev1, {
            [plugin]: newChild,
          });
        }, {});

        finalObj.finalValidatedAllPackages = packages;
        finalObj.finalValidatedUnInstallPackages = backupForFilterInstalled;
        finalObj.finalValidatedInstalledPackages = installedObj;
      } else {
        finalObj.finalValidatedAllPackages = packages;
        finalObj.finalValidatedUnInstallPackages = backupForFilterInstalled;
        finalObj.finalValidatedInstalledPackages = installedObj;
      }
    } catch (err) {
      finalObj.finalValidatedAllPackages = {};
      finalObj.finalValidatedUnInstallPackages = {};
      finalObj.finalValidatedInstalledPackages = this.getInstalledObj();

      return [err, finalObj];
    }

    return [null, finalObj];
  }

  getInstallListObj(pkgs = []) {
    const needToAnalysisPakcages = Array.isArray(pkgs) ? pkgs : [pkgs];
    const installListObj = {};
    if (needToAnalysisPakcages.length > 0) {
      for (let i = 0; i < needToAnalysisPakcages.length; i ++) {
        const pkg = needToAnalysisPakcages[i];
        const type = PackageManager.getPackageType(pkg);
        if (type === 0) {
          // project itself
          set(installListObj, `Project.${pkg.name}.${pkg.name}`, pkg.version);
          // get plugins list
          const plugins = pkg.cygnus && pkg.cygnus.plugins || [];
          if (plugins.length) {
            for (let i = 0; i < plugins.length; i ++) {
              set(installListObj, `Project.${pkg.name}.${plugins[i].name}`, plugins[i].version);
            }
          }
        }
        if (type === 1) {
          set(installListObj, `Plugin.${pkg.name}`, pkg.version);
          const plugins = pkg.cygnus && pkg.cygnus.plugins || [];
          if (plugins.length) {
            for (let i = 0; i < plugins.length; i ++) {
              set(installListObj, `Project.${pkg.name}.${plugins[i].name}`, plugins[i].version);
            }
          }
        }
      }
    }

    return installListObj;
  }

  async downloadProjectPlugin(name = '', version = 'latest') {
    let ret = [];
    try {
      if (this.isAli === undefined) {
        this.isAli = await isAliEnv();
      }
      let dlLocalInfo = {};
      if (name !== '' && typeof name === 'string') {
        let pkg = await doRequest(getNamedPackageInfoURL(this.isAli, name));
        pkg = pkg.versions[version] || pkg.versions[pkg['dist-tags'].latest];
        const installListObj = this.getInstallListObj(pkg);
        let dl = [];
        if (installListObj.Project) {
          for (const projectName in installListObj.Project) {
            const project = installListObj.Project[projectName];
            for (let item in project) {
              const name = item;
              const version = project[item];
              const subDir = `Project${sep}${projectName}${sep}${name}@${version}`;
              dl.push(this.downloadManager.downloadAPackage(subDir, name, version));
            }
          }
        }
        if (dl.length) {
          const dlRes = await Promise.all(dl);
          dlLocalInfo = {
            Project: {
              [pkg.name]: [],
            }
          };
          const dlNameAndVersionObj = dlRes.reduce((prev, dlItem) => {
            return Object.assign({}, prev, {
              [dlItem.name]: {
                version: dlItem.version,
                path: join(dlItem.path, `node_modules${sep}${dlItem.name}${sep}package.json`),
              },
            });
          }, {});
          const dlResPkgList = dlRes.reduce((prev, dlItem) => {
            const dlItemPkgPath = join(dlItem.path, `node_modules${sep}${dlItem.name}${sep}package.json`);
            prev.push(readJson(dlItemPkgPath));

            return prev;
          }, []);

          const dlRestPkg = await Promise.all(dlResPkgList);

          const mixResPkg = dlRestPkg.reduce((prev, apkg) => {
            const newPkg = Object.assign({}, apkg, {
              aversion: apkg.version,
              enable: true,
              // 1月25日 去除，问题是 installling 中间态导致获取所有安装模块失败，因为installing 被认为是一个并未安装状态，status: 'installing',
            }, dlNameAndVersionObj[apkg.name]);
            prev.push(newPkg);

            return prev;
          }, []);

          const normalizeResPkg = this.normalizePackagesInfo(mixResPkg);

          dlLocalInfo.Project[pkg.name] = normalizeResPkg;
        }
      }
      if (!isEmptyObj(dlLocalInfo)) {
        StatusJSONManager.updateStatusJSON(dlLocalInfo);
      }
      ret = [null, StatusJSONManager.readStatusJSON()];
    } catch (err) {
      ret = [err, null];
    }

    return ret;
  }

  async downloadAGlobalPlugin(name = '', version = 'latest') {
    let ret = [];
    try {
      if (this.isAli === undefined) {
        this.isAli = await isAliEnv();
      }
      let dlLocalInfo = {};
      if (name !== '' && typeof name === 'string') {
        let pkg = await doRequest(getNamedPackageInfoURL(this.isAli, name));
        pkg = pkg.versions[version] || pkg.versions[pkg['dist-tags'].latest];
        const installListObj = this.getInstallListObj(pkg);
        let dl = [];
        if (installListObj.Plugin) {
          for (const pluginName in installListObj.Plugin) {
            const plugin = installListObj.Plugin[pluginName];
            for (let item in plugin) {
              const name = item;
              const version = plugin[item];
              const subDir = `Plugin${sep}${pluginName}${sep}${name}@${version}`;
              dl.push(this.downloadManager.downloadAPackage(subDir, name, version));
            }
          }
        }
        if (dl.length) {
          const dlRes = await Promise.all(dl);
          dlLocalInfo = {
            Plugin: {
              [pkg.name]: [],
            }
          };
          const dlNameAndVersionObj = dlRes.reduce((prev, dlItem) => {
            return Object.assign({}, prev, {
              [dlItem.name]: {
                version: dlItem.version,
                path: join(dlItem.path, `node_modules${sep}${dlItem.name}${sep}package.json`),
              },
            });
          }, {});
          const dlResPkgList = dlRes.reduce((prev, dlItem) => {
            const dlItemPkgPath = join(dlItem.path, `node_modules${sep}${dlItem.name}${sep}package.json`);
            prev.push(readJson(dlItemPkgPath));

            return prev;
          }, []);

          const dlRestPkg = await Promise.all(dlResPkgList)

          const mixResPkg = dlRestPkg.reduce((prev, apkg) => {
            const newPkg = Object.assign({}, apkg, {
              aversion: apkg.version,
              enable: true,
              status: 'installing',
            }, dlNameAndVersionObj[apkg.name]);
            prev.push(newPkg);

            return prev;
          }, []);

          const normalizeResPkg = this.normalizePackagesInfo(mixResPkg);

          dlLocalInfo.Plugin[pkg.name] = normalizeResPkg;
        }
      }
      if (!isEmptyObj(dlLocalInfo)) {
        return StatusJSONManager.updateStatusJSON(dlLocalInfo);
      }
      ret = [null, StatusJSONManager.readStatusJSON()];
    } catch (err) {
      ret = [err, null];
    }

    return ret;
  }

  getParent(path) {
    if (!pathIsAbsolute(path)) {
      return [new Error('path should be absolute'), ''];
    }
    let parent = null;
    const statusJSON = StatusJSONManager.readStatusJSON();
    if (!isEmptyObj(statusJSON)) {
      const projectsObj = statusJSON.Project || {};
      const pluginsObj = statusJSON.Plugin || {};
      const projects = Object.keys(projectsObj);
      const plugins = Object.keys(pluginsObj);
      // project
      projects.forEach((projectName) => {
        const items = Object.keys(projectsObj[projectName]);
        items.forEach((item) => {
          const childObj = projectsObj[projectName][item];
          if (childObj.path === path || dirname(childObj.path) === path) {
            parent = projectName;
          }
        });
      });
      if (!parent) {
        // plugin
        plugins.forEach((pluginName) => {
          const items = Object.keys(pluginsObj[pluginName]);
          items.forEach((item) => {
            const childObj = pluginsObj[pluginName][item];
            if (childObj.path === path || dirname(childObj.path)=== path) {
              parent = pluginName;
            }
          });
        });
      }
    }

    return [null, parent];
  }

  setStatusOrEnableOfNamedPakcage({parent = null, name = '', type = 0, status = '', enable = ''}) {
    let obj = {};
    const oldJSON = StatusJSONManager.readStatusJSON();
    try {
      if (type === 0) {
        if (name !== '' && typeof name === 'string' && oldJSON.Project[name][name]) {
          obj = {
            Project: {
              [name]: {
                [name]: {
                  status,
                }
              }
            }
          }
          if (typeof enable === 'boolean') {
            obj.Project[name][name].enable = enable;
          }
        }
      }
      if (type === 1) {
        if (parent && typeof parent === 'string' && typeof name === 'string' && oldJSON.Project[parent][name]) {
          obj = {
            Project: {
              [parent]: {
                [name]: {
                  status,
                }
              }
            }
          }
          if (typeof enable === 'boolean') {
            obj.Project[parent][name].enable = enable;
          }
        } else if (!parent && typeof name === 'string' && oldJSON.Plugin[name][name]) {
          obj = {
            Plugin: {
              [name]: {
                [name]: {
                  status,
                }
              }
            }
          }
          if (typeof enable === 'boolean') {
            obj.Plugin[name][name].enable = enable;
          }
        }
      }
    } catch (err) {
      return [err, {}];
    }

    return [null, StatusJSONManager.updateStatusJSON(obj)];
  }

  // only support uninstall global, not support like project build-in plugin uninstall
  unInstallAPackage({ name = '', type = 0 }) {
    const oldJSON = StatusJSONManager.readStatusJSON();
    const downloadDir = getDownloadDir();

    return new Promise((resolve, reject) => {
      try {
        if (type === 0) {
          if (name !== '' && typeof name === 'string' && oldJSON.Project[name]) {
            rimraf(join(downloadDir, 'Project', name), {}, (err) => {
              if (err) {
                reject([err, {}]);
              } else {
                StatusJSONManager.deleteAGlobalExtensionFromStatusJSON(name, 0);
              }
            });
          }
        }
        if (type === 1) {
          if (name !== '' && typeof name === 'string' && oldJSON.Plugin[name]) {
            rimraf(join(downloadDir, 'Plugin', name), {}, (err) => {
              if (err) {
                reject([err, {}]);
              } else {
                StatusJSONManager.deleteAGlobalExtensionFromStatusJSON(name, 1);
              }
            });
          }
        }
        resolve([null, StatusJSONManager.readStatusJSON()]);
      } catch (err) {
        reject([err, {}]);
      }
    });
  }

  reset() {
    const downloadDir = getDownloadDir();
    let res = [];
    try {
      rimraf.sync(join(downloadDir, 'Plugin'));
      rimraf.sync(join(downloadDir, 'Project'));
      StatusJSONManager.updateStatusJSON({}, true);
    } catch (e) {
      res = [e, 1];
    }
    res = [null, 0];

    return res;
  }

  // !!!该函数只能在第一次创建内置插件时使用!!!
  installBuildinProjectPackages(packagesInfo = []) {
    let packages;
    packages = Array.isArray(packagesInfo) ? packagesInfo : [packagesInfo];
    packages = this.normalizePackagesInfo(packagesInfo);

    if (Object.keys(packages).length) {
      packages = Object.keys(packages).reduce((prev, pkg) => {
        const newPackage = packages[pkg];
        newPackage.status = 'installed';
        newPackage.aversion = newPackage.version;
        const newObj = Object.assign({}, prev, {
          [newPackage.name]: {
            [newPackage.name]: newPackage,
          },
        });

        return newObj;
      }, {});

      packages = {
        Project: packages,
      }

      StatusJSONManager.updateStatusJSON(packages);
    }
  }
}

module.exports = PackageManager;
