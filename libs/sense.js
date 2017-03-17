var fs = require( "fs" ),
    path = require( "path" ),
    WebSocket = require( "ws" ),
    Q = require("q"),
    enigma = require( "enigma.js" ),
    qixSchema = require( "../node_modules/enigma.js/schemas/qix/3.1/schema.json" ),
    request = require("request");

var config = require('../config.json');

function session( appId ) {
    return {
        "host": config.senseHostConn,
        "port": 4747,
        "prefix": config.prefix,
        "unsecure": false,
        "route": appId? "app/"+appId : "app/engineData",
        "disableCache": true
    }
};

var certsPath = process.env.CERTS_PATH || ".";

function getConnectionConfig ( user, dir, appId ){
    var connConfig = {
        Promise: global.Promise,
        schema: qixSchema,
        session: session(appId),
        createSocket: function( url ) {
            console.log( "Connect", url );
            return new WebSocket( url, {
                //ca: [fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\ec2-52-211-160-80.eu-west-1.compute.amazonaws.com\\root.pem"  )],
                //key: fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\ec2-52-211-160-80.eu-west-1.compute.amazonaws.com\\client_key.pem" ),
                //cert: fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\ec2-52-211-160-80.eu-west-1.compute.amazonaws.com\\client.pem" ),
                ca: [fs.readFileSync( path.resolve(__dirname, "..", certsPath, "certs", "root.pem" ) )],
                key: fs.readFileSync( path.resolve(__dirname, "..", certsPath, "certs", "client_key.pem" ) ),
                cert: fs.readFileSync( path.resolve(__dirname, "..", certsPath, "certs", "client.pem" ) ),
                headers: {
                    "X-Qlik-User": "UserDirectory=" + dir + ";UserId=" + user
                }
            } );
        }
    };

    return connConfig;
}

function _getEnigmaService( user, dir, appId ) {
    var deferred = Q.defer();

    var connConfig = getConnectionConfig(user, dir, appId);
    enigma.getService( "qix", connConfig ).then( function(qix) {
        console.log("Connected");
        deferred.resolve(qix.global);
    }, function(err){
        deferred.reject(err);
    });
    return deferred.promise;
}


function _createApp( qix, newAppName, fromAppId ) {
    var deferred = Q.defer();
    qix.createApp( newAppName ).then( function( res ) {
        if ( res.qSuccess ) {
            console.log("App created ID: ", newAppName, res.qAppId );
            if ( fromAppId ) {
                qix.copyApp( res.qAppId, fromAppId, [] ).then( function() {
                    console.log("Copied "+fromAppId+" into "+newAppName+" !!");

                    qix.openApp( res.qAppId ).then( function( app ) {
                        deferred.resolve( {app: app, appId: res.qAppId} );
                    }, function( error ) {
                        console.log("openApp error ("+res.qAppId+")", error);
                        deferred.reject(error);
                    });

                }, function( error ) {
                    console.log("copyApp error", error);
                    deferred.reject(error);
                });

            } else {

                qix.openApp( res.qAppId ).then( function( app ) {
                    deferred.resolve( {app: app, appId: res.qAppId} );
                }, function( error ) {
                    console.log("openApp error ("+res.qAppId+")", error);
                    deferred.reject(error);
                });
            }

        } else {
            deferred.reject("error creating empty app");
        }
    });
    return deferred.promise;
}

function _openApp( qix, appId ) {
    return qix.openApp( appId );
}

function _createRestConnection( app, url, connectorName ) {
    var deferred = Q.defer();
    var conn = {
            qName: connectorName,
            //qConnectionString: 'http://localhost:5555/data?connectorID=WebConnector&table=JsonToXmlRaw&url='+url+'&appID=',
            qConnectionString: "CUSTOM CONNECT TO \"provider=QvRestConnector.exe;url="+url+";timeout=30;method=GET;autoDetectResponseType=true;keyGenerationStrategy=0;useWindowsAuthentication=false;forceAuthenticationType=false;useCertificate=No;certificateStoreLocation=LocalMachine;certificateStoreName=My;PaginationType=NextUrl;NextUrlFieldPath=next;IsNextUrlFieldPathHeader=false;\"",
            qType: 'QvRestConnector.exe'
    };
    app.createConnection(conn).then( function() {
        console.log("App rest connector");
        deferred.resolve( app );
    }, function(error) {
        deferred.reject({"msg": "App rest connection error", "err": error});
    });
    return deferred.promise;
};

