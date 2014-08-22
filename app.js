
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
var passport = require('passport')
    , GoogleStrategy = require('passport-google').Strategy
    , ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.

var url_base = 'http://localhost:3000/';
var clientID = "313554578831-lc4tgo8tv2ovrt426b2h0vh6snlg55cq.apps.googleusercontent.com";
var clientSecret = "-_eBhijCGke5k458Y--IblkU";

var url_base = 'http://milo.pademobile.com/';
var clientID = '588509673621-2bu6b41dgiad3o0jkdfjj7cpvsh7j8bk.apps.googleusercontent.com';
var clientSecret = 'ZQJOtRc3jqiuwjifZ_KRU7fb';

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.use(new GoogleStrategy({
        clientID: clientID,
        clientSecret: clientSecret,
        callbackURL: url_base+"auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
// app.use(express.session({ secret: 'keyboard cat' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
    console.log('serialize');
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    console.log('deserialize');
    done(null, obj);
});


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/auth/google',
    passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/google' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

// app.get('/', ensureLoggedIn('/auth/google'), routes.index);
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

function acumular(clave, objeto, criterio, redis_cli, client) {
    // console.log('Acumulando '+criterio+' en '+clave);
    if (objeto.importe != null) {
        redis_cli.get(clave, function (err, reply) {
            // reply is null when the key is missing
            if (reply != null) {
                var total = JSON.parse(reply);
                total = total.datos;
            } else {
                var total = {};
            }

            if (criterio == 'usuario') {
                if (objeto.usuario.telefono.indexOf('AFIL') > -1) {
                    var valor_criterio = objeto.usuario.alias;
                } else {
                    var valor_criterio = 'Usuario';
                }
            } else {
                var valor_criterio = objeto[criterio];
            }

            if (total[valor_criterio] == null) {
                total[valor_criterio] = 0;
            }

            total[valor_criterio] = total[valor_criterio] + Math.abs(objeto.importe);

            var resultado = JSON.stringify({ "tipo": clave, "datos": total});

            redis_cli.set(clave, resultado);

            client.send(resultado);

            return resultado;
        });
    }
}

function acumular_total_dia(clave, objeto, redis_cli, client) {
    // console.log('Acumulando '+criterio+' en '+clave);
    if (objeto.importe != null) {
        redis_cli.get(clave, function (err, reply) {
            // reply is null when the key is missing
            if (reply != null) {
                var total = JSON.parse(reply);
                total = total.datos;
            } else {
                var total = { "transacciones": 0, "importe": 0 };
            }

            total.transacciones = total.transacciones + 1;
            total.importe = total.importe + Math.abs(objeto.importe);

            var resultado = JSON.stringify({ "tipo": clave, "datos": total});

            redis_cli.set(clave, resultado);

            client.send(resultado);

            return resultado;
        });
    }
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
            var total_dia = acumular_total_dia("total_" + moment(fecha).format('DDMMYYYY'), objeto, redis_cli, client);

            var totales = acumular("total_canal_" + moment(fecha).format('DDMMYYYY'), objeto, 'canal', redis_cli, client);
            totales = acumular("total_accion_" + moment(fecha).format('DDMMYYYY'), objeto, 'nombre_accion', redis_cli, client);
            totales = acumular("total_estado_" + moment(fecha).format('DDMMYYYY'), objeto, 'nombre_estado', redis_cli, client);
            totales = acumular("total_afiliado_" + moment(fecha).format('DDMMYYYY'), objeto, 'usuario', redis_cli, client);
        });

        subscribe.subscribe("transacciones-pademobile");

    });
}