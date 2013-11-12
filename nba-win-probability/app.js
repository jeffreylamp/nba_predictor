
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , pg = require('pg')
  , _ = require('underscore')
  , uuid = require('uuid');

var app = express()
  , connections = {}
  , conString = process.env["PQ_URI"] || "postgres://glamp@localhost/dev";

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
  res.render('index', { title: "NBA Win Probability" });
});

app.get('/scores', function(req, res) {
  // keep the connection open indefinitely
  req.socket.setTimeout(Infinity);
  // create a way for us to push data to the client
  var conn = {
    id: uuid.v4(),
    send: function(data) {
      var body  = 'data: ' + JSON.stringify(data) + '\n\n';
      res.write(body);
    }
  };
  console.log("new connection. grabbing initial data...");
  getGameData(-1, function(err, result) {
    if (err) {
      console.log("error fetching initial data: " + err);
    }
    console.log("nrows: " + result.length);
    _.each(result, function(row) {
      conn.send(row);
    });
  });
  connections[conn.id] = conn;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable buffering for nginx
  });
  res.write('\n');

  req.on('close', function() {
    delete connections[conn.id];
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

getGameData = function(firstId, fn) {
  pg.connect(conString, function(err, db, done) {
      if(err) {
        return console.error('could not connect to postgres', err);
      }
      var d1 = new Date();
      d = d1.getFullYear() + "-" + d1.getMonth() + "-" + d1.getDate();
      var q = "select * from os_nba_games where _id > " + firstId + " and gamedate >= '" + d + "';";
      db.query(q, function(err, result) {
        if(err) {
          return console.error('error running query', err);
        }
        fn(null, result.rows);
      });
    });
};

var last_id = -1;
setInterval(function() {
  getGameData(last_id, function(err, result) {
    if (result.length > 0) {
      _.each(connections, function(conn) {
        _.each(result, function(row) {
          conn.send(row);
        });
      });
      last_id = result.slice(-1)[0]._id;
    }
  });
}, 5*1000);

