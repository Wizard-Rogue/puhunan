var models = require('../models/index');
var sessionModel = models.sessionModel;

exports.findOrCreateSession = function (user, expiration, callback) {
    var today = new Date();
    var query = sessionModel.findOne({ user_id: user.id });
    query.where('date_expires').gte(today);
    
    query.exec(function (err, session) {
        if(err) return callback(err);
        
        if(session) {
            var session_entity = sessionModel.toEntity(session);
            return callback(null, session_entity);
        };
        var expiration_date = null;

        if (expiration) {
            expiration_date = new Date(today.getTime() + (expiration * 24 * 60 * 60 * 1000));
        } else {
            expiration_date = new Date(3000, 12, 31);
        };

        var newSession = new sessionModel({
            user_id        : user.id
            , date_created : today
            , date_expires : expiration_date
            , access_level : user.account_type
        });

        newSession.save(function (err) {
            if(err) return callback(err);
            
            var entity = sessionModel.toEntity(newSession);
            return callback(null, entity);
        });
    });
};

exports.disableSessions = function (user, callback) {
    return sessionModel.update({ user_id: user._id }, { access_level: 'disabled' }, { multi: true }, callback);
};