function _getSetScript( app, connectorName ) {
    var deferred = Q.defer();
    app.getScript().then( function( script ) {
        fs.readFile( path.resolve( __dirname, "script.template"), 'utf8', function(err, data) {
            if (err) {
                deferred.reject( {"error readFile": err} );
            } else {
                data = data.replace(/{{connectorName}}/g, connectorName);
                console.log("Script", data);
                app.setScript(data).then( function( res ) {
                    console.log("App set script");
                    deferred.resolve( app );
                }, function( error ) {
                    deferred.reject( {"error getSetScript": error} );
                } );
            }
        });
    } );
    return deferred.promise;
};

function _getSetScript2( app, libName, fileName ) {
    var deferred = Q.defer();
    app.getScript().then( function( script ) {
        fs.readFile( path.resolve( __dirname, "myLoadscript.txt"), 'utf8', function(err, data) {
            if (err) {
                deferred.reject( {"error readFile": err} );
            } else {
                data = data.replace(/{{libName}}/g, libName);
                data = data.replace(/{{fileName}}/g, fileName);
                //console.log("Script", data);
                app.setScript(data).then( function( res ) {
                    console.log("App set script");
                    deferred.resolve( app );
                }, function( error ) {
                    deferred.reject( {"error getSetScript": error} );
                } );
            }
        });
    } );
    return deferred.promise;
};

function setScriptReloadSave( app, libName, fileName ) {
    return _getSetScript2( app, libName, fileName )
    .then( function( app ) {
        return save( app );
    })
    .then( function( app ) {
        return reload( app );
    })
    .then( function( app ) {
        return save( app );
    });
}

function reload( app ) {
    var deferred = Q.defer();
    app.doReload().then(function(result) {
        console.log("App reloaded", result);
        if ( result ) {
            deferred.resolve( app );
        } else {
            deferred.reject("App reloaded failed");
        }
    }, function( error ) {
        deferred.reject({"error reload": error});
    } );
    return deferred.promise;
};

function save( app ) {
    var deferred = Q.defer();
    app.doSave().then( function( res ) {
        console.log("App saved");
        deferred.resolve( app );
    }, function( error ) {
        deferred.reject({"error saving": error});
    } );
    return deferred.promise;
};

function getApp( appId ) {
    return _getEnigmaService( appId )
    .then( function( qix ) {
        return _openApp(qix, appId);
    });
}

function getApps( user, dir, callback ) {
    _getEnigmaService(user, dir)
    .then( function( qix ) {
        console.log("Connected");
        return qix.getDocList();
    } )
    .then( function( docList ) {
        callback( docList, null );
    })
    .fail(function (error) {
        callback( null, error );
    })
    .done();
}

function setScriptReloadSaveByAppId( appId, libName, fileName ) {
    return _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.openApp( appId );
    } )
    .then( function ( app ) {
        return _getSetScript2( app, libName, fileName )
    } )
    .then( function( app ) {
        return save( app );
    })
    .then( function( app ) {
        return reload( app );
    });
}

function getObjectProperties( app, objectId ) {
    return app.getObject(objectId).then( function( model ) {
        return model.getProperties();
    });
}

function setObjectProperties( app, objectId, modifyFn ) {
    return app.getObject(objectId).then( function( model ) {
        return model.getProperties().then( function(props) {
            modifyFn(props);
            return model.setProperties( props );
        });
    });
}


function deleteApp( appId, callback ) {
    _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.deleteApp( appId )
    })
    .then( function () {
        console.log("DONE! app deleted");
        callback( {}, null );
    } )
    .fail(function ( error ) {
        callback( null, error );
    } )
    .done();
}

function getConnections( appId, callback ) {
    _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        return app.getConnections();
    } )
    .then( function ( connection ) {
        console.log("connection", connection);
        callback( connection, null );
    })
    .fail(function ( error ) {
        callback( null, error );
    } )
    .done();
}

function createApp( newAppName, appIdFrom, callback ) {
    return _getEnigmaService()
    .then( function( qix ) {
        return _createApp(qix, newAppName, appIdFrom);
    });
}

function createEmptySheetInApp( appId, newSheetName, callback ) {
    _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.openApp( appId ).then( function( app ) {
            //Create sheet object
            var sheetObj = {
                "qInfo": { "qType": "sheet" },
                "qMetaDef": {
                    "title": newSheetName,
                    "description": ""
                },
                "thumbnail": { "qStaticContentUrlDef": null },
                "columns": 24,
                "rows": 12,
                "cells": []
            };
            return app.createObject( sheetObj );
        } ).then( function( obj ) {
            return obj.getLayout();
        } ).then( function( layout ) {
            callback( layout, null );
        } );
    } )
    .fail(function ( error ) {
        callback( null, error );
    } )
    .done();
}

