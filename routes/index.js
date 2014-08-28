
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Milo, realtime reporting for Pademobile' });
};

exports.log = function(req, res){
    res.render('log', { title: '' });
};