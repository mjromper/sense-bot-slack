var winston = require('winston'),
    path = require('path'),
    rotator = require('logrotator').rotator;

var logsPath = process.env.BOT_LOGS || "./";

winston.loggers.add('logger', {
    transports: [
    	new (winston.transports.Console)({
    		timestamp: true
    	}),
        new(winston.transports.File)({
            filename: path.resolve(__dirname, '../', logsPath, 'logs/server.log'),
            timestamp: true,
            json: false
        })
    ]
});

rotator.register(path.resolve(__dirname, '../logs/server.log'), {
    schedule: '12h',
    size: '200k',
    compress: false,
    count: 100
});

rotator.on('error', function(err) {
    winston.loggers.get('logger').info('oops, an error occured!, ' + err);
});

// 'rotate' event is invoked whenever a registered file gets rotated
rotator.on('rotate', function(file) {
    winston.loggers.get('logger').info('File ' + file + ' was rotated!');
});

exports.log = function() {
    return winston.loggers.get('logger');
}
