var express = require('express');
var router = express.Router();
var botLogic = require('../bot-logic.js');

router.get('/ping', function ( req, res ) {
   res.send("pong");
});

router.post('/', function ( req, res ) {
    var payload = JSON.parse(req.body.payload);
    if (payload.callback_id === "select_app"){
    	botLogic.setActiveApp( payload.actions[0].value, payload.user.name );
    }

});

module.exports = router;
