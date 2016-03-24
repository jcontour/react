var app = app || {};

app.main = (function() {
	console.log('Your code starts here!');

	var socket;
	var roomId;

	// connect to socket server
	var socketSetup = function(callback){
		console.log('Called socketStart.');
	    socket = io.connect();

	    // Listeners
	    socket.on('room-list', function(res){
	    	console.log(res);
	    	render('lobby', '#main-container', 'replace', res.rooms);
	    }); 

	    socket.on('joined-room', function(res){
	    	// console.log(res);
	    	render('room', '#main-container', 'replace', res.room);
	    	roomId = res.room;

	    	// turn this into a full page that shows up before the room page
	    	// make with radio buttons and stuff. 
	    	// getUserInfo();

	    	// rendering chart and initing graph
	    	// separate templates now so we can see vote count change independent of cron updating graph
	    	render('vote-count', '#vote-count', 'replace', res.room.sentiments);
	    	render('graph', '#graph', 'replace')
	    	drawChart(true);
	    });

	    socket.on('update-votes', function(res){
	    	console.log(res);
	    	render('vote-count', '#vote-count', 'replace', res);
	    });

	    socket.on('update-chart', function(){
	    	drawChart(false);
	    	console.log("updating...");
	    })
	};

    var hashRouter = function(){
		$(window).off('hashchange').on('hashchange', function() {
	    	var currentPage = location.hash.substring(2, location.hash.length);
	        console.log('Current hash is ' + currentPage);

	        if (currentPage == 'lobby') {
	        	loadData(currentPage);
	        } else if (currentPage.indexOf('/') > -1){	//if currentPage has a '/' in the hash
	        	roomId = currentPage.substring(currentPage.indexOf('/') + 1);
	        	currentPage = currentPage.substring(0, currentPage.indexOf('/'));
	        	//send page name and id
	        	loadData(currentPage, roomId);
	        }
	    });
	};

	var getUserInfo = function(){
		var age = prompt("How old are you?", "enter a number");
		var party = prompt("What party do you support?", "Democrat, Republican, or Other?");
		var city = prompt("What city do you live in?", " ");
		socket.emit('user-info', { age : age, party : party, city : city });
	};

	var loadData = function(template, data){
		console.log('Loading data for: ' + template);
		socket.emit(template, data);
	};

	var render = function(template, containerElement, method, data){
		console.log(method + ' ' + template + ' in ' + containerElement);
		if(data !== undefined){
			console.log(data);
		}
		var templateToCompile = $('#tpl-' + template).html();
		var compiled =  _.template(templateToCompile);
		if (method == 'replace') {
			$(containerElement).html(compiled({data: data}));
		} else if (method == 'append'){
			$(containerElement).append(compiled({data: data}));
		}

        attachEvents();
	};

	var attachEvents = function(){
		console.log('Called attachEvents.');
      	$('#js-btn-create-room').off('click').on('click', function(){
      		console.log('create room.');
      		createRoom();
      	});

      	$('.js-btn-send-vote').off('click').on('click', function(){
      		sendVote(this.id);
      	});
      	

      	$('#js-btn-exit-room').off('click').on('click', function(){
      		console.log('exit room.');
      		sendVote("remove");
      		socket.emit('exit-room');
      	});

      	var buttons = $('button');
		buttons.on('click', function() {
			if ($(this).hasClass('active')){
			  // buttons.removeClass('active').addClass('inactive');
			} else {
			  buttons.removeClass('active').addClass('inactive');
			  $(this).removeClass('inactive').addClass('active');
	}
});
	};

	var createRoom = function(){
		var roomName = $('#js-ipt-room-name').val();
		if(roomName.length > 0){
			socket.emit('create-room', roomName);
		}
	};	

	var sendVote = function(msg){
    	console.log('sending ' + msg);
    	socket.emit('msg-to-server', msg);
	};

	var x, y, xAxis, yAxis, line;

	var updateChart = function() {

		var color = d3.scale.category10();

		// Get the data again
		d3.csv("data/data.csv", function(error, data) {
		    data.forEach(function(d) {
		    	// parsing values // + means it's a number
		    	d.time = +d.time;
		    	color.domain(d3.keys(data[0]).filter(function(key) { return key !== "time"; }));	//mapping all values except time
		    });

		    var votes = color.domain().map(function(name) {		//mapping the value of individual votes
				return {
					name: name,
					values: data.map(function(d) {
						return {time: +d.time, sentiment: +d[name]};
					})
				};
			});

		    // Scale the range of the data
		    x.domain(d3.extent(data, function(d) { return d.time; }));

			y.domain([
				0,
				d3.max(votes, function(c) { return d3.max(c.values, function(v) { return v.sentiment; }); })
			]);

			// Select the section we want to apply our changes to
			var svg = d3.select("#chart-container").transition();

			svg.select('.line')
				.duration(100)
				.attr("d", function(d, i) { return line(d.values); }) 		//get values from votes map function
				;


			svg.select('.text')
				.duration(100)
				.attr("transform", function(d) { return "translate(" + x(d.value.time) + "," + y(d.value.sentiment) + ")"; })
				;

			svg.select(".x.axis") // change the x axis
	            .duration(100)
	            .call(xAxis)
	            ;
	        svg.select(".y.axis") // change the y axis
	            .duration(100)
	            .call(yAxis)
	            ;
	    });
	}

	var drawChart = function( initialize ) {
		$('#chart-container').empty()

		var margin = {top: 30, right: 20, bottom: 30, left: 50},
    		width = 450 - margin.left - margin.right,
    		height = 300 - margin.top - margin.bottom;

    	// set ranges
    	x = d3.scale.linear().range([0, width]);
		y = d3.scale.linear().range([height, 0]);


		// Define the axes
		xAxis = d3.svg.axis().scale(x)
		    .orient("bottom").ticks(5);

		yAxis = d3.svg.axis().scale(y)
		    .orient("left").ticks(5);

		// Define the line
		line = d3.svg.line()
    		.interpolate("basis")
    		.x(function(d) { return x(d.time); })
    		.y(function(d) { return y(d.sentiment); })
    		;

		// Adds the svg to canvas
		var svg = d3.select("#chart-container")
		    .append("svg")
		        .attr("width", width + margin.left + margin.right)
		        .attr("height", height + margin.top + margin.bottom)
		    .append("g")
		        .attr("transform", 
		              "translate(" + margin.left + "," + margin.top + ")")
		        ;

		var color = d3.scale.category10();

		// Get the data
		d3.csv("data/data.csv", function(error, data) {
		    data.forEach(function(d) {
		    	// parsing values // + means it's a number
		    	d.time = +d.time;
		    	color.domain(d3.keys(data[0]).filter(function(key) { return key !== "time"; }));
		    });

		    var votes = color.domain()
		    				.map(function(name) {		//mapping the value of individual votes
								return {
									name: name,		// setting sentiment name
									values: data.map(function(d) {
								return {time: +d.time, sentiment: +d[name]};  //coordinate points x = time, y = sentiment
					})
				};
			});

		    // Scale the range of the data
		    x.domain(d3.extent(data, function(d) { return d.time; }));	// scale based on time value 

			y.domain([		// scale based on max/min value of sentiments
				0,
				d3.max(votes, function(c) { return d3.max(c.values, function(v) { return v.sentiment; }); })
			]);

			// if ( initialize ) {
			    // Add the X Axis
			    svg.append("g")
			        .attr("class", "x axis")
			        .attr("transform", "translate(0," + height + ")")
			        .call(xAxis)
			        ;

			    // Add the Y Axis
			    svg.append("g")
			        .attr("class", "y axis")
			        .call(yAxis)
			        ;
			        
				// create vote gs		        
			    var vote = svg.selectAll(".vote")
					.data(votes)
					.enter()
					.append("g")
					.attr("class", "vote")
					;

				// append lines
				vote.append("svg:path")
					.attr("class", "line")
					.attr("d", function(d) { return line(d.values); }) 		//get values from votes map function
					.style("stroke", function(d) { return color(d.name); })
					.attr("fill", "none")
					;

				vote.append("text")		// add text labels
					.attr('class', 'text')
					.datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
					.attr("transform", function(d) { return "translate(" + x(d.value.time) + "," + y(d.value.sentiment) + ")"; })
					.attr("x", 3)
					.attr("dy", ".35em")
					.text(function(d) { return d.name; })
					;
	   
			// } else { 	// updating
			// }

		});	
    }

	var init = function(){	
		console.log('Initializing app.');
		hashRouter();
		socketSetup();
		attachEvents();
		location.hash = '/lobby';

	};

	return {
		init: init
	};

})();

window.addEventListener('DOMContentLoaded', app.main.init);