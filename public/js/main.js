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
	    	console.log(res);
	    	render('room', '#main-container', 'replace', res.room);
	    });

	    socket.on('msg-to-clients', function(res){
	    	console.log(res);
	    	render('chat-item', '#chat-container', 'append', {
	    		timestamp: moment().format('hh:mm a'),
	    		msg: res.msg
	    	});
	    });
	}

	// Remember this one? Straight from our lesson #3
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

	// Any change to our hash will trigger this,
	// which will ask for some data from the server
	var loadData = function(template, data){
		console.log('Loading data for: ' + template);
		socket.emit(template, data);
	};

	// This is also from lesson #3, just adding some parameters:
	// method is either replace or append
	var render = function(template, containerElement, method, data){
		console.log(method + ' ' + template + ' in ' + containerElement);
		if(data !== undefined){
			console.log(data);
		}
		var templateToCompile = $('#tpl-' + template).html();
		var compiled =  _.template(templateToCompile);
		if (method == 'replace') {
			// underscore returns a string of html text
			$(containerElement).html(compiled({data: data}));
		} else if (method == 'append'){
			$(containerElement).append(compiled({data: data}));
		}

		//scroll to bottom of container
		var objDiv = document.getElementById('main-container');
		objDiv.scrollTop = objDiv.scrollHeight;

        // We've just created some new elements,
        // so let's attach the events to them
        attachEvents();
	};

	var attachEvents = function(){
		console.log('Called attachEvents.');
      	$('#js-btn-create-room').off('click').on('click', function(){
      		console.log('create room.');
      		createRoom();
      	});

      	$('#js-btn-send').off('click').on('click', function(){
      		sendMessage();
      	});
      	//unbind == .off 
      	$('#js-ipt-text').unbind('keypress').keypress(function(e){
      		if(e.keyCode == 13){
      			sendMessage();
      		}
      	});
	};

	var createRoom = function(){
		var roomName = $('#js-ipt-room-name').val();
		if(roomName.length > 0){
			socket.emit('create-room', roomName);
		}
	}	

	var sendMessage = function(){
		var chatMsg = $('#js-ipt-text').val();
		//checking to see if message has a script tag in it
		//b/c scripts can mess with web page
		var re = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
        var isScript;
        isScript = re.test(chatMsg);

        if(!isScript){
        	console.log('sending ' + chatMsg);
        	socket.emit('msg-to-server', chatMsg);
        }

        $('#js-ipt-text').val('');
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
