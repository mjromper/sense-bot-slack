var express = require('express'),
    app = express(),
    fs = require('fs'),
    path = require("path"),
    bodyParser = require('body-parser'),
    https = require("https"),
    http = require("http"),
    //Libs
    logger = require('./libs/logger.js'),
    botLogic = require('./libs/bot-logic.js');

// parse application/json
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use('/captures', express.static(path.join(__dirname, 'captures')))

app.get("/ping", function(req, res, next){
    res.send({"ok": 200});
});

/*
//Server application
var options = {
   pfx: fs.readFileSync("C:\\Users\\Manuel\\Desktop\\rfn-public-NEW.pfx"),
   passphrase: 'qlik123'
};


var options = {
    key: fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\server_key.pem" ),
    cert: fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\server.pem" ),
};
*/

//var server = https.createServer( options, app );
var server = http.createServer( app );
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 3000;
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
server.listen( port, ip, function () {
    logger.log().info( 'Express listening on port ', port );
});