function createObjectInApp( appId, objectDef, callback ) {
    _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.openApp( appId ).then( function( app ) {
            //Create object
            return app.createObject( objectDef );
        } ).then( function( obj ) {
            return obj.getLayout();
        } ).then( function( layout ) {
            callback( layout, null );
        } );
    } )
    .fail(function ( error ) {
        callback( null, error );
    } )
    .done();
}

function createObjectInAppByAppId( appId, objectDef, callback ) {
    _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.openApp( appId ).then( function( app ) {
            //Create object
            return app.createObject( objectDef );
        } ).then( function( obj ) {
            return obj.getLayout();
        } ).then( function( layout ) {
            callback( layout, null );
        } );
    } )
    .fail(function ( error ) {
        callback( null, error );
    } )
    .done();
}

function _doActualRemoveVar( app, varName ) {
    var deferred = Q.defer();
    app.removeVariable().then( function( res ) {
        console.log("Var removed");
        deferred.resolve( app );
    }, function( error ) {
        deferred.reject({"error saving": error});
    } );
    return deferred.promise;
}

function removeVariable( appId, varName, callback ) {
    _getEnigmaService( appId )
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        return _doActualRemoveVar( app, varName );
    } )
    .then( function ( app ) {
        return save( app );
    } )
    .then( function ( result ) {
        callback( result, error );
    } )
    .fail(function (error) {
        callback( null, "shit happened!" );
    })
    .done();
}


/**
 * Our Qlik Sense Server information
 * Needs exported certificates from Qlik Sense QMC
 */
var r = request.defaults({
    rejectUnauthorized: false,
    host: session().host,
    //key: fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\client_key.pem" ),
    //cert: fs.readFileSync( "C:\\ProgramData\\Qlik\\Sense\\Repository\\Exported Certificates\\.Local Certificates\\client.pem" ),
    key: fs.readFileSync( path.resolve(__dirname, "..", certsPath, "certs", "client_key.pem" ) ),
    cert: fs.readFileSync( path.resolve(__dirname, "..", certsPath, "certs", "client.pem" ) ),
});

/**
 * Request ticket from QPS.
 * Adjust uri as needed.
 */
function getQlikSenseTicket( directory, user ) {
    var deferred = Q.defer();
    var host =  session().host;
    r.post({
        uri: `https://${host}:4243/qps/${directory}/ticket?xrfkey=abcdefghijklmnop`,
        body: JSON.stringify({
            "UserDirectory": directory,
            "UserId": user,
            "Attributes": []
        }),
        headers: {
            'x-qlik-xrfkey': 'abcdefghijklmnop',
            'content-type': 'application/json'
        }
    }, function(err, res, body) {
        if(err) {
            deferred.reject(err);
        };
        var ticket = JSON.parse(body);
        console.log("ticket", ticket);
        deferred.resolve(ticket.Ticket);

    });

    return deferred.promise;
};

function getQlikSenseSession ( directory, user, sessionId ) {
    var deferred = Q.defer();
    var host =  session().host;
    r.post({
        uri: `https://${host}:4243/qps/${directory}/session?xrfkey=abcdefghijklmnop`,
        body: JSON.stringify({
            "UserDirectory": directory,
            "UserId": user,
            "Attributes": [],
            "SessionId": sessionId
        }),
        headers: {
            'x-qlik-xrfkey': 'abcdefghijklmnop',
            'content-type': 'application/json'
        }
    }, function(err, res, body) {
        if(err) {
            deferred.reject(err);
        };
        deferred.resolve(JSON.parse(body).SessionId);

    });

    return deferred.promise;
}

function searchObjects( user, dir, appId, terms, limit, callback ) {
     _getEnigmaService( user, dir, appId )
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        return app.searchObjects(
            {"qAttributes": ["qProperty"]},
            terms,
            {
                "qOffset": 0,
                "qCount": -1,
                "qGroupOptions": [{
                    "qGroupType": "GenericObjectsType",
                    "qOffset": 0,
                    "qCount": limit
                }],
                "qGroupItemOptions": [{
                    "qGroupItemType": "GenericObject",
                    "qOffset": 0,
                    "qCount": 20
                }]
            }
        );
    }).then( function ( result ) {
        callback( null, result );
    } )
    .fail(function (error) {
        callback( error, null );
    })
    .done();

}

