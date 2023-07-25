const { string } = require('underscore');

var MailInboundSourceSchema = new mongoose.Schema({
    name: {type: String, required: true}, // Tên source
    idMailInboundChannel: {type: mongoose.Schema.Types.ObjectId, ref : 'MailInboundChannel', required: true},
    idMailCisco: {type: Number, required: true}, // Dùng để định danh  1 config mail trên cisco,
    emailInbound: {type: String}, // Địa chỉ email dùng để nhận  khách hàng gửi tới
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    status: {type: Number, default: 1},
}, {id: false, versionKey: 'v'});

MailInboundSourceSchema.statics._deleteAll = function (ids, cb) {
    mongoose.model('MailInboundSource').find({_id: ids}, function (error, ss) {
        if (!ss) {
            cb(error, 404);
        }else{
            _async.forEachOf(ss, function(s, i, cb1){
                mongoose.model('MailInboundSource').remove({_id: s._id}, cb1);
            }, function (err) {
                cb(err);
            })
        }
    });
};


MailInboundSourceSchema.plugin(require('mongoose-aggregate-paginate'));
MailInboundSourceSchema.set('toObject', {getters: true});
MailInboundSourceSchema.set('toJSON', {getters: true});

module.exports = mongoose.model('MailInboundSource', MailInboundSourceSchema);

