/* Your code starts here */

var app = app || {};

app.main = (function() {
	console.log('Your code starts here!');

	var socket;

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
	    	// console.log(res.room.sentiments)
	    	render('graph', '#graph', 'replace', res.room.sentiments);	    
	    });

	    socket.on('update-graph', function(res){
	    	console.log(res);
	    	render('graph', '#graph', 'replace', res);
	    });
	}

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
	}

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
	};

	var createRoom = function(){
		var roomName = $('#js-ipt-room-name').val();
		if(roomName.length > 0){
			socket.emit('create-room', roomName);
		}
	}	

	var sendVote = function(msg){
    	console.log('sending ' + msg);
    	socket.emit('msg-to-server', msg);
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
