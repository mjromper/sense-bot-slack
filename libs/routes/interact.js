var express = require('express');
var router = express.Router();


router.get('/ping', function ( req, res ) {
   res.send("pong");
});

router.post('/', function ( req, res ) {
    res.send(JSON.parse(req.payload));
});

module.exports = router;
