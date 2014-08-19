
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var paginas = require('./routes/paginas');
var http = require('http');
var path = require('path');
var moment = require('moment');

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
app.get('/pagina1',  paginas.pagina1);
app.get('/pagina2', paginas.pagina2);
app.get('/pagina3', paginas.pagina3);
app.get('/pagina4', paginas.pagina4);

server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Milo server listening on port ' + app.get('port'));
});

const redis = require('redis');
const client = redis.createClient();

console.log('info', 'connected to redis server');

var io = require('socket.io');

function acumular(clave, objeto, criterio, redis_cli) {
    console.log('Acumulando '+criterio+' en '+clave);
    if (objeto.importe != null) {
        redis_cli.get(clave, function (err, reply) {
            // reply is null when the key is missing
            if (reply != null) {
                var total = JSON.parse(reply);
            } else {
                var total = {};
            }

            if (total[objeto[criterio]] == null) {
                total[objeto[criterio]] = 0;
            }

            total[objeto[criterio]] = total[objeto[criterio]] + Math.abs(objeto.importe);

            redis_cli.set(clave, JSON.stringify(total));

            total['']

            return total
        });
    };
}

if (!module.parent) {
    const socket  = io.listen(server);

    socket.on('connection', function(client) {
        const subscribe = redis.createClient();
        const redis_cli = redis.createClient();

        console.log('Suscribiéndonos');

        subscribe.on("subscribe", function (channel, count) {
            console.log('Nos hemos suscrito al canal: ' + channel + '.Somos el número: ' + count);
        });

        subscribe.on("message", function (channel, message) {
            socket.emit('msg', {'msg': message});
            client.send(message);

            var objeto = JSON.parse(message);

            var fecha = new Date(moment(objeto.fecha, "DD/MM/YYYY HH:mm:ss"));

            // aquí deberíamos ir acumulando los diferentes totales, y entregarlos a cada página?

            var totales = acumular("total_canal_" + moment(fecha).format('DDMMYYYY'), objeto, 'canal', redis_cli);
            client.send(totales);
            var totales = acumular("total_accion_" + moment(fecha).format('DDMMYYYY'), objeto, 'nombre_accion', redis_cli);
            client.send(totales);
            var totales = acumular("total_estado_" + moment(fecha).format('DDMMYYYY'), objeto, 'nombre_estado', redis_cli);
            client.send(totales);
            var totales = acumular("total_usuario_" + moment(fecha).format('DDMMYYYY'), objeto, 'usuario', redis_cli);
            client.send(totales);
        });

        subscribe.subscribe("transacciones-pademobile");

    });
}