var mongoose = require('mongoose')
        bcrypt = require('bcrypt'),
        SALT_WORK_FACTOR = 10,
        MAX_LOGIN_ATTEMPTS = 5,
        LOCK_TIME = 2 * 60 * 60 * 1000;

module.exports = function() {

    this.ACCESS = [
        'admin'
      , 'public'
      , 'private'
      , 'disabled'
    ];

    this.collection = 'users';

    this.schema = mongoose.Schema({
        date_created      : { type: Date, default: Date.now }
        , email           : { type: String, required: false, index: { unique: true } }
        , first_name      : String
        , last_name       : String
        , password        : String
        , verified        : { type: Boolean, default: false }
        , login_attempts  : { type: Number, required: true, default: 0 }
        , lock_until      : Number
        , account_type    : { type: String, default: 'public', enum: ACCESS }
    });

    this.schema.statics.toEntity = function(rawModel) {
        var fullName = rawModel.first_name + " " + rawModel.last_name;
        fullName = fullName.trim();
        return {
            'id'                : rawModel._id
            , 'date_created'    : rawModel.date_created
            , 'email'           : rawModel.email
            , 'first_name'      : rawModel.first_name
            , 'last_name'       : rawModel.last_name
            , 'fullName'        : fullName
            , 'verified'        : rawModel.verified
            , 'lock_until'      : rawModel.lock_until
            , 'account_type'    : rawModel.account_type
            , 'login_attempts'  : rawModel.login_attempts
        };
    };

    this.schema.virtual('isLocked').get(function() {
        // check for a future lock_until timestamp
        return !!(this.lock_until && this.lock_until > Date.now());
    });

    this.schema.virtual('isDisabled').get(function() {
        // check for a future lock_until timestamp
        return !!(this.account_type === 'disabled');
    });

    this.schema.pre('save', function (next) {
        this._isDisabled = this.account_type === 'disabled';
        var user = this;
        // only hash the password if it has been modified (or is new)
        if (!user.isModified('password')) return next();

        // generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
            if (err) return next(err);
            // hash the password using our new salt
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) return next(err);
                // override the cleartext password with the hashed one
                user.password = hash;
                next();
            });
        });
    });

    this.schema.post('save', function (user) {
        if (this._isDisabled) {
            var sessionLib = require('../libraries/sessionLibrary');

            sessionLib.disableSession(user._id, function (err, affected, raw) {
                if (err) return console.log('Error here:', err);
                return console.log(affected, ' Session/s disabled');
            });
        };
    });

    this.schema.methods.comparePassword = function (candidatePassword, callback) {
        bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
            if (err) return callback(err);
            callback(null, isMatch);
        });
    };

    this.schema.methods.incLoginAttempts = function (callback) {
        // if we have a previous lock that has expired, restart at 1
        if (this.lock_until && this.lock_until < Date.now()) {
            return this.update({
                $set: { login_attempts: 1 },
                $unset: { lock_until: 1 }
            }, callback);
        }
        // otherwise we're incrementing
        var updates = { $inc: { login_attempts: 1 } };
        // lock the account if we've reached max attempts and it's not locked already
        if (this.login_attempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
            updates.$set = { lock_until: Date.now() + LOCK_TIME };
        }
        return this.update(updates, callback);
    };

    // expose enum on the model, and provide an internal convenience reference 
    var reasons = this.schema.statics.failedLogin = {
        NOT_FOUND: 0,
        PASSWORD_INCORRECT: 1,
        MAX_ATTEMPTS: 2,
        NOT_VERIFIED: 3,
        DISABLED: 4
    };

    this.schema.statics.getAuthenticated = function (email, password, callback) {
        var filter = { email: email };
        this.findOne(filter, function (err, user) {
            if (err) return callback(err);

            // make sure the user exists
            if (!user) return callback(null, null, reasons.NOT_FOUND);

            // check if the account is currently disabled
            if (user.isDisabled) return callback(null, null, reasons.DISABLED);

            // check if the account is currently locked
            if (user.isLocked) {
                // just increment login attempts if account is already locked
                return user.incLoginAttempts(function (err) {
                    if (err) return callback(err);
                    return callback(null, null, reasons.MAX_ATTEMPTS);
                });
            }

            // check if the account is currently not verified
            if (!user.verified) {
                // just increment login attempts if account is already locked
                return user.incLoginAttempts(function (err) {
                    if (err) return callback(err);
                    return callback(null, null, reasons.NOT_VERIFIED);
                });
            }

            // test for a matching password
            user.comparePassword(password, function (err, isMatch) {
                if (err) return callback(err);

                // check if the password was a match
                if (isMatch) {
                    // if there's no lock or failed attempts, just return the user
                    if (!user.login_attempts && !user.lock_until) return callback(null, user);
                    // reset attempts and lock info
                    var updates = {
                        $set: { login_attempts: 0 },
                        $unset: { lock_until: 1 }
                    };
                    return user.update(updates, function (err) {
                        if (err) return callback(err);
                        return callback(null, user);
                    });
                }

                // password is incorrect, so increment login attempts before responding
                user.incLoginAttempts(function (err) {
                    if (err) return callback(err);
                    return callback(null, null, reasons.PASSWORD_INCORRECT);
                });
            });
        });
    };

    this.schema.index({ email: 1 });
    this.schema.set('autoIndex', false);

    return this;
}