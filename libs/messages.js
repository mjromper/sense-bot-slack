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
            "title": a.qDocId,
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
        "callback_id": "select_app",
        "text": "",
        "attachments": [{
            "fallback": "Required plain-text summary of the attachment.",
            "color": "#36a64f",
            "pretext": username + ", these are the Apps you have access to",
            "author_name": "",
            //"author_link": "http://flickr.com/bobby/",
            //"author_icon": "http://flickr.com/icons/bobby.jpg",
            //"title": "These the apps available in this Qlik Sense Server",
            //"title_link": "https://api.slack.com/",
            //"text": "These the apps available in this Qlik Sense Server",
            //"fields": fields,
            //"image_url": "http://my-website.com/path/to/image.jpg",
            //"thumb_url": "http://example.com/path/to/thumb.png",
            //"footer": "Qlik Sense API",
            //"footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
            //"ts": new Date().getTime()
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
            "image_url": config.host + info.image,
            //"footer": "Qlik Sense API",
            //"footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
            //"ts": new Date().getTime()
        }]
    };
}

exports.setParams = function(p) {
    params = p;
};

exports.hint = hint;
exports.error = error;
exports.myApps = myApps;
exports.object = object
exports.searchResults = searchResults;
