// Hello.
//
// This is JSHint, a tool that helps to detect errors and potential
// problems in your JavaScript code.
//
// To start, simply enter some JavaScript anywhere on this page. Your
// report will appear on the right side.
//
// Additionally, you can toggle specific options in the Configure
// menu.

/*---------- BASIC SETUP ----------*/
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
        rooms[id] = {
            name: roomName,
            members: 0,
            sentiments: {
                yay: [],
                nay: [],
                poop: [],
                wtf: [],
                uh: []
            }
        };

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
        
        //add user id to current sentiment 
        rooms[roomId]["sentiments"][msg].push(socket.id);

        var yays = rooms[roomId].sentiments.yay.length;
        var nays = rooms[roomId].sentiments.nay.length;
        var poops = rooms[roomId].sentiments.poop.length;
        var wtfs = rooms[roomId].sentiments.wtf.length;
        var uhs = rooms[roomId].sentiments.uh.length;

        console.log(yays);

        // When the server receives a “message” type signal from the client   
        console.log('A client is speaking to me! They’re saying: ' + msg);
                // var saveCurrTime = 5; 
                 //does stuff on a timer running every 5 seconds of every minute
                new CronJob('*/15 * * * * *', function(){ //six parameters // sec min (24)hour day month dayoftheweek
                // * * * * * *

                var totalCurrTime = yays + nays + poops + wtfs + uhs;

                // console.log("THE CURRENTIME: "+ saveCurrTime);

                io.emit(totalCurrTime);   
             //  io.emit("TOTAL SENTIMENTS: "+totalCurrTime + saveCurrTime);  
               console.log("TOTAL SENTIMENTS: "+ totalCurrTime); 
            }, null, true, "msg-to-server"); 

        //emit new sentiment values
        io.to(roomId).emit('update-graph', rooms[roomId].sentiments );
    });

    // if (function(msg) { 
    //         console.log('Received Message: ' + msg); 
    //         var saveCurrTime = 5; 
    //         //does stuff on a timer running every 5 seconds of every minute
    //         new CronJob('*/5 * * * * *', function(){ //six parameters // sec min (24)hour day month dayoftheweek
    //             saveCurrTime++;
    //             io.emit(rooms[roomId].sentiments + counter);   
    //             console.log(rooms[roomId].sentiments + counter);
    //             // saveCurrTime();
    //         }, null, true, "msg-to-server"); 

    //         fs.appendFile('timestamps.txt', msg, function(saveCurrTime){
    //         console.log("sentiments");
    //         });

        // function saveCurrTime(){
        // var myData = new Date();    //date object
        //     myData = myData.toString() + '\n';      //turn it to string

        // fs.appendFile('timestamps.txt', myData, function(){
        //     console.log("sentiments");
        //     });
        // }

    // connection.on('message', function(message) {          
    // if (message.type === 'utf8') {              
    //     console.log('Received Message: ' + message.utf8Data);              
    //     var counter = 0;                 
    //     new cronJob('* * * * * *', function(){                  
    //         counter++;                  
    //         connection.sendUTF("Hello" + counter);                  
    //         console.log("Hello" + counter);              
    //     }, null, true, "America/Los_Angeles");          
    // } else if (message.type === 'binary') {              
    //     console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');              
    //     connection.sendBytes(message.binaryData);         
    //      }      
    // });         

    // Disconnecting
    socket.on('disconnect', function() {
        io.sockets.emit('bye', 'See you, ' + socket.id + '!');
        
        //removes id from sentiments on disconnect
        // var roomId = socket.rooms[1];
        // removeId(socket.id, rooms[roomId]["sentiments"]);

    });
});

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