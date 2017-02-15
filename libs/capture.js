var config = require("../config.json");
var Q = require("q");
var webshot = require('webshot');
var senseHelper = require('./sense');

var options = {
    phantomConfig: { 'ignore-ssl-errors': 'true' },
    timeout: 30000,
    takeShotOnCallback: false,
    renderDelay: 6000,
    screenSize: {
        width: 500,
        height: 300
    },
    onLoadFinished: function() {
        console.log("load has finished");
    },
    shotSize: {
        width: 500,
        height: 300
    },
    userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)' + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
};

function capture(appId, objectId, userDir, userName) {
    var deferred = Q.defer();
    //senseHelper.getQlikSenseTicket(userDir, userName, function(err, ticket) {

    var imageName = new Date().getTime();
    var path = config.prefix + "single/?appid=" + appId + "&obj=" + objectId + "&select=clearall";
    var url = "https://" + config.senseHost + "/extensions/shot/shot.html?params=" + appId + ":" + objectId;
    //var url = "https://rfn-public.tk/slack/single/?appid=7f48dc9c-86c8-46ca-bf7c-74161490c8ca&obj=NQAubZc&select=clearall&QlikTicket="+ticket;
    console.log("url", url);
    var filePath = "C:/captures/" + objectId + "_" + imageName + ".png";

    webshot(url, filePath, options, function(err) {
        if (err) {
            console.log("error", err);
            deferred.reject(err);

        } else {
            console.log("picture done");
            deferred.resolve({ "image": "/captures/" + objectId + "_" + imageName + ".png", path: path, "object": objectId });
        }

    });

    //});
    return deferred.promise;
}

function captureMultiple(appId, objects, userDir, userName) {
    var proms = objects.map(function(objectId) {
        return capture(appId, objectId, userDir, userName);
    });
    return Q.allSettled(proms);
}


/*capture(
    "d08aad70-968f-47f2-88d3-7ab0d0a30e71",
    "dnmEmpj",
    "slack",
    "manuel.romero"
).then(function(info) {
    console.log("info", info);
});*/


exports.capture = capture;
exports.captureMultiple = captureMultiple;
