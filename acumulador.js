/**
 * Created by dgsalas on 9/10/14.
 */

function AcumuladorMilo(canal, redis_cli, subscribe, socket, client, divisas) {

    this.canal = canal;
    this.subscribe = subscribe;

    this.inicializar = function(procesar) {
        this.subscribe.subscribe(this.canal);

        this.subscribe.on("subscribe", function (canal, count) {
            console.log('Nos hemos suscrito al canal: ' + canal+ '.Somos el número: ' + count);
        });

        this.subscribe.on("message", function (canal, message) {

            procesar(canal, message, redis_cli, client, divisas);
        });
    }
}

exports.AcumuladorMilo = AcumuladorMilo;