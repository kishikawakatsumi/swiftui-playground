'use strict';

const BodyParser = require('body-parser');
const Compression = require('compression');
const Express = require('express');

const app = Express();

function random(size) {
  return require('crypto').randomBytes(size).toString('hex');
}

app.use(Compression());
app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());
app.use(Express.static(__dirname + '/static'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', function(req, res) {
  res.render('index', {title: 'SwiftUI Playground'});
});

app.post('/run', function(req, res) {
  const path = require('path');
  const Sandbox = require('./sandbox');

  const root_dir = __dirname;
  const temp_dir = path.join('temp', random(10));

  const code = req.body.code;
  const defaultTimeout = 120;
  let timeout = req.body.timeout || defaultTimeout;

  if (!code) {
    const error = 'There is no code to run.';
    res.send({ output: '', errors: error, version: '' });
    return;
  }

  timeout = parseInt(timeout);
  const maxTimeout = 600;
  if (isNaN(timeout)) {
    timeout = defaultTimeout;
  } else if (timeout > maxTimeout) {
    timeout = maxTimeout;
  }

  const sandbox = new Sandbox(root_dir, temp_dir, code, timeout);
  sandbox.run(function(data, error, version) {
    res.send({ output: data.output, previews: data.previews, errors: error, version: version });
  });
});

var server = require('http').createServer(app);
server.listen(8080, function() {
  console.log('Playground app listening on port ' + server.address().port);
});
