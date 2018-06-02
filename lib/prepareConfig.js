'use strict';

const expandPath = require('./expandPath');

const configDefaults = {
  name: 'mockyeah',
  host: 'localhost',
  port: 4001,
  fixturesDir: './fixtures',
  capturesDir: './mockyeah',
  proxy: true,
  record: false,
  adminServer: true,
  adminHost: 'localhost',
  adminPort: 4777
};

module.exports = config => {
  config.adminHost = config.adminHost || config.host;
  config.proxy = typeof config.proxy !== 'undefined' ? config.proxy : config.record;

  config = Object.assign({}, configDefaults, config || {});

  // Expand file system configuration paths relative to configuration root
  config.fixturesDir = expandPath(config.fixturesDir);
  config.capturesDir = expandPath(config.capturesDir);
  config.httpsKeyPath = config.httpsKeyPath && expandPath(config.httpsKeyPath);
  config.httpsCertPath = config.httpsCertPath && expandPath(config.httpsCertPath);

  return config;
};
