var sense = require('./libs/sense.js');

/*sense.createHypercube("7f48dc9c-86c8-46ca-bf7c-74161490c8ca", "Sum([Sales Margin Amount])/Sum([Sales Amount])", "manuel.romero", "SLACK", function(err, sessionObj){
	if (err) {
		console.log('err',err);
	} else {
		console.log('sessionObj',sessionObj.qHyperCube);
		console.log('sessionObj',sessionObj.qHyperCube.qDataPages[0].qMatrix[0][0]);
	}
});*/


sense.getQlikSenseSession("SLACK", "manuel.romero", generateUUID())
.then(function(ticket) {
    console.log("ticket", ticket);
});


function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
  });
  return uuid;
};