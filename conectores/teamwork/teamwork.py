# -*- coding: utf-8 -*-

__author__ = 'dgsalas'

import requests
import simplejson
from datetime import datetime, timedelta
from time import strptime, mktime
import redis

TEAMWORK_API_KEY = 'france430bulb'

URL_BASE = 'https://pademobile.teamworkpm.net/'

class ConectorTeamwork:

    usuarios = []
    r = None

    def __init__(self):

        self.CargarUsuarios()

        self.r = redis.StrictRedis(host='localhost', port=6379, db=0)
        subs = self.r.pubsub()
        subs.subscribe(['timetrack-teamwork'])


    def LlamarServicio(self, url, params=[]):

        respuesta = requests.get(URL_BASE+url, auth=(TEAMWORK_API_KEY,'xxx'), params=params)
        # print respuesta.content

        # TODO: Gestionar errores en la llamada

        return simplejson.loads(respuesta.content)

    def CargarUsuarios(self):

        usuarios = self.LlamarServicio('people.json')
        self.usuarios = []

        for person in usuarios['people']:
            if 'pademobile' in person['email-address']:
                self.usuarios.append({'nombre': '%s %s' % (person['first-name'], person['last-name']),
                                      'email': person['email-address'],
                                      'avatar': person['avatar-url'],
                                      'title': person['title'],
                                      'id': person['id'],
                                      'horas': []})

        for person in self.usuarios:
            print "%s (%s)" % (person['nombre'], person['email'])

    def usuario(self, id):
        for u in self.usuarios:
            if u['id'] == id:
                return u

    def fecha_usuario(self, id, fecha):

        for hora in self.usuario(id)['horas']:
            if hora['fecha'] == fecha.strftime('%Y%m%d'):
                return hora

        hora = self.usuario(id)['horas'].append({ 'fecha': fecha.strftime('%Y%m%d'), 'horas': 0})

        for hora in self.usuario(id)['horas']:
            if hora['fecha'] == fecha.strftime('%Y%m%d'):
                return hora

    def CargarHoras(self, fecha):

        horas = self.LlamarServicio('time_entries.json', {'fromdate': fecha.strftime('%Y%m%d')})# , 'todate': fecha.strftime('%Y%m%d') })

        for hora in horas['time-entries']:
            dia = strptime(hora['date'][0:10], '%Y-%m-%d')
            dia = datetime.fromtimestamp(mktime(dia))
            dato = self.fecha_usuario(hora['person-id'], dia)
            dato['horas'] += float(hora['hours']) + (float(hora['minutes']) / 60)

        print "---------------------------"
        print ""
        print "---------------------------"

        for u in self.usuarios:
            if not u['horas'] == []:
                print '%s' % (u['nombre'])

                for dia in u['horas']:
                    print "  %s - %s horas" % (dia['fecha'], dia['horas'])

    def exportar_a_redis(self):
        self.r.publish('timetrack-teamwork', simplejson.dumps(self.usuarios))



if __name__ == '__main__':

    conector = ConectorTeamwork()

    hoy = datetime.today() - timedelta(days=10)

    conector.CargarHoras(hoy)
    conector.exportar_a_redis()
