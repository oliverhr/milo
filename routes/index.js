
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Milo, realtime reporting for Pademobile' });
};