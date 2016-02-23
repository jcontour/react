/*---------- BASIC SETUP ----------*/
var express     = require('express'),
    bodyParser  = require('body-parser');   // helper for parsing HTTP requests
var app = express();                        // our Express app
var PORT = 4000;

// Body Parser
app.use(bodyParser.urlencoded({ extended: false }));// parse application/x-www-form-urlencoded
app.use(bodyParser.json());                         // parse application/json

// Express server
app.use(function(req, res, next) {
    // Setup a Cross Origin Resource sharing
    // See CORS at https://en.wikipedia.org/wiki/Cross-origin_resource_sharing
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('incoming request from ---> ' + ip);
    var url = req.originalUrl;
    console.log('### requesting ---> ' + url);  // Show the URL user just hit by user
    next();
});

app.use('/', express.static(__dirname + '/public'));


// -----> Socket.io setup
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(PORT, function(){
    console.log('Express server is running at ' + PORT);
});

var rooms = {};

/*-------------- APP --------------*/
io.on('connection', function(socket) {
    /*––––––––––– SOCKET.IO starts here –––––––––––––––*/

    console.log('A new user has connected: ' + socket.id);

    // Listeners

    // when user enters lobby
    socket.on('lobby', function(){
        // send back list of chat rooms available
        socket.emit('room-list', {
            rooms: rooms
        });
    });
    // when user creates a new room
    socket.on('create-room', function(roomName){
        // create a random ID of chars & numbers with 7 char
        var id = createId(7);
        // append new room to rooms object
        // [] creates a new parameter of the object
        // ... that is also an object
        rooms[id] = {
            name: roomName,
            members: 0      //number of members in this room
        };

        console.log('New room ID: '+ id + ', Name: '+ rooms[id].name);
        socket.emit('room-list', {
            rooms: rooms
        });
    });

    socket.on('room', function(roomId){
        console.log('user has joined room ' + roomId);
        socket.join(roomId); //-------<<<NEW>>>--------//
        rooms[roomId].members ++;  //updating number of members
        socket.emit('joined-room', {
            room: rooms[roomId]
        })
    })

    socket.on('msg-to-server', function(msg){
        // UPDATE VALUE FOR GRAPH WITH MSG
        io.to(roomId).emit('update-graph', {
            yay: yay,
            nay: nay,
            poop: poop,
            wtf: wtf,
            uh: uh
        })
    })

    // socket.on('msg-to-server', function(msg){
    //     // socket.rooms[0] //this is a private room for each user created when they join the connection
    //     var roomId = socket.rooms[1];
    //     io.to(roomId).emit('msg-to-clients', {  //-------<<<NEW>>>--------//send msg to specific room
    //         msg: msg
    //     })


    // });

    // Disconnecting
    socket.on('disconnect', function() {
        io.sockets.emit('bye', 'See you, ' + socket.id + '!');
    });
});

// https://gist.github.com/gordonbrander/2230317
function createId(n) {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 7 characters
    // after the decimal.
    return Math.random().toString(36).substr(2, n);
}

