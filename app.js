var express = require('express');
var bodyParser = require('body-parser');
var sqlsv = require("mssql");
var Stomp = require('stomp-client');
var fs = require('fs')
var fsg = require('graceful-fs')
var url = require('url');
var http = require('http');
require('mongoose-pagination');
const { initDBCallBack } = require('./db/connections');
const nameFolder = {
    log: 'log',
}
const voiceRouter = require("./api/routers/voiceRouter");
require('colors');
global._socketUsers = {};
global.path = require('path');
global.fsx = require('fs.extra');
global._ = require('underscore');
global.__basedir = __dirname;
global._request = require('request');
global._rootPath = path.dirname(require.main.filename);
global._libsPath = path.normalize(path.join(__dirname, 'libs'));
global._commonPath = path.normalize(path.join(__dirname, 'common'));

const dotenv = require('dotenv')
dotenv.config()
try {
    // ghi đè biến môi trường để chạy tùy vào môi trường cần setup
    const envConfig = dotenv.parse( fs.readFileSync( path.join(_rootPath, '.env.local') ) )
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} catch (err) {
    // console.log('not set env local', err);
}

const {
    SYNC_RECORDING,
} = process.env

switch (process.env.NODE_ENV) {
    case 'development':
        global._config = require(path.normalize(path.join(__dirname, 'config', 'conf.dev.json')));
        break;
    case 'production':
        global._config = require(path.normalize(path.join(__dirname, 'config', 'conf.json')));
        break;
    default:
        global._config = require(path.normalize(path.join(__dirname, 'config', 'conf.json')));
        break;
}
global._dbPath = 'mongodb://' + _config.database.ip + ':' + _config.database.port + '/' + _config.database.name;
global._moment = require('moment');
global.moment = global._moment;
global._async = require('async');
global.mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
global._dbName = _config.database.name;
global._initDBCallBack = initDBCallBack;

// config excel
global.EXCEL_CONFIG = {
    fontName: 'Times New Roman',
    fontSizeTitle: 16,
    fontSizeTableHeader: 12,
    fontSizeTableBody: 10,
    colorTableHeader: "346D92",
    congTy: _config.app.name.toUpperCase(),
    phongBan: `Phòng chất lượng dịch vụ`.toUpperCase(),
};

global.mongodb = require('mongodb');
global.pagination = require('pagination');
global._Excel = require('exceljs');

global._HPCM = require(path.join(_rootPath, 'helpers', 'commons', 'create.js'));

global._menus = [];
global._menusAllows = {};

/**
 * make a log directory, just in case it isn't there.
 */
try {
    require("fs-extra").mkdirSync(nameFolder.log);
} catch (e) {
    if (e.code != "EEXIST") {
        console.error("Could not set up log directory, error was: ", e);
        process.exit(1);
    }
}

/**
 * make a assets/recording directory, just in case it isn't there.
 */
try {
    require("fs-extra").mkdirSync("assets/recording");
} catch (e) {
    if (e.code != "EEXIST") {
        console.error("Could not set up assets/recording directory, error was: ", e);
        process.exit(1);
    }
}

const ActivemqProvider = require('./libs/activemq-provider.js');
const Stompit = require('stompit');

require(path.join(__dirname, 'libs', 'resource'));

global.logLevel = 'DEBUG';

var log4js = require("log4js"),
    log4js_extend = require("log4js-extend");
log4js.configure({
    appenders: {
        access: { type: 'dateFile', filename: `${nameFolder.log}/access.log`, pattern: '-yyyy-MM-dd' },
        app: { type: 'file', filename: `${nameFolder.log}/app.log`, maxLogSize: 10485760, numBackups: 3 },
        errorFile: { type: 'file', filename: `${nameFolder.log}/errors.log` },
        errors: { type: 'logLevelFilter', level: 'error', appender: 'errorFile' },
        out: { type: 'stdout' }
    },
    categories: {
        default: { appenders: ['app', 'errors', 'out'], level: 'info' },
        http: { appenders: ['access'], level: 'info' }
    }
});
log4js_extend(log4js, {
    path: __dirname,
    format: "[@name (@file:@line:@column)]"
});
var logger = log4js.getLogger("CRM");
logger.level = 'DEBUG';
global.log = logger;
var cron = require('node-cron');
var logger2 = log4js.getLogger("STOMP");
logger2.level = 'DEBUG';
global.log = logger2;

