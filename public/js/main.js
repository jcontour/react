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
	    	initChart();
	    });

	    socket.on('update-votes', function(res){
	    	console.log(res);
	    	render('vote-count', '#vote-count', 'replace', res);
	    });

	    socket.on('update-chart', function(){
	    	updateChart();
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

      	$('#js-btn-send-yay').off('click').on('click', function(){
      		sendVote("yay");
      	});
      	$('#js-btn-send-nay').off('click').on('click', function(){
      		sendVote("nay");
      	});
      	$('#js-btn-send-poop').off('click').on('click', function(){
      		sendVote("poop");
      	});
      	$('#js-btn-send-wtf').off('click').on('click', function(){
      		sendVote("wtf");
      	});      	
      	$('#js-btn-send-uh').off('click').on('click', function(){
      		sendVote("uh");
      	});

      	$('#js-btn-exit-room').off('click').on('click', function(){
      		console.log('exit room.');
      		sendVote("remove");
      		socket.emit('exit-room');
      	});

      	var buttons = $('button');
		buttons.on('click', function() {
			if ($(this).hasClass('active')){
			  buttons.removeClass('active').addClass('inactive');
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

	var x, y, xAxis, yAxis, valueline;

	var updateChart = function() {
		// Get the data again
	    d3.csv("data/yay.csv", function(error, data) {
	       	data.forEach(function(d) {
		    	d.time = +d.time;
		    	d.votes = +d.votes;
		    });

	    	// Scale the range of the data again 
	    	x.domain(d3.extent(data, function(d) { return d.time; }));
		    y.domain([0, d3.max(data, function(d) { return d.votes; })]);

	    // Select the section we want to apply our changes to
	    var svg = d3.select("#chart-container").transition();

	    // Make the changes
	        svg.select(".line")   // change the line
	            .duration(250)
	            .attr("d", valueline(data));
	        svg.select(".x.axis") 
	            .duration(250)
	            .call(xAxis);
	        svg.select(".y.axis") 
	            .duration(250)
	            .call(yAxis);
	    });
	}

	var initChart = function() {

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
		valueline = d3.svg.line()
		    .x(function(d) { return x(d.time); })
		    .y(function(d) { return y(d.votes); });

		// Adds the svg canvas
		var svg = d3.select("#chart-container")
		    .append("svg")
		        .attr("width", width + margin.left + margin.right)
		        .attr("height", height + margin.top + margin.bottom)
		    .append("g")
		        .attr("transform", 
		              "translate(" + margin.left + "," + margin.top + ")");

		// Get the data
		d3.csv("data/yay.csv", function(error, data) {
		    data.forEach(function(d) {
		    	console.log(d.time, " ", d.votes)
		    	// parsing values 
		    	// + means it's a number
		        d.time = +d.time;
		        d.votes = +d.votes;
		    });

		    // Scale the range of the data
		    x.domain(d3.extent(data, function(d) { return d.time; }));
		    y.domain([0, d3.max(data, function(d) { return d.votes; })]);

			// Add the valueline path.
		    svg.append("path")
		        .attr("class", "line")
		        .attr('stroke', 'blue')
		        .attr('stroke-width', 2)
		        .attr('fill', 'none')
		        .attr("d", valueline(data));

		    // Add the X Axis
		    svg.append("g")
		        .attr("class", "x axis")
		        .attr("transform", "translate(0," + height + ")")
		        .call(xAxis);

		    // Add the Y Axis
		    svg.append("g")
		        .attr("class", "y axis")
		        .call(yAxis);    
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