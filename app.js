var express     = require('express'),
    bodyParser  = require('body-parser');   // helper for parsing HTTP requests
var app = express();                        // our Express app
var PORT = 4000;

var CronJob = require('cron').CronJob,
    fs = require('fs');

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
var user = {};
// var users = []


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

    // getting user demographic
    socket.on('user-info', function(info){
        user.age = info.age;
        user.party = info.party;
        user.city = info.city;
        user.id = socket.id;

        console.log(user);
        // users.push(user);
        // console.log(users);
    });

    // when user creates a new room
    socket.on('create-room', function(roomName){
        // create a random ID of chars & numbers with 7 char
        var id = createId(7);
        // append new room to rooms object
        // [] creates a new parameter of the object
        rooms[id] = {
            name: roomName,
            members: 0,
            sentiments: {
                yay: [],
                nay: [],
                poop: [],
                wtf: [],
                uh: []
            },
            time: 0.0
        };

        // use room id to have different cron for each room
        startCron(id);

        console.log('New room ID: '+ id + ', Name: '+ rooms[id].name);
        socket.emit('room-list', {
            rooms: rooms
        });
    });

    socket.on('room', function(roomId){
        console.log('user has joined room ' + roomId);
        socket.join(roomId);
        rooms[roomId].members ++;
        socket.emit('joined-room', {
            room: rooms[roomId]
        });
    });

    socket.on('msg-to-server', function(msg){
        //get room id
        var roomId = socket.rooms[1];

        //remove id from all sentiments
        removeId(socket.id, rooms[roomId].sentiments);

        if (msg !== "remove") {
            //add user id to current sentiment 
            rooms[roomId]["sentiments"][msg].push(socket.id);   
        }
        
        io.to(roomId).emit('update-votes', rooms[roomId].sentiments);

    });     

    //leaving a room
    socket.on('exit-room', function(){
        console.log('left room');
        leaveAllRooms(socket);
    });

    // Disconnecting
    socket.on('disconnect', function() {
        io.sockets.emit('bye', 'See you, ' + socket.id + '!');
        
        leaveAllRooms(socket);

    });
});

function startCron(id){
    console.log("starting cron")

    // create file/ overwrite any existing data and start with 0s
    fs.writeFile('public/data/data.csv', 'time,yay,nay,poop,wtf,uh\n0,0,0,0,0,0\n', function(err) {
    // fs.writeFile('public/data/data_' + id + '.csv', 'time,votes\n0,0 0 0 0 0\n', function(err) {
        if (err) {
           throw err;
        };
    });


    new CronJob('*/2 * * * * *', function(){

        // incrememt time
        rooms[id].time += .5;

        // create new data point with time/array of vote values
        dataPoint = rooms[id].time + "," + rooms[id]['sentiments']['yay'].length + "," + rooms[id]['sentiments']['nay'].length + "," + rooms[id]['sentiments']['poop'].length + "," + rooms[id]['sentiments']['wtf'].length + "," + rooms[id]['sentiments']['uh'].length; 

        dataPoint = dataPoint.toString() + '\n';

        // append to end of csv
        fs.appendFile('public/data/data.csv', dataPoint, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log('Writing file Async: ' + dataPoint);
            }
        });

        io.to(id).emit("update-chart");

    }, null, true, 'UTC');   
}

function leaveAllRooms(socket){
    console.log('Called leaveAllRooms.');
    console.log(socket.rooms);
    for(var i = 1; i < socket.rooms.length; i++){
        var roomId = socket.rooms[i];
        socket.leave(roomId);
        rooms[roomId].members --;
        console.log('Leaving ' + roomId + '. Members: ' + rooms[roomId].members);
    }
}

function removeId(id, sentimentobj){
    //loop through sentiments and remove user id if there. 
    for (var prop in sentimentobj) {
        if (!sentimentobj.hasOwnProperty(prop)) continue;

            var sentiment = sentimentobj[prop];

            if (sentiment.indexOf(id) !== -1 ){
                sentiment.splice(sentiment.indexOf(id), 1);
            }
    }
}


// https://gist.github.com/gordonbrander/2230317
function createId(n) {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 7 characters
    // after the decimal.
    return Math.random().toString(36).substr(2, n);
}