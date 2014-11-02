/**
 * Created by dgsalas on 1/11/14.
 */

function actualizar_mensaje(mens, redis_cli) {
    // Recuperamos la última información de redis, comparamos e informamos del aumento en el número de horas por usuario

    redis_cli.get('timetrack', function (err, reply) {

        // reply is null when the key is missing
        if (reply != null) {
            var datos = JSON.parse(reply);
        } else {
            var datos = mens;
        }

        for (i=0; i<mens.datos.length; i++) {
            for (j=0; i<datos.length; i++) {
                if (mens.datos[i].id == datos[i].id) {
                    for (hora=0; hora<mens.datos[i].horas.length; hora++) {
                        for (hora_2=0; hora_2<datos[j].horas.length; hora_2++) {
                            if (mens.datos[i].horas[hora].fecha == datos[j].horas[hora_2].fecha) {
                                mens.datos[i].horas[hora].diferencia = mens[i].horas[hora].horas - datos[j].horas[hora_2].horas;
                            }
                        }
                    }
                }
            }
        }

        redis_cli.set('timetrack', JSON.stringify(mens));
        return mens;
    });
}

var moment = require('moment');

function procesar(canal, mensaje, redis_cli, client, divisas) {
    var objeto = JSON.parse(mensaje);

    var mens = {};
    mens['datos'] = objeto;
    mens['canal_mensaje'] = 'timetrack-teamwork';

    actualizar_mensaje(mens, redis_cli);

    client.send(JSON.stringify(mens));
}

exports.procesar = procesar;