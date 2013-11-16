function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

pad = function(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
secondsToQuarter = function(s) {
  var quarter = "Q" + (4 - Math.floor(s / 720));
  var min = Math.floor((s % 720) / 60);
  var sec = (s % 720) - min*60;
  return quarter + " " + pad(min, 2) + ":" + pad(sec, 2);
}

makeLineChart = function(_id, selector, swidth, sheight) {
  var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = swidth - margin.left - margin.right,
    height = sheight - margin.top - margin.bottom;

  // reverse x scales
  var x = d3.scale.linear()
      .domain([0, 2880])
      .range([width, 0]);

  var y = d3.scale.linear()
      .range([height, 0])
      .domain([0, 1.0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .tickFormat(function(d) {
        return "Q" + ((2880 - d) / 720);
      })
      .orient("bottom")
      .tickValues([2880 - 720*1, 2880 - 720*2, 2880 - 720*3, 2880 - 720*4]);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var line = d3.svg.line()
      .x(function(d) { return x(d.time_remaining); })
      .y(function(d) { return y(d.pred); });

  var line2 = d3.svg.line()
      .x(function(d) { return x(d.time_remaining); })
      .y(function(d) { return y(1 - d.pred); });

  var svg = d3.select(selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  d3.json("/game/" + _id + "/json", function(data) {
    var d = data.slice(-1)[0];
    var boxscore = "<table border=1><tr><td><span style='color: crimson'>" + d.visitor + "</span></td><td>" + d.visitor_score + "</td></tr>";
    boxscore += "<tr><td><span style='color: steelblue'>" + d.home + "</span></td><td>" + d.home_score + "</td></tr></table>";
    boxscore += "<h6>" + secondsToQuarter(d.time_remaining) + "</h6>";
    $(selector).prepend(boxscore);

    var i = 1
      , newdata = [];
    data.slice(0, -1).forEach(function(d) {
      newdata.push(d);
      var d = clone(d);
      d.time_remaining = data[i].time_remaining;
      newdata.push(d);
      i++;
    });
    data = newdata;
    var visitor = data[0].visitor
      , home = data[0].home
      , title = visitor + " @ " + data[0].home;

    $("#game_" + _id).prepend("<a href='/game/" + _id + "'><h4>" + title + "</h4></a>");
    $("#game_" + _id).append("")
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)

    // horizontal at 0.5
    svg.append("path")
        .datum([{time_remaining: 2800, pred: 0.5}, {time_remaining: 0, pred: 0.5}])
        .attr("class", "prob0")
        .attr("d", line);
    // P(Home Win) line
    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("data-legend",function(d) { return d[0].home})
        .attr("d", line);
    // P(Home Win) dots
    svg.selectAll(".dot")
          .data(data)
        .enter().append("circle")
          .attr("class", "dot")
          .attr("r", 5.0)
          .attr("cx", function(d) { return x(d.time_remaining); })
          .attr("cy", function(d) { return y(d.pred); })
          // hover over
          .call(d3.helper.tooltip()
                .attr({class: function(d, i) {
                  return d + ' ' +  i + ' A';
                }})
                .attr("class", "timehover")
                .style({
                  "font-size": "20px",
                  "background-color": "white",
                  "border-style": "solid",
                  "border-width": "1px"
                })
                .text(function(d, i){ 
                  var msg = '';
                  msg += "<table border=1><tr><td><span style='color: crimson'>" + d.visitor + "</span></td><td>" + d.visitor_score + "</td></tr>";
                  msg += "<tr><td><span style='color: steelblue'>" + d.home + "</span></td><td>" + d.home_score + "</td></tr></table>";
                  msg += 'P(' + d.home + ' win)='+ Math.round(100*d.pred, 3) + "%";
                  msg += "<br>Time Remaining: " + secondsToQuarter(d.time_remaining);
                  return msg;
                })
            )

    // P(Visitor Win)
    svg.append("path")
        .datum(data)
        .attr("class", "line2")
        .attr("data-legend",function(d) { return d[0].visitor})
        .attr("d", line2);
    // P(Visitor Win) dots
    svg.selectAll(".dot2")
          .data(data)
        .enter().append("circle")
          .attr("class", "dot")
          .attr("r", 5.0)
          .attr("cx", function(d) { return x(d.time_remaining); })
          .attr("cy", function(d) { return y(1 - d.pred); })
          // hover over
          .call(d3.helper.tooltip()
                .attr({class: function(d, i) {
                  return d + ' ' +  i + ' A';
                }})
                .attr("class", "timehover")
                .style({
                  "font-size": "20px",
                  "background-color": "white",
                  "border-style": "solid",
                  "border-width": "1px"
                })
                .text(function(d, i){ 
                  var diff = d.home_lead.toString();
                  // if (diff.slice(0)!="-") {
                  //   diff = "+" + diff;
                  // }
                  var msg = '';
                  msg += "<table border=1><tr><td><span style='color: crimson'>" + d.visitor + "</span></td><td>" + d.visitor_score + "</td></tr>";
                  msg += "<tr><td><span style='color: steelblue'>" + d.home + "</span></td><td>" + d.home_score + "</td></tr></table>";
                  msg += 'P(' + d.visitor + ' win)='+ Math.round(100*(1 - d.pred), 3) + "%";
                  msg += "<br>Time Remaining: " + secondsToQuarter(d.time_remaining);
                  return msg;
                })
            )
          .on('mouseover', function(d, i){
            //d3.select(this).style({fill: 'white'});
          })
          .on('mouseout', function(d, i){
            //d3.select(this).style({fill: 'crimson'});
          });

    /*
     legend = svg.append("g")
        .attr("class","legend")
        .attr("transform","translate(25,15)")
        .style("font-size","8px")
        .call(d3.legend)
    */
  });
}

addToChart = function(_id, data) {

};


