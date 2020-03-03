const express = require('express');
const routes = require('./routes/index');

const app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.use(express.static(__dirname + '/assets'));

app.use('/', routes);

module.exports = app;
