
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var paginas = require('./routes/paginas');
var http = require('http');
var https = require('https');
var path = require('path');
var app = express();
var passport = require('passport')
    , GoogleStrategy = require('passport-google').Strategy
    , ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var acumulador = require('./acumulador.js');
var transacciones_pademobile = require('./acumuladores/transacciones_pademobile.js');

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.

var environment = process.env.NODE_ENV;
console.log(environment);

if (environment == 'development') {
    var url_base = 'http://localhost:3000/';
    var clientID = "313554578831-lc4tgo8tv2ovrt426b2h0vh6snlg55cq.apps.googleusercontent.com";
    var clientSecret = "-_eBhijCGke5k458Y--IblkU";

    var host_redis = 'localhost';

    var llamada_divisas = {
        host: 'www.pademobile.com',
        port: 50,
        path: '/ws/divisas.py/listado',
        method: 'GET'
    };

} else {
    if (environment == 'staging') {
        var url_base = 'http://localhost:3000/';
        var clientID = "313554578831-lc4tgo8tv2ovrt426b2h0vh6snlg55cq.apps.googleusercontent.com";
        var clientSecret = "-_eBhijCGke5k458Y--IblkU";

        var host_redis = 'repos.pademobile.com';

        var llamada_divisas = {
            host: 'www.pademobile.com',
            port: 50,
            path: '/ws/divisas.py/listado',
            method: 'GET'
        };

    } else {
        var url_base = 'http://milo.pademobile.com/';
        var clientID = '588509673621-2bu6b41dgiad3o0jkdfjj7cpvsh7j8bk.apps.googleusercontent.com';
        var clientSecret = 'ZQJOtRc3jqiuwjifZ_KRU7fb';

        var host_redis = 'localhost';

        process.env.PORT = 80;

        var llamada_divisas = {
            host: '192.168.250.162',
            port: 81,
            path: '/ws/divisas.py/listado',
            method: 'GET'
        };

    }
}

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
        res.redirect('/log');
    });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

// app.get('/', ensureLoggedIn('/auth/google'), routes.index);
app.get('/pagina1',  paginas.log);
app.get('/log/:pais?*', ensureLoggedIn('/auth/google'), paginas.log);
app.get('/pagina2', paginas.pagina2);
app.get('/pagina3', paginas.pagina3);
app.get('/mapa/:pais?*', paginas.mapa);
app.get('/tmap', paginas.tMap);

server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Milo server listening on port ' + app.get('port'));
});

const redis = require('redis');
const client = redis.createClient('6379',host_redis);

console.log('info', 'connected to redis server');

var io = require('socket.io');

var divisas = {};



if (!module.parent) {
    const socket  = io.listen(server);

    if ((environment == 'staging') || (environment == 'development')) {
        https.request(llamada_divisas, callback_divisas).end();
    } else {
        http.request(llamada_divisas, callback_divisas).end();
    }

    function callback_divisas(res) {
        res.setEncoding('utf8');
        var texto = '';
        res.on('data', function (chunk) {
            texto = texto + chunk;
        });

        res.on('end', function () {
            divisas = JSON.parse(chunk);

            divisas = divisas.divisas;

            divisas.push(
                {"cambio_venta":"1","datos_divisa":{"abreviatura":"USD","simbolo":"USD","formato":"$%.2f","prefijo":"$","decimales":2, "id":412,"sufijo":"dólares"},
                    "abreviatura":"USD","formato":"$%.2f","simbolo_divisa":"USD","precision":2,"cambio_compra":"1","cambio_referencia":"1","nombre":"Dólares USA","placeholder_divisa":"0.00 USD"});

            // divisas = { 'canal_mensaje': 'pademobile_divisas', 'divisas': divisas.divisas };
            // console.log(divisas);

            socket.on('connection', function(client) {
                console.log('antes de suscribirnos a redis '+host_redis);

                const subscribe = redis.createClient('6379',host_redis);
                const redis_cli = redis.createClient('6379',host_redis);

                console.log('Suscribiéndonos');

                var ac = new acumulador.AcumuladorMilo('transacciones-pademobile', redis_cli, subscribe, socket, client, divisas);
                ac.inicializar(transacciones_pademobile.procesar);

            });
        });
    }

}