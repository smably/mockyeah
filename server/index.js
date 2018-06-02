'use strict';

const cors = require('cors');
const https = require('https');
const fs = require('fs');
const createCertFiles = require('create-cert-files');
const { partial } = require('lodash');
const App = require('../app');
const prepareConfig = require('../lib/prepareConfig');
const AdminServer = require('./admin');

/**
 * Server module
 * @param  {Object} config Application configuration.
 * @return {Instances} Instance of a http server.
 */
module.exports = function Server(config, onStart) {
  config = prepareConfig(config);

  // Instantiate an application
  const app = new App(config);

  // Enable CORS for all routes
  app.use(cors());

  function listen(secure, err) {
    if (err) throw err;
    this.rootUrl = `http${secure ? 's' : ''}://${this.address().address}:${this.address().port}`;
    app.log('serve', `Listening at ${this.rootUrl}`);
    // Execute callback once server starts
    if (onStart) onStart.call(this);
  }

  // Start server on configured host and port
  let server;

  if (config.portHttps) {
    let certFiles;
    if (!config.httpsKeyPath && !config.httpsCertPath) {
      certFiles = createCertFiles();
    } else {
      certFiles = {
        key: config.httpsKeyPath,
        cert: config.httpsCertPath
      };
    }

    /* eslint-disable no-sync */
    const key = fs.readFileSync(certFiles.key);
    const cert = fs.readFileSync(certFiles.cert);
    /* eslint-enable no-sync */

    const credentials = {
      key,
      cert
    };

    const httpsServer = https.createServer(credentials, app);

    server = httpsServer.listen(config.portHttps, config.host, partial(listen, true));
  } else {
    server = app.listen(config.port, config.host, partial(listen, false));
  }

  // Expose ability to stop server via API
  const close = function close(cb) {
    server.close(function callback() {
      app.log(['serve', 'exit'], 'Goodbye.');
      if (cb) cb();
    });
  };

  // Expose ability to implement middleware via API
  const use = function use() {
    app.use.apply(app, arguments);
  };

  if (config.adminServer) {
    // Instantiate an admin server
    const admin = new AdminServer(config, app);
    admin.listen(config.adminPort, config.adminHost, () => {
      console.log(`admin listening at http://${config.adminHost}:${config.adminPort}`);
    });
  }

  // Construct and return mockyeah API
  return Object.assign(
    { server },
    app.routeManager,
    { proxy: app.proxy, reset: app.reset },
    { use, config, close }
  );
};
