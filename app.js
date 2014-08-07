
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/report', user.list);

server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Milo server listening on port ' + app.get('port'));
});

const redis = require('redis');
const client = redis.createClient();

console.log('info', 'connected to redis server');

var io = require('socket.io');

if (!module.parent) {
    const socket  = io.listen(server);

    socket.on('connection', function(client) {
        const subscribe = redis.createClient();

        console.log('Suscribiéndonos');

        subscribe.on("subscribe", function (channel, count) {
            console.log('Nos hemos suscrito al canal: ' + channel + '.Somos el número: ' + count);
        });

        subscribe.on("message", function (channel, message) {
            console.log("client1 channel " + channel + ": " + message);
            socket.emit('msg', {'msg': message});
            client.send(message);



//            msg_count += 1;
//            if (msg_count === 3) {
//                client1.unsubscribe();
//                client1.end();
//                client2.end();
//            }
        });

        subscribe.subscribe("transacciones-pademobile");

//        subscribe.subscribe('realtime');
//
//
//        subscribe.on("message", function(channel, message) {
//            socket.emit('msg', {'channel': channel, 'msg': message});
//            console.log('msg', "received from channel #" + channel + " : " + message);
//        });

    });
}