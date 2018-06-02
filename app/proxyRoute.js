const fs = require('fs');
const path = require('path');
const url = require('url');
const mkdirp = require('mkdirp');
const proxy = require('http-proxy-middleware');
const isAbsoluteUrl = require('is-absolute-url');
const { resolveFilePath } = require('./lib/helpers');

const now = () => new Date().getTime();

module.exports = (req, res, next) => {
  if (!req.app.locals.proxying) {
    next();
    return;
  }

  const reqUrl = req.originalUrl.replace(/^\//, '');

  if (!isAbsoluteUrl(reqUrl)) {
    next();
    return;
  }

  const startTime = now();

  const middleware = proxy({
    target: reqUrl,
    changeOrigin: true,
    logLevel: 'silent', // TODO: Sync with mockyeah settings.
    ignorePath: true,
    onProxyRes: (proxyRes, req, res) => {
      if (req.app.locals.recording) {
        const { capturesDir } = req.app.config;

        if (!req.app.locals.recordingSuiteName) {
          res.status(500).send('If recording, must have a recording name.');
          return;
        }

        const capturePath = path.join(capturesDir, req.app.locals.recordingSuiteName);
        const filePath = resolveFilePath(capturePath, reqUrl);

        let body = '';

        proxyRes.on('data', function(data) {
          body += data;
        });

        proxyRes.on('end', function() {
          mkdirp.sync(capturePath);

          const parsedReqUrl = url.parse(reqUrl);

          const { statusCode: status, _headers: headers } = res;

          const latency = now() - startTime;

          const toRecord = {
            method: req.method.toUpperCase(),
            url: reqUrl,
            path: parsedReqUrl.path,
            options: {
              headers,
              status,
              raw: body,
              latency
            }
          };

          const json = JSON.stringify(toRecord, null, 2);

          fs.writeFile(filePath, json, err => {
            if (err) {
              // TODO: Better error logging.
              console.error('Error writing response', err, res);
            }
          });

          res.end(body);
        });
      }
    }
  });

  middleware(req, res, next);
};
