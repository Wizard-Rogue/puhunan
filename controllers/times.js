var models = require('../models/index');
var cronJob = require('cron').CronJob;
var Q = require('q');

exports.setupQueue = function() {
    console.log('Cron Job Started');
};