if (_config.database.user && _config.database.pwd) {
    global._dbPath = 'mongodb://' + _config.database.user + ':' + _config.database.pwd + '@' + _config.database.ip + ':' + _config.database.port + '/' + _config.database.name;
}

_initDBCallBack(_dbPath, _dbName, function (err, db, client) {
    if (err) return process.exit(1);
    global['mongoClient'] = db;
});
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('view cache', false);
app.set('port', process.env.PORT || _config.app.port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// Set Modules api
// End setting module
app.use(require('cookie-parser')('dft.vn'));
app.use(require('express-session')({ secret: 'dft.vn', resave: false, saveUninitialized: true }));
app.use(require('multer')({ dest: path.join(__dirname, 'temp') }).any());
app.use(require('serve-favicon')(path.join(__dirname, 'assets', 'favicon.ico')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(require(path.join(_rootPath, 'libs', 'auth')).auth);
app.use("/api/v1/voice", voiceRouter);

require(path.join(_rootPath, 'libs', 'cleanup.js')).Cleanup();
switch (process.env.NODE_ENV) {
    case 'development':
        require(path.join(_rootPath, 'libs', 'router_noacd.js'))(app);
        break;
    case 'production':
        require(path.join(_rootPath, 'libs', 'router.js'))(app);
        break;
    default:
        require(path.join(_rootPath, 'libs', 'router.js'))(app);
        break;
}

app.use(function (req, res, next) {
    res.render('404', { title: '404 | Page not found' });
});

app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('500', { message: err.message });
    log.error(err);
});

String.prototype.zFormat = function () {
    var source = this;

    if (_.isString(arguments[0])) {
        _.each(arguments, function (n, i) {
            source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
        });
    } else {
        var param = arguments[0];
        _.each(_.keys(param), function (item) {
            source = source.replace(new RegExp("\\{" + item + "\\}", "g"), param[item]);
        });
    }

    return source;
};

mongoose.connect(_dbPath, options = { db: { native_parser: true }, server: { poolSize: 10 }, user: _config.database.user, pass: _config.database.pwd });

var activemqSV1 = {
    'host': _config.activemq.ip,
    'port': _config.activemq.port,
    'connectHeaders': {
        'host': '/',
        'login': _config.activemq.user,
        'passcode': _config.activemq.pwd,
        'heart-beat': '60000,60000'
    }
}
var reconnectOptions = {
    'maxReconnects': 10,
    'useExponentialBackOff': true,
    'maxReconnectDelay': 30000
};

var servers = [activemqSV1];
var manager = new Stompit.ConnectFailover(servers, reconnectOptions);

manager.connect(function (err, client, reconnect) {
    if (err) return log.info('Activemq connect err', err);
    global._ActiveMQ = new ActivemqProvider(client)
    var sessionId = client.headers.session;

    fsx.readdirSync(path.join(_rootPath, 'queue', 'subscribe')).forEach(function (file) {
        if (path.extname(file) !== '.js') return;
        require(path.join(_rootPath, 'queue', 'subscribe', file))(_ActiveMQ, sessionId);
    });

    fsx.readdirSync(path.join(_rootPath, 'queue', 'publish')).forEach(function (file) {
        if (path.extname(file) !== '.js') return;
        global['QUEUE_' + _.classify(_.replaceAll(file.toLowerCase(), '.js', ''))] = require(path.join(_rootPath, 'queue', 'publish', file));
        console.log('QUEUE'.gray + ' : QUEUE_' + _.classify(_.replaceAll(file.toLowerCase(), '.js', '')));
    });

    //Listen error
    client.on('error', function (error) {
        log.error('ERROR ACTIVEMQ', error)
        reconnect();
    });
})
//end


var handleOnServerStart = function () {
    log.info('Server is running !');
    console.log(("Server is running at " + app.get('port')).magenta);
};
if (_config.https || process.env.HTTPS) {
    var https = require('https');
    var fs = require('fs');
    var server = https.createServer({
        key: fs.readFileSync(_config.https.key || './certificate/server.key'),
        cert: fs.readFileSync(_config.https.cert || './certificate/server.crt'),
        passphrase: _config.https ? _config.https.passphrase : ''
    }, app).listen(app.get('port'), handleOnServerStart);
} else {
    var server = app.listen(app.get('port'), handleOnServerStart);
}

global.sio = require('socket.io').listen(server, { log: false });
sio.on('connection', function (socket) {
    require(path.join(_rootPath, 'socket', 'io.js'))(socket);
});


require(path.join(_rootPath, 'monitor', 'order-monitor.js')).assignByInterval();