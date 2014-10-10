/**
 * Created by dgsalas on 9/10/14.
 */

var moment = require('moment');

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

            if (objeto.nombre_estado == 'Aprobada') {
                total[valor_criterio] = total[valor_criterio] + Math.abs(objeto.importe);
            }

            var resultado = JSON.stringify({ "tipo": clave, "datos": total});

            redis_cli.set(clave, resultado);

            client.send(resultado);

            return resultado;
        });
    }
}

function importe_en_divisa(importe, desde, pais, divisas) {
    switch (pais) {
        case 'MX' :
            var divisa_pais = 'MXN';
            break;
        case 'ES' :
            var divisa_pais = 'EUR';
            break;
        default:
            var divisa_pais = 'USD';
    }

    if (desde == null) {
        desde = divisa_pais;
    }

    for (i=0;i<divisas.length;i++) {
        // console.log(divisas[i].abreviatura);
        if (divisas[i].abreviatura == desde) {
            var datos_divisa_actual = divisas[i];
        }

        if (divisas[i].abreviatura == divisa_pais) {
            var datos_divisa_pais = divisas[i];
        }
    }

    var importe_en_divisa = importe / datos_divisa_actual.cambio_referencia * datos_divisa_pais.cambio_referencia;

    // console.log('Convirtiendo '+importe+' de '+datos_divisa_actual.cambio_referencia+' a '+datos_divisa_pais.cambio_referencia+' es '+importe_en_divisa);

    return importe_en_divisa;
}

function acumular_total_dia(clave, objeto, redis_cli, client, divisas) {
    redis_cli.get(clave, function (err, reply) {

        // reply is null when the key is missing
        if (reply != null) {
            var total = JSON.parse(reply);
            total = total.datos;
        } else {
            var total = { "transacciones": 0, "importe": 0, "transacciones_conimporte": 0, "comisiones": 0 };
        }

        // las transacciones del país
        var pais = objeto.pais;

        if (total[pais] == null) {
            total[pais] = { "transacciones": 0, "importe": 0, "transacciones_conimporte": 0, "comisiones": 0 };
        }

        if (objeto.nombre_estado == 'Aprobada') {

            var importe_divisa_local = importe_en_divisa(Math.abs(objeto.importe), objeto.divisa, objeto.pais, divisas);
            var importe_divisa_internacional = importe_en_divisa(Math.abs(objeto.importe), objeto.divisa, 'US', divisas);

            total.transacciones = total.transacciones + 1;
            total[pais].transacciones = total[pais].transacciones + 1;

            if (objeto.importe != null) {
                total.transacciones_conimporte = total.transacciones_conimporte + 1;
                total.importe = total.importe + importe_divisa_internacional;
                total[pais].transacciones_conimporte = total[pais].transacciones_conimporte + 1;
                total[pais].importe = total[pais].importe + importe_divisa_local;
            }

            var comisiones = 0;
            for (var prop in objeto.comisiones) {
                comisiones += Math.abs(objeto.comisiones[prop]);
            }

            var comision_divisa_local = importe_en_divisa(Math.abs(comisiones), objeto.divisa, objeto.pais, divisas);
            var comision_divisa_internacional = importe_en_divisa(Math.abs(comisiones), objeto.divisa, 'US', divisas);

            total.comisiones = total.comisiones + comision_divisa_internacional;
            total[pais].comisiones = total[pais].comisiones + comision_divisa_local;
        }

        var resultado = JSON.stringify({ "canal_mensaje": "pademobile_log_total", "tipo": clave, "datos": total});

        redis_cli.set(clave, resultado);

        console.log('Acumulando. Resultado:'+ resultado);

        client.send(resultado);

        return resultado;
    });
}

function procesar(canal, mensaje, redis_cli, client, divisas) {
    var objeto = JSON.parse(mensaje);

    var fecha = new Date(moment(objeto.fecha, "DD/MM/YYYY HH:mm:ss"));

    var mens = objeto;
    mens['canal_mensaje'] = 'pademobile_log_transaccion';

    client.send(JSON.stringify(mens));

    // aquí deberíamos ir acumulando los diferentes totales, y entregarlos a cada página?
    var total_dia = acumular_total_dia("pademobile_dia_total_" + moment(fecha).format('DDMMYYYY'), objeto, redis_cli, client, divisas);

//    var totales = acumular("total_canal_" + moment(fecha).format('DDMMYYYY'), objeto, 'canal', redis_cli, client);
//    totales = acumular("total_accion_" + moment(fecha).format('DDMMYYYY'), objeto, 'nombre_accion', redis_cli, client);
//    totales = acumular("total_estado_" + moment(fecha).format('DDMMYYYY'), objeto, 'nombre_estado', redis_cli, client);
//    totales = acumular("total_afiliado_" + moment(fecha).format('DDMMYYYY'), objeto, 'usuario', redis_cli, client);
}

exports.procesar = procesar;