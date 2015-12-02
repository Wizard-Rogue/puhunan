var models = require('../models/index');
var cronJob = require('cron').CronJob;
var http = require("http");
var Q = require('q');


var scrapeProcess = new cronJob({
    cronTime: '00 00 00 * * *',
    onTick: function()
    {
        var url = "http://www.pbcom.com.ph/navpu/navpu.js";
        download(url, function (data) {
            if (!data) return console.log("No data found.");
            data = data.toString();
            data = data.split('var ValueEquityFund = "');
            data = data[0].split('"');
            var value = Number(data[0]);
            // do whatever
        });
    }
    ,
    start: false,
    timeZone: 'Asia/Manila'
});

var download = function (url, callback) {
    http.get(url, function (res) {
    var data = "";
    res.on('data', function (chunk) {
        data += chunk;
    });
    res.on("end", function () {
        callback(data);
    });
    }).on("error", function () {
        callback(null);
    });
}

exports.setupQueue = function() {
    scrapeProcess.start();
    console.log('Cron Job Started');
};