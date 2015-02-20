/**
 * Get Current Environment
 */
var environment = process.env.NODE_ENV ? process.env.NODE_ENV: 'DEVELOPMENT';
console.log('Current Enviroment: ' + environment);

/**
 * Sever Settings
 */
var url_base = 'http://localhost';
var clientSecret = "-_eBhijCGke5k458Y--IblkU";
var host_redis = 'localhost';
var llamada_divisas = {
    host: 'localhost',
    port: 50000,
    path: '/ws/divisas.py/listado',
    method: 'GET'
};
process.env.PORT = 3000;

switch (environment) {
    case 'staging':
        url_base = 'http://localhost';
        clientSecret = "-_eBhijCGke5k458Y--IblkU";
        host_redis = 'repos.pademobile.com';
        llamada_divisas = {
            host: 'www.pademobile.com',
            port: 50,
            path: '/ws/divisas.py/listado',
            method: 'GET'
        };
        process.env.PORT = 4000;
    break;

    case 'production':
        url_base = 'http://milo.pademobile.com/';
        clientSecret = 'ZQJOtRc3jqiuwjifZ_KRU7fb';
        host_redis = 'localhost';
        llamada_divisas = {
            host: '192.168.250.162',
            port: 81,
            path: '/ws/divisas.py/listado',
            method: 'GET'
        };
        process.env.PORT = 80;
    break;
}

exports.env = environment
exports.url_base = url_base + ':' + process.env.PORT + '/';
exports.clientSecret = clientSecret;
exports.host_redis = host_redis;
exports.llamada_divisas = llamada_divisas;