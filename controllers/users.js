var models = require('../models/index');
var userModel = models.userModel;
var sessionLib = require('../libraries/sessionLibrary');

exports.index = function(req, res){
    if (req.params.session.access_level !== 'admin' && typeof req.query.term === 'undefined') return res.send({error: 'No users found'});
    var orStatement = [];
    if(typeof req.query.term !== 'undefined') {
        var term = req.query.term;
        if (term.replace(/\s/g, "").length < 1) return res.send({error: 'Invalid search parameters', data: {search_query: term}});
        orStatement.push({ first_name: new RegExp(req.query.term, 'i')});
        orStatement.push({ last_name: new RegExp(req.query.term, 'i')});
    };

    var query = userModel.find();

    if(typeof(req.query.verified) !== 'undefined') {
        if (req.query.verified === 'true') {
            query.where('verified', true);
        } else {
        query.where('verified', false);
        };
    };

    if (orStatement.length > 0) query.or(orStatement);

    query.exec(function (err, users) {
        if(err) return res.send({error: err});
        if(users.length < 1) return res.send({error:'No users found'});
        var entities = [];
        for (var i = users.length - 1; i >= 0; i--) {
            var entity = userModel.toEntity(users[i]);
            entities.push(entity);
        };

        res.send({success:'Successfully queried users', data:entities});
    });
};

exports.get = function(req, res){
    userModel.findOne({ _id: req.params.id }, function (err, user) {
        if(err) return res.send({error: err});

        if(!user) return res.send({error:'No user found'});
        var entity = userModel.toEntity(user);
        res.send({success:'Successfully queried user',  data: { user: entity }});
    });
};

exports.update = function(req, res){
    var queryParams = { _id: req.params.id };
    if (req.query.method && req.query.method === 'changeEmail') queryParams.email = req.body.old_email;

    userModel.findOne(queryParams, function (err, user) {
        if(err) return res.send({error: err});
        if (!user) return res.send({error: 'No user found with that user id: '+ req.params.id});
        var params = {};
        for (var key in req.body) {
            if (req.body.hasOwnProperty(key)) params[key] = req.body[key];
            // if expecting new_email and old_email in here, not sure if it will get passed to userModel. Investigate.
        };

        delete params.password;
        delete params.verified;
        delete params.email;
        delete params.login_attempts;
        delete params.lock_until;
        delete params.date_created;

        if (req.query.method) {
            if (req.query.method === 'delete') params = { account_type: 'disabled' };
            if (req.query.method === 'changeEmail') {
                if (!req.body.new_email) return res.send({"error": "No new email supplied"});
                params.email = req.body.new_email;
                params.verified = false;
            };
        };

        user.update({ $set: params },function (err) {
            if(err) return res.send({error: err});
            console.log('User:', user);
            res.send({success: 'User with id ' + req.params.id + ' has been successfully updated', data: { user: user }});
        });
    });
};

exports.login = function(req, res){
    var email = req.body.email;
    var password = req.body.password;
    var expiration = req.body.expiration;

    userModel.getAuthenticated(email, password, function (err, user, reason) {
        if (err) return res.send({error: err});
        if (!user) {
            var reasons = userModel.failedLogin;
            var message = 'Authentication Failed';
            switch (reason) {
                case reasons.NOT_FOUND:
                    console.log('not found');
                    break;
                case reasons.PASSWORD_INCORRECT:
                    console.log('wrong password');
                    break;
                case reasons.MAX_ATTEMPTS:
                    message += '. Account is currently locked.';
                    break;
                case reasons.DISABLED:
                    message += '. This account has been deleted.';
                    break;
            }
            return res.send({error: message});
        };
        
        sessionLib.findOrCreateSession(user, expiration, function (err, session) {
            if (err) return res.send({error: err});
            session.is_new = user.is_new;
            return res.send({success: 'Logged in successfully', data: {session: session}});
        });
    });
};

exports.create = function(req, res){
    var user = new userModel({
        email             : req.body.email
        , first_name      : req.body.first_name
        , last_name       : req.body.last_name
        , password        : req.body.password
        , account_type    : req.body.account_type
    });

    user.save(function (err) {
        if(err) return res.send({error: err});
        
        var entity = userModel.toEntity(user);
        res.send({success: 'New user created', data: {'user': entity}});
    });
};

exports.logout = function (req, res){
    var session = req.params.session;

    session.remove(function (err, session) {
        if(err) return res.send({error: err});
        res.send({success: 'successfully logged out user ' + req.params.user.id});
    });
};

exports.verifyEmail = function(req, res) {
    var key = req.params.key;

    userModel.findOne({ _id: req.params.id }, function (err, user) {
        if (err) return res.send({error: err});
        if (!user) return res.send({error: 'Verification failed. No user with that matching id.'});
        if (user.verified) return res.send({error: "User is already verifed."});
        if (key != user.date_created.valueOf()) return res.send({error: 'Verification failed. Key mismatch.'});
        user.update({ $set: { verified: true } }, function (err) {
            if (err) return res.send({error: err});
            
            res.send({success: 'Successfully verified user email'});
        });
    });
};
