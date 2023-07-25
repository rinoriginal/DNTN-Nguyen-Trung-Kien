const { string } = require('underscore');


var SourceChannelSchema = new mongoose.Schema({
    name: {type: String, required: true}, // Tên page
    idCompanyChannel: {type: mongoose.Schema.Types.ObjectId, ref : 'CompanyChannel', required: true},
    status: {type: Number, default: 1},
    idSourceChannel: {type: String, required: true} ,// id page 
}, {id: false, versionKey: 'v'});

SourceChannelSchema.statics._deleteAll = function (ids, cb) {
    mongoose.model('SourceChannel').find({_id: ids}, function (error, ss) {
        if (!ss) {
            cb(error, 404);
        }else{
            _async.forEachOf(ss, function(s, i, cb1){
                mongoose.model('SourceChannel').remove({_id: s._id}, cb1);
            }, function (err) {
                cb(err);
            })
        }
    });
};


SourceChannelSchema.plugin(require('mongoose-aggregate-paginate'));
SourceChannelSchema.set('toObject', {getters: true});
SourceChannelSchema.set('toJSON', {getters: true});

module.exports = mongoose.model('SourceChannel', SourceChannelSchema);

