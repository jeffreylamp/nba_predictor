
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , pg = require('pg')
  , _ = require('underscore')
  , uuid = require('uuid')
  , coffee = require('coffee-script')
  , yhat = require('yhat')
  , nba = require('./lib/nba')(process.env["PG_URI"] || "postgres://glamp@localhost/dev");

var app = express()
  , connections = {}
  , yh = yhat.init(
        process.env["YHAT_USERNAME"],
        process.env["YHAT_APIKEY"],
        process.env["YHAT_URI"]
      );

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
  var time_in_nyc = new Date().getHours() - parseInt(process.env["TZ_OFFSET"] || "0");
  if (time_in_nyc > 17) {
    res.redirect('/today');
  } else {
    res.redirect('/yesterday');
  }
});

app.get('/api', function(req, res) {
  res.render('api');
});

app.get('/today', function(req, res) {
  var today = new Date();
  today = [today.getFullYear(), today.getMonth() + 1, today.getDate()].join("-");
  res.render("games", { title: "NBA Games | " + today, date: today });
});

app.get('/yesterday', function(req, res) {
  var today = new Date();
  today = [today.getFullYear(), today.getMonth() + 1, today.getDate()-1].join("-");
  res.render("games", { title: "NBA Games | " + today, date: today });
});

app.get('/games/:date', function(req, res) {
  res.render("games", { title: "NBA Games | " + req.params.date, date: req.params.date });
});

/*
 * API endpoint for getting all games for 1 day
 */
app.get('/games/:date/json', function(req, res) {
  nba.gamesForDate(req.params.date, function(err, result) {
    res.send(result);
  });
});


app.get('/gamesids/:date/json', function(req, res) {
  nba.gameIdsForDate(req.params.date, function(err, result) {
    res.send(result);
  });
});

app.get('/game/:_id', function(req, res) {
  res.render("single-game", {
    title: "NBA Games | " + req.params._id,
    _id: req.params._id
  });
});

/*
 * API endpoint for getting one game
 */
app.get('/game/:_id/json', function(req, res) {
  nba.gameById(req.params._id, function(err, result) {
    var keys = _.keys(result[0])
      , data = {};
    _.each(keys, function(k) {
      data[k] = _.pluck(result, k);
    });

    yh.predict("nbaPredictor", -1, data, function(preds) {
      var i = 0;
      preds.pred.forEach(function(pred) {
        result[i].pred = pred;
        i++;
      })
      res.send(result)  
    });
  });
});

/*
 * We're going to use long polling here instead of the "typical" socket.io
 * setup. This is because there really isn't a reason that the client would
 * need to push data back to the server (at least in the app's current form).
*/
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
  /* To keep things simple, we're just going to send all of today's game data 
     to the client. This will give us a page that will auto-update as scores
     of games change.
  */
  nba.getGameData(-1, function(err, result) {
    if (err) {
      console.log("error fetching initial data: " + err);
    }
    console.log("nrows: " + result.length);
    _.each(result, function(row) {
      conn.send(row);
    });
  });
  connections[conn.id] = conn;

  //Just fulfilling the protocol here. This will make sure the connection 
  //remains open between the client and server.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable buffering for nginx
  });
  res.write('\n');

  // when the client leaves, delete the corresponding connection
  req.on('close', function() {
    delete connections[conn.id];
  });
});

app.use(function(req, res, next) {
  res.send('Page not found', 404);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


// var last_id = -1;
// setInterval(function() {
//   nba.getGameData(last_id, function(err, result) {
//     if (result.length > 0) {
//       _.each(connections, function(conn) {
//         _.each(result, function(row) {
//           conn.send(row);
//         });
//       });
//       last_id = result.slice(-1)[0]._id;
//     }
//   });
// }, 5*1000);

