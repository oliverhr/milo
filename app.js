/**
 * Module dependencies
 */
var config = require('./settings')
console.log(config.url_base);

var express = require('express');
var io = require('socket.io');
var http = require('http');
var https = require('https');
var path = require('path');
var passport = require('passport')
var GoogleStrategy = require('passport-google').Strategy
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

/**
 * Local dependencies
 */
// var routes = require('./routes');
var paginas = require('./routes/paginas');
var acumulador = require('./acumulador.js');
var transacciones_pademobile = require('./acumuladores/transacciones_pademobile.js');

/**
 * Application instance
 */
var app = express();

/**
 * Use the GoogleStrategy within Passport.
 *
 * Strategies in passport require a `validate` function, which accept
 * credentials (in this case, an OpenID identifier and profile), and invoke a
 * callback with a user object.
 */
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var clientID = "313554578831-lc4tgo8tv2ovrt426b2h0vh6snlg55cq.apps.googleusercontent.com";

passport.use(new GoogleStrategy({
        clientID: clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.url_base + "auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick( function () {
            // To keep the example simple, the user's Google profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Google account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));

// all environments
app.set('port', process.env.PORT);
app.set('views', __dirname + '/views');
app.set('view engine', 'hjs');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.urlencoded());
app.use(express.json());
app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.cookieParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

/**
 * Passport session setup.
 *
 * To support persistent login sessions, Passport needs to be able to
 * serialize users into and deserialize users out of the session.  Typically,
 * this will be as simple as storing the user ID when serializing, and finding
 * the user by ID when deserializing.  However, since this example does not
 * have a database of user records, the complete Google profile is serialized
 * and deserialized.
 */
passport.serializeUser( function(user, done) {
    console.log('serialize');
    done(null, user);
});

passport.deserializeUser( function(obj, done) {
    console.log('deserialize');
    done(null, obj);
});

// Track errors on development only
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

/**
 * Create HTTP Server
 */
server = http.createServer(app);
server.listen(app.get('port'), function() {
    console.log('Milo server listening on port ' + app.get('port'));
});

/**
 * Redis connection
 */
const redis = require('redis');
const client = redis.createClient('6379', config.host_redis);
console.log('info', 'connected to redis server');


var divisas = {};

if (!module.parent) {
    const socket  = io.listen(server);

    if ((config.env == 'staging')) {
        https.request(config.llamada_divisas, callback_divisas).end();
    } else {
        http.request(config.llamada_divisas, callback_divisas).end();
    }

    function callback_divisas(res) {
        res.setEncoding('utf8');
        var texto = '';
        res.on('data', function (chunk) {
            texto = texto + chunk;
        });

        res.on('end', function () {
            divisas = JSON.parse(texto);

            divisas = divisas.divisas;

            divisas.push({
                "cambio_venta": "1",
                "datos_divisa": {
                    "abreviatura": "USD",
                    "simbolo": "USD",
                    "formato": "$%.2f",
                    "prefijo": "$",
                    "decimales": 2,
                    "id": 412,
                    "sufijo": "dólares"
                },
                "abreviatura": "USD",
                "formato": "$%.2f",
                "simbolo_divisa": "USD",
                "precision": 2,
                "cambio_compra": "1",
                "cambio_referencia": "1",
                "nombre": "Dólares USA",
                "placeholder_divisa": "0.00 USD"
            });
            console.log('Number of currencies parsed: ' + divisas.length);

            socket.on('connection', function(client) {
                console.log('antes de suscribirnos a redis ' + config.host_redis);

                const subscribe = redis.createClient('6379', config.host_redis);
                const redis_cli = redis.createClient('6379', config.host_redis);

                console.log('Suscribiéndonos');

                var ac = new acumulador.AcumuladorMilo(
                        'transacciones-pademobile',
                        redis_cli,
                        subscribe,
                        socket,
                        client,
                        divisas);
                ac.inicializar(transacciones_pademobile.procesar);
            });
        });
    }
}
