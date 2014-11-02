exports.log = function(req, res) {
    res.render('log', { 'pais': req.params.pais });
};

exports.timetrack = function(req, res){
    res.render('timetrack', { 'id_usuario': req.params.id_usuario });
};

exports.pagina3 = function(req, res){
    res.render('pagina3', {  });
};

exports.mapa = function(req, res){
    res.render('mapa', { 'pais': req.params.pais });
};

exports.tMap = function(req, res){
    res.render('tMap', {});
};