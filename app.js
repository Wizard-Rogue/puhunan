var config = require('./config')
  , express = require('express')
  , http = require('http')
  , path = require('path')
  , expressPath = require('express-path')
  , mongoose = require('mongoose')

var app = express();
var mongoStore = require('connect-mongo')(express);

// database
mongoose.connect('mongodb://' + config.db.server + '/' + config.db.name);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.compress());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser("puhunan"));
app.use(express.session({
	secret: config.app.cookieSecret,
	store: new mongoStore({
		db: config.db.name
	})
}));

app.use(express.methodOverride());
app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

if (req.method == 'OPTIONS') {
		res.send(200);
	}
	else {
		next();
	}
});
expressPath(app, 'routeMap');
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.locals.pretty = true;
	app.use(express.errorHandler());
}

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
	http.createServer(app).listen(app.get('port'), function(){
		console.log('Express server listening on port ' + app.get('port'));
		// Initiate the Cron Job on the Times controller
		var times = require('./controllers/times');
		times.setupQueue();
	});
});