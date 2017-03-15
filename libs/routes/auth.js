var express = require('express');
var router = express.Router(),
    path = require("path"),
    qlikAuth = require('qlik-auth'),
    slack = require('./slack.js');

var certsPath = process.env.CERTS_PATH || ".";

var settings = {
	directory: "SLACK",
	port: 8085,
	slack_team: "qlikpresales",
	client_id: "78719062706.116632750915",
	client_secret: "6eaa2d34758f8d86b2e8cbd46c353321"
};

router.get('/ping', function ( req, res ) {
   res.send("pong");
});

router.get('/', function ( req, res ) {
    //Init sense auth module
    qlikAuth.init(req, res);
    //Redirect to Office 365 Auth url

    var hostUrl = req.protocol+"://"+req.get('host');
    res.redirect( slack.getAuthUrl(hostUrl, settings) );
});


router.get('/oauth2callback', function ( req, res ) {
    if ( req.query.code !== undefined && req.query.state !== undefined ) {
        var hostUrl = req.protocol+"://"+req.get('host');
        slack.getTokenFromCode( req.query.code, req.query.state, hostUrl, settings, function ( e, accessToken ) {
            if ( e ) {
                res.send( { "error": e } );
                return;
            } else {
                slack.getUser( accessToken, function( e1, resUser ) {

                    if ( e1 ) {
                        res.send( { "error": e1 } );
                        return;
                    }

                    var ticketReq = {
                        'UserDirectory': settings.directory,
                        'UserId': resUser.user.name,
                        'Attributes': []
                    };

                    slack.getUserGroups( accessToken, function( e2, response ) {
                        if ( e2 ) {
                            res.send( { "error": e2 } );
                            return;
                        }
                        if ( response.groups ) {
                            ticketReq.Attributes = response.groups.map( function(g) {
                                return {"Group": g.name};
                            } );
                        }
                        qlikAuth.requestTicket( req, res, ticketReq, {
                            "Certificate": path.resolve(__dirname, "../..", certsPath, "certs", "client.pem"),
                            "CertificateKey": path.resolve(__dirname, "../..", certsPath, "certs", "client_key.pem")
                        } );
                    });
                });
            }
        });
    } else {
        res.send( {"error": "missing code"} );
    }
});

module.exports = router;
