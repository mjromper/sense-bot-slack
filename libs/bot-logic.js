var Bot = require('slackbots'),
    messages = require("./messages.js"),
    captureHelper = require('./capture.js'),
    senseHelper = require('./sense.js'),
    logger = require('./logger.js');

var config = require("../config.json");

var bot = new Bot({
    "token": process.env.SLACK_BOT_TOKEN || config.botSettings.token,
    "name": config.botSettings.name
});

var params = {
    "as_user": false,
    "icon_url": "https://dl.dropboxusercontent.com/u/11081420/robo48x48.png"
};
messages.setParams(params);


var appUser = {};

bot.on('start', function() {
    logger.log().info( "Bot started!" );
});

/**
 * @param {object} data
 */
bot.on('message', function(data) {
    //console.log("onMessage", data);
    // all ingoing events https://api.slack.com/rtm
    if (data.bot_id) {
        return;
    }
    if (data.type === "message") {
        //console.log("data", data);
        parse(data);
    }
});


function parse(data) {

    //logger.log().info( 'message', data );

    var user = bot.users.filter(function(u) {
        return u.id === data.user;
    });

    var group = bot.groups.filter(function(u) {
        return u.id === data.channel;
    });
    group = group[0] ? group[0] : null;

    if (!user || user.length === 0) {
        logger.log().info( "no user found!", data );
        return;
    }

    var username = user[0].name;
    logger.log().info( "user", user );
    logger.log().info( "group", group );

    var activeApp = appUser[username];

    if (data.text.startsWith("whoami")) {
        postMessage(group, username, "Hi, you are " + user[0].real_name, params);
        return;
    }

    if (data.text.startsWith("help")) {
        postMessage(group, username, "", messages.hint());
        return;

    }

    if (data.text.startsWith("apps")) {
        senseHelper.getApps(username, "SLACK", function(apps, err) {
            if (err) {
                postMessage(group, username, "", messages.error(err));
            } else {

                var myApps = messages.myApps(user[0].real_name, apps);
                myApps.attachments.push({
                    "fallback": "Required plain-text summary of the attachment.",
                    "color": "#36a64f",
                    "pretext": "",
                    "author_name": "",
                    "fields": [{ "title": "Current Active app", "value": appUser[username] ? appUser[username] : "None", "short": false }]
                });
                postMessage(group, username, "", myApps);
            }
        });
        return;

    }

    if (data.text.startsWith("hello")) {
        postMessage(group, username, "Hi " + user[0].real_name + ", what can I help you? (Hint: type 'help')", params);
        return;
    }

    if (data.text.startsWith("search")) {
        if (!activeApp) {
            postMessage(group, username, user[0].real_name + ", I need you to set an active app. Type 'apps' to get a list of your available apps. Then type 'setapp appId' ", params);
            return;
        }
        postMessage(group, username, ":hourglass_flowing_sand:", params);
        var criteria = data.text.split(" ");
        criteria.shift();
        senseHelper.searchObjects( username, "SLACK", activeApp, criteria, 3, function(err, result) {
            if (err) {
                console.log("err", err);
                return;
            }
            if (result.qSearchGroupArray[0]) {
                var objects = result.qSearchGroupArray[0].qItems.map(function(o) {
                    return o.qIdentifier;
                });
                captureHelper.captureMultiple(
                    activeApp,
                    objects,
                    "slack",
                    username
                ).then(function(infos) {
                    var things = [];
                    infos.forEach(function(i) {
                        if (i.state === "fulfilled") {
                            things.push(i.value);
                        }
                    });
                    postMessage(group, username, "", messages.searchResults(things), params);

                });
            } else {
                postMessage(group, username, "No results founds", params);
            }
        });

        return;

    }

    if (data.text.startsWith("object")) {
        captureHelper.capture(
            "7f48dc9c-86c8-46ca-bf7c-74161490c8ca",
            "NQAubZc",
            "slack",
            username
        ).then(function(info) {
            postMessage(group, username, "", messages.object(info), params);
        });

        return;

    }

    if (data.text.startsWith("setapp")) {
        var appId = data.text.split(" ")[1];
        if (appId) {
            senseHelper.getApps(username, "SLACK", function(apps, err) {
                if (err) {
                    postMessage(group, username, "", messages.error(err), params);
                } else {
                    var app = apps.filter(function(a) {
                        return a.qDocId === appId;
                    });
                    if (app[0]) {
                        appUser[username] = app[0].qDocId;
                        postMessage(group, username, "Your new active app is: " + app[0].qDocName, params);
                    } else {
                        postMessage(group, username, "I'm sorry, the app doesn't seem to exist :disappointed:", params);
                    }
                }
            });
        } else {
            postMessage(group, username, "I'm sorry, I don't know what you are asking for :disappointed:", params);
        }
        return;
    }

};


function postMessage(group, username, message, params) {
    if (group) {
        bot.postMessageToGroup(group.name, message, params);
    } else {
        bot.postMessageToUser(username, message, params);
    }
}
