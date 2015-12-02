var mongoose = require('mongoose');
var config = require('../config');
var fs = require('fs');

var modelsList = fs.readdirSync(__dirname);

for(var i in modelsList) {
	if(modelsList[i] == 'index.js') continue;

	modelsList[i] = modelsList[i].substr(0, modelsList[i].lastIndexOf('.js'));

	var modelMeta = require('./' + modelsList[i])()
	var modelInstance = mongoose.model(modelMeta.collection, modelMeta.schema);
	module.exports[modelsList[i]] = modelInstance;
}