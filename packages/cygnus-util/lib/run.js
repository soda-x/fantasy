'use strict';

const os = require('os');
const { spawn } = require('child_process');

const { log } = require('./log');

/**
 * Call spawn
 * @param {string} nodePath: node bin/exe dir
 * @param {string} cmd: the name or path of the executable file to run
 * @param {array} args: list of string arguments
 * @param {string} cwd: current working directory
 * @param {function} fn: call fn when child process is closed
 */
function runCmd(nodePath, cmd, args = [], cwd, fn) {
  const PATH =
    os.platform() === 'win32'
      ? `${nodePath};${process.env.PATH}`
      : `${nodePath}:${process.env.PATH}`;
  const runner = spawn(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd,
    env: Object.assign({}, process.env, {
      CI: true,
      PATH,
      Path: PATH,
    }),
  });
  runner.stdout.on('data', data => {
    const info = data.toString();
    log(info);
  });
  runner.stderr.on('data', data => {
    const info = data.toString();
    log(info);
  });
  runner.on('close', code => {
    if (fn) {
      fn(code);
    }
  });
}

module.exports.runCmd = runCmd;
