'use strict';

const { existsSync, appendFileSync } = require('fs');

const { getLogsPath } = require('./path');

/**
 * Output a log message
 * if there is a log output file existed under the log path,
 * then the log messages are also should output to the local log file.
 * @param {string} info: log message
 */
function log(info) {
  const debug = parseInt(process.env.DEBUG) === 1;
  const logFilePath = getLogsPath();
  const isExistedLogFile = existsSync(logFilePath);
  if (isExistedLogFile) {
    appendFileSync(logFilePath, info, 'utf8');
  }
  if (debug) {
    console.log(info);
  }
}

module.exports.log = log;
