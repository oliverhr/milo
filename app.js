
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

var io = require('socket.io').listen(server);

io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);
});
socket = new io.Socket();


io.sockets.on('connection', function(socket){
    //send data to client
    setInterval(function(){

        var acciones = ['Envío de dinero', 'Pago de recibos', 'Compra de seguros'];
        var estados = ['Solicitada', 'Aprobada', 'Caducada'];
        var importe = Math.random() * 1000;

        var id = Math.floor((Math.random()*10)+1);

        var estado = estados[Math.floor(Math.random()*3)];
        var accion = acciones[Math.floor(Math.random()*3)];

        var fecha = new Date();

        var report = JSON.stringify( {"id": id,
                                      "fecha": fecha.getDay()+'/'+fecha.getMonth()+'/'+fecha.getFullYear()+' '+
                                                fecha.getHours()+':'+fecha.getMinutes()+':'+fecha.getSeconds(),
                                      "accion": accion,
                                      "estado": estado,
                                      "importe": importe} );

        socket.emit('msg', {'msg': report});
        // socket.emit('msgWrite', msgWrite);
    }, 1000);

    //recieve client data
    // socket.on('client_data', function(data){
    //     process.stdout.write(data.letter);
    //     msgWrite = msgWrite + data.letter;
    // });
});