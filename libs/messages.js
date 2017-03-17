var config = require("../config.json");

var params = {};

function hint() {
    return {
        "icon_emoji": params.icon_emoji,
        "as_user": params.as_user,
        "icon_url": params.icon_url,
        "response_type": "ephemeral",
        "text": "Here are some of the commands I can understand :smile:",
        "attachments": [{
                "title": "A list of your available Apps",
                "text": "`apps`",
                "mrkdwn_in": ["text", "pretext"]
            }, {
                "title": "Set your active app",
                "text": "`setapp [appId]`",
                "mrkdwn_in": ["text", "pretext"]
            },

            {
                "title": "Get top 3 results given a search string",
                "text": "`search [search terms]`",
                "mrkdwn_in": ["text", "pretext"]
            }
            /*,
            {
                "title": "Reload an App",
                "pretext": "TODO",
                "text": "`/sense reload [appId]`",
                "mrkdwn_in": ["text", "pretext"]
            },
            {
                "title": "Get App info and set it for future app commands",
                "text": "`/sense app [appId]`",
                "mrkdwn_in": ["text", "pretext"]
            }*/
        ]
    };
}

function error(err) {
    return {
        "icon_emoji": params.icon_emoji,
        "as_user": params.as_user,
        "icon_url": params.icon_url,
        "response_type": "ephemeral",
        "text": "There was an error while using Sense API: " + err,
        "attachments": [{
            "pretext": "More info about this error:",
            "text": err
        }]
    };
}

function myApps(username, apps) {
    var fields = apps.map(function(a) {
        return {
            //"title": a.qDocId,
            "value": "<https://" + config.senseHost + config.prefix + "sense/app/" + a.qDocId + "|" + a.qDocName + ">",
            "short": false
        };
    });

    var actions = apps.map(function(a) {
        return {
            "name": a.qDocId,
            "text": a.qDocName,
            "type": "button",
            "value": a.qDocId
        };
    });

    return {
        "icon_emoji": params.icon_emoji,
        "as_user": params.as_user,
        "icon_url": params.icon_url,
        "response_type": "ephemeral",
        "text": username+", you can interact with all these apps:",
        "attachments": [{
            "title": "Open in a browser",
            "callback_id": "select_app",
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "author_name": "",
            "fields": fields
        },{
            "title": "Set your active app",
            "callback_id": "select_app",
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "author_name": "",
            "actions": actions
        }]
    };
}

function searchResults(infos) {
    return {
        "icon_emoji": params.icon_emoji,
        "as_user": params.as_user,
        "icon_url": params.icon_url,
        "response_type": "in_channel",
        "text": "Objects found for your search string",
        "attachments": infos.map(function(info) {
            return {
                "fallback": "Required plain-text summary of the attachment.",
                "color": "#36a64f",
                "title": info.object,
                "title_link": info.path,
                //"text": "https://rfn-public.tk:8081"+info.image,
                "image_url": config.host + info.image
            }
        })
    };
}

function object(info) {
    return {
        "icon_emoji": params.icon_emoji,
        "as_user": params.as_user,
        "icon_url": params.icon_url,
        "response_type": "in_channel",
        "text": "This is the object found",
        "attachments": [{
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "title": "Link to this object",
            "title_link": info.path,
            //"text": "https://rfn-public.tk:8081"+info.image,
            "image_url": config.host + info.image
        }]
    };
}

function measures( measures ) {
    var actions = measures.map(function(m) {
        return {
            "name": m.qInfo.qId,
            "text": m.qMeta.title,
            "type": "button",
            "value": m.qInfo.qId
        };
    });

    var a = Math.ceil(measures.length/5);
    var attachments = [];
    for (var i=0; i<a; i++) {
        attachments.push({
            //"title": "Get the measure value by clicking on the button",
            "callback_id": "select_measure",
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "author_name": "",
            "actions": actions.filter(function(a, index) {
                return index >= 5*i && index <= (5*i+4);
            })
        });
    }

    return {
        "icon_emoji": params.icon_emoji,
        "as_user": params.as_user,
        "icon_url": params.icon_url,
        "response_type": "ephemeral",
        "text": "There are "+measures.length+" measures in this app. Click on them to get the value.",
        "attachments": attachments
    };
}

function measureValue( value ) {
    return value;
}

function appNeeded( username ) {
    return username + ", I need you to set an active app. Type 'apps' to get a list of your available apps.";
}

exports.setParams = function(p) {
    params = p;
};

exports.hint = hint;
exports.appNeeded = appNeeded;
exports.error = error;
exports.myApps = myApps;
exports.object = object;
exports.searchResults = searchResults;
exports.measures = measures;
exports.measureValue = measureValue;
