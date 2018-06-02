'use strict';

const express = require('express');

const AdminServer = function(config, app) {
  console.log('admin');

  const admin = express();

  // `/record?name=foo`
  admin.use('/record', (req, res) => {
    if (!req.query.name) {
      res.status(500).send('Must provide a recording name.');
      return;
    }

    // We must proxy in order to record.
    app.proxy();

    app.record(req.query.name);

    res.send('ok');
  });

  admin.use('/record-stop', (req, res) => {
    app.record(false);

    res.send('ok');
  });

  return admin;
};

module.exports = AdminServer;
