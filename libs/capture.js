var config = require("../config.json");
var Q = require("q");
var path = require( "path" );
var webshot = require('webshot');
var senseHelper = require('./sense');

function options( sessionId ) {
    return {
        phantomConfig: {
            'ignore-ssl-errors': 'true'
        },
        timeout: 30000,
        renderDelay: 5000,
        //takeShotOnCallback: true,
        cookies: [ {
            name: "X-Qlik-Session-Slack",
            value: sessionId,
            path: '/',
            domain: 'rfn-public.tk'
        } ],
        screenSize: {
            width: 500,
            height: 400
        },
        shotSize: {
            width: 500,
            height: 400
        },
        captureSelector: ".qv-object",
        userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)' + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
    }
};

function capture(appId, objectId, userDir, userName, sessionId) {
    var deferred = Q.defer();

    var imageName = new Date().getTime(),
        url = `https://rfn-public.tk/${userDir}/single/?appid=${appId}&obj=${objectId}&select=clearall`;
    var filePath = path.resolve(__dirname, "..", 'captures', objectId + "_" + imageName + ".png"),
        opts = options(sessionId);
    webshot(url, filePath, opts, function(err) {
        if (err) {
            console.log("error", err);
            deferred.reject(err);
        } else {
            console.log("picture done");
            deferred.resolve({ "image": "/captures/" + objectId + "_" + imageName + ".png", path: url, "object": objectId });
        }
    });

    return deferred.promise;
}

function captureMultiple(appId, objects, userDir, userName) {
    return senseHelper.getQlikSenseSession(userDir, userName, generateUUID())
    .then(function(sessionId) {
        console.log("sessionId for picture", sessionId);
        var proms = objects.map(function(objectId) {
            return capture(appId, objectId, userDir, userName, sessionId);
        });
        return Q.allSettled(proms);
    });
}

function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
  });
  return uuid;
};




//TEST
/*captureMultiple(
    "d08aad70-968f-47f2-88d3-7ab0d0a30e71",
    ["dnmEmpj"],
    "slack",
    "manuel.romero"
).then(function(info) {
    console.log("info", info);
});*/


exports.capture = capture;
exports.captureMultiple = captureMultiple;
