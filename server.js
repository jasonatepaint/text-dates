const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const parseSvc = require('plain-text-date-parser').availability;

app.use(express.static('./build'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  if (process.env.NODE_ENV === "development") {
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Credentials", true);
  }
  next();
});

app.post('/api/dates', function(req, res) {
  return parseSvc.parseDates(req.body.phrase)
    .then(result => res.send(result));
});

//Catch-all to allow react-routing
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, './build', 'index.html'));
});

//Do not change this port w/o also changing package.json [proxy] property
var PORT = 9000;
console.log("Running server on port " + PORT);
app.listen(PORT);
