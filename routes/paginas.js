exports.log = function(req, res) {
    res.render('log', { 'pais': req.params.pais });
};

exports.pagina2 = function(req, res){
    res.render('pagina2', {  });
};

exports.pagina3 = function(req, res){
    res.render('pagina3', {  });
};

exports.mapa = function(req, res){
    res.render('mapa', { 'pais': req.params.pais });
};