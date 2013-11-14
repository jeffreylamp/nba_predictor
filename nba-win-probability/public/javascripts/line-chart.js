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

  var svg = d3.select(selector).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  d3.json("/game/" + _id + "/json", function(data) {
    var visitor = data[0].visitor
      , home = data[0].home
      , title = visitor + " @ " + data[0].home;

    $("#game_" + _id).prepend("<a href='/game/" + _id + "'><h4>" + title + "</h4></a>");

    // svg.append("text")
    //     .attr("x", (width / 2))             
    //     .attr("y", 0 - (margin.top / 2))
    //     .attr("text-anchor", "middle")  
    //     .style("font-size", "12px") 
    //     .text(title);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("x", width/2)
        .attr("y", 10)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("P(" + home + " win)");
    svg.append("text")
        .attr("x", width/2)
        .attr("y", height - 10)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("P(" + visitor + " win)");
    svg.append("path")
        .datum([{time_remaining: 2800, pred: 0.5}, {time_remaining: 0, pred: 0.5}])
        .attr("class", "prob0")
        .attr("d", line);
    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);
  });
}