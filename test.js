var sense = require('./sense.js');

sense.createHypercube("7f48dc9c-86c8-46ca-bf7c-74161490c8ca", "Sum([Sales Margin Amount])/Sum([Sales Amount])", "manuel.romero", "SLACK", function(err, sessionObj){
	if (err) {
		console.log('err',err);
	} else {
		console.log('sessionObj',sessionObj.qHyperCube);
		console.log('sessionObj',sessionObj.qHyperCube.qDataPages[0].qMatrix[0][0]);
	}
});