function createHypercube ( user, dir, appId, measure, callback ) {
    _getEnigmaService(user, dir, appId)
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        var obj = {
            "qInfo": {
                "qType": "measureValue"
            },
            "qHyperCubeDef": {
                "qStateName": "$",
                "qDimensions": [],
                "qMeasures": [
                    {
                        "qLibraryId": "",
                        "qSortBy": {
                            "qSortByState": 0,
                            "qSortByFrequency": 0,
                            "qSortByNumeric": 0,
                            "qSortByAscii": 0,
                            "qSortByLoadOrder": 1,
                            "qSortByExpression": 0,
                            "qExpression": {
                                "qv": ""
                            }
                        },

                        "qDef": {
                            "qLabel": "Sum of Sales",
                            "qDescription": "",
                            "qTags": [
                                "tags"
                            ],
                            "qGrouping": "N",
                            "qExpressions": [],
                            "qDef": measure,
                            "numFormatFromTemplate":true,
                            "qIsAutoFormat": false,
                            /*"qNumFormat": {
                                "qType": "U",
                                //"qDec": ".",
                                "//qThou": ",",
                                "qnDec": 10,
                                "qUseThou": 0
                            },*/
                        }
                    }
                ],
                "qInitialDataFetch": [
                        {
                            "qTop": 0,
                            "qHeight": 10,
                            "qLeft": 0,
                            "qWidth": 500
                        }
                ]

            },

        };
        return app.createSessionObject(obj);
    }).then( function ( sessionObj ) {
        return sessionObj.getLayout();

    } ).then( function ( layout ) {
        callback(null, layout);

    } )
    .fail(function (error) {
        callback( error, null );
    })
    .done();
}

function getDimensions( user, dir, appId ) {
    return _getEnigmaService(user, dir, appId)
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        var obj = {
            "qDimensionListDef": {
                "qType": "dimension",
                "qData": {
                    "title": "/qMetaDef/title",
                    "tags": "/qMetaDef/tags",
                    "grouping": "/qDim/qGrouping",
                    "info": "/qDimInfos"
                }
            },
            "qInfo": {
                "qId": "DimensionList",
                "qType": "DimensionList"
            }
        };
        return app.createSessionObject(obj);
    }).then( function ( sessionObj ) {
        return sessionObj.getLayout();
    } );
}

function getMeasures( user, dir, appId ) {
    return _getEnigmaService(user, dir, appId)
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        var obj = {
            "qMeasureListDef": {
                "qType": "measure",
                "qData": {
                    "title": "/qMetaDef/title",
                    "tags": "/qMetaDef/tags"
                }
            },
            "qInfo": {
                "qId": "MeasureList",
                "qType": "MeasureList"
            }
        };
        return app.createSessionObject(obj);
    }).then( function ( sessionObj ) {
        return sessionObj.getLayout();
    } );
}

function getMeasure( user, dir, appId, measureId ) {
    return _getEnigmaService(user, dir, appId)
    .then( function( qix ) {
        return qix.openApp( appId );
    })
    .then( function ( app ) {
        return app.getMeasure( measureId )
            .then( function ( measure ) {
                return measure.getLayout();
            })
            .then( function (layout) {
                layout.qMeasure.qNumFormat = {
                    qType: 'R',
                    qnDec: 0,
                    qUseThou: 0,
                    qFmt: '#.##',
                    qDec: '.',
                    qThou: ','
                };
                layout.qMeasure.qIsAutoFormat = false;
                return app.createSessionObject({
                        "qInfo": {
                            "qType": "measureVal"
                        },
                        "qHyperCubeDef": {
                            "qStateName": "$",
                            "qMeasures": [{
                                "qDef": layout.qMeasure
                            }],
                            "qInitialDataFetch": [{
                                "qTop": 0,
                                "qHeight": 1,
                                "qLeft": 0,
                                "qWidth": 1
                            }]
                        }
                    }).then( function(object) {
                        return object.getLayout();
                    });
            })
    })

}

//***Libray exports
exports.getApps = getApps;
exports.getApp = getApp;
exports.createApp = createApp;
exports.deleteApp = deleteApp;
exports.getConnections = getConnections;
exports.createEmptySheetInApp = createEmptySheetInApp;
exports.createObjectInApp = createObjectInApp;
exports.setScriptReloadSave = setScriptReloadSave;
exports.getObjectProperties = getObjectProperties;
exports.setObjectProperties = setObjectProperties;
exports.getQlikSenseTicket = getQlikSenseTicket;
exports.getQlikSenseSession = getQlikSenseSession;
exports.searchObjects = searchObjects;
exports.createHypercube = createHypercube;
exports.getDimensions = getDimensions;
exports.getMeasures = getMeasures;
exports.getMeasure = getMeasure;

