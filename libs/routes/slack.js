var OAuth = require('oauth'),
    http = require('http'),
    request = require("request");

var endpoint = {
    "authority": "https://slack.com",
    "authorize_endpoint": "/oauth/authorize",
    "token_endpoint": "/api/oauth.access",
    "scope": "identity.basic identity.email identity.team",
    "state": "qlikslack1234abcd",
    "redirectUriPath": "/auth/oauth2callback",
    "slackApiUri": "slack.com"
};

/**
 * Gets a token for a given resource.
 * @param {string} code An authorization code returned from a client.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromCode( code, state, reqUrl, settings, callback ) {

    if ( state !== endpoint.state ) {
        callback({"error": "state not valid"}, null, null);
        return;
    }

    var redirectUri = reqUrl + endpoint.redirectUriPath;

    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        settings.client_id,
        settings.client_secret,
        endpoint.authority,
        endpoint.authorize_endpoint,
        endpoint.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        code,
        {
            redirect_uri: redirectUri
        },
        function (e, accessToken) {
            callback(e, accessToken);
        }
    );
}

/**
 * Gets Slack login url
 */
function getAuthUrl( reqUrl, settings ) {
    var redirectUri = reqUrl + endpoint.redirectUriPath;
    var url = endpoint.authority + endpoint.authorize_endpoint +
        "?client_id=" + settings.client_id +
        "&redirect_uri=" + redirectUri +
        "&scope=" + endpoint.scope +
        "&state=" + endpoint.state;

    if (settings.slack_team) {
        url = url + "&team=" + settings.slack_team;
    }

    return url;
}

/**
 * Gets userId from user data in Slack.
 * @param {string} accessToken
 * @param {Callback} callback The callback function.
 */
function getUserGroups( accessToken, callback ) {
    console.log("getUserGroups with accessToken", accessToken);
    _request( {
        path: "/api/groups.list?token="+accessToken+"&pretty=1",
        method: "GET"
    }, callback );
}

function getUser( accessToken, callback ) {
    console.log("getUser with accessToken", accessToken);
    _request( {
        path: "/api/users.identity?token="+accessToken+"&pretty=1",
        method: "GET"
    }, function(e, response) {
        if ( e ) {
            callback(e, null);
            return;
        }
        _request( {
            path: "/api/users.info?user="+response.user.id+"&token="+accessToken+"&pretty=1",
            method: "GET"
        }, callback );
    } );
}

/**
 * Gets userId from user data in Office 365.
 * @param {Object} options
 * @param {Callback} callback The callback function.
 */
function _request( options, callback ) {

    options.url = endpoint.authority+options.path;
    options.agent = options.agent || false;
    options.method = options.method || "GET";

    request(options, function(error, response, body){
        if ( error ) {

            callback(error, null);
            return;
        }

        callback(null, JSON.parse(body));

    });

}


// ------ LIB exports ------- //
exports.getAuthUrl = getAuthUrl;
exports.getTokenFromCode = getTokenFromCode;
exports.getUser = getUser;
exports.getUserGroups = getUserGroups;
