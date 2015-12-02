var models = require('../models/index');
var sessionModel = models.sessionModel;

exports.sessionWithUser = function(req, res, next) {
    if (!req.query.session) {
        res.send({error: 'Session required.'});
        return;
    };
    var session_id = req.query.session;
    var userModel = models.userModel;

    sessionModel.findOne({ _id: session_id }, function (err, session) {
        if(err) return res.send({error: err});
        if(!session) return res.send({error : 'No session with session_id: ' + session_id + ' exists'});

        var today = new Date();

        if (session.date_expires.getTime()<today.getTime()) return res.send({error : 'Session has expired. Please login again to renew your session.'});

        // Add the session entity in req.params so that the next controller can access it
        req.params.session = session;

        userModel.findOne({ _id: session.user_id }, function (err, user) {
            if(err) return res.send({error: err});

            if(!user) return res.send({error : 'No user currently exists with that session.'});
            
            var user_entity = userModel.toEntity(user);
            // Add the user entity in req.params so that the next controller can access it
            req.params.user = user_entity;
            next();
        });
    });
};

exports.checkForAdminAccess = function (req, res, next) {
    if (req.params.session.access_level !== 'admin') {
        console.log({error: 'Unauthorized access', session: req.params.session, user: req.params.user});
        return res.send({error: 'Unauthorized access', data: {session: req.params.session, user: req.params.user}});
    };

    next();
};
