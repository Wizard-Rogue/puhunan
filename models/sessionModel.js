var mongoose = require('mongoose');

module.exports = function() {

    this.ACCESS = [
        'admin'
      , 'public'
      , 'private'
      , 'disabled'
    ];

    this.collection = 'sessions';

    var today = new Date();
    var tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));

    this.schema = mongoose.Schema({
        date_created   : { type: Date, default: Date.now }
        , date_expires : { type: Date, default: tomorrow }
        , user_id      : { type: String, required: true }
        , access_level : { type: String, default: 'public', enum: ACCESS }
    });

    this.schema.statics.toEntity = function (rawModel) {
        return {
            'id'             : rawModel._id
            , 'date_created' : rawModel.date_created
            , 'date_expires' : rawModel.date_expires
            , 'user_id'      : rawModel.user_id
            , 'access_level' : rawModel.access_level
        };
    };

    return this;
}