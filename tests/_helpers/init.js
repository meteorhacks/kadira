Apm.connect('foo', 'bar');

Npm.require('http').createServer(function(req, res) {
  res.writeHead(200);
  res.end('hello');
}).listen(3301);

