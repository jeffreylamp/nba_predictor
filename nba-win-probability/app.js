
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
  if (time_in_nyc <= 0) {
    time_in_nyc += 24;
  }
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

    yh.predict("nbaPredictor", null, data, function(preds) {
      var i = 0;
      preds.pred.forEach(function(pred) {
        result[i].pred = pred;
        i++;
      })
      res.send(result)  
    });
  });
});

app.use(function(req, res, next) {
  res.send('Page not found', 404);
});

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


var io = require('socket.io').listen(server, { log: false });


io.sockets.on("connection", function(socket) {

  console.log("welcome to the party!");

  socket.on("subscribe", function(game_id) {
    socket.join(game_id);
    console.log(socket.id + " just joined => " + game_id);
  });

  socket.on("disconnect", function() {
    console.log("goodbye");
  });

});


/*
 * We're polling our database here. We're just looking for any new scores. Once we identify new
 * scores, we push them to the client.
 */
var last_id = -1;
setInterval(function() {
  nba.getGameData(last_id, function(err, result) {
    if (result.length > 0) {
      _.each(result, function(row) {
        io.sockets.in(row.gameid).emit("newdata", row);
      });
      last_id = result.slice(-1)[0]._id;
    } 
  });
}, 59*1000);

