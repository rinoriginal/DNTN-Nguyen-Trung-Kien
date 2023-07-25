const { string } = require('underscore');


var MailInboundChannelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: Number, default: 1 },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    idCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    slaTimeConversation: { type: Number }, // SLA  thời lượng luồng mail
    slaTimeReceive: { type: Number }, // SLA thời gian tiếp nhận
    slaTimeWait: { type: Number }, // SLA Thời gian chờ giữa các mail
    idQueue: { type: String, require: true },
    idAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    idSkillGroup: { type: String },
    urlSkillGroup: { type: String },
    idAgentGroups: [{type: mongoose.Schema.Types.ObjectId, ref : 'AgentGroups', required: true}], // Dùng để gán team agent cho kênh chát 
}, { id: false, versionKey: 'v' });

MailInboundChannelSchema.statics._deleteAll = function (ids, cb) {
    mongoose.model('MailInboundChannel').find({ _id: ids }, function (error, ss) {
        if (!ss) {
            cb(error, 404);
        } else {
            _async.forEachOf(ss, function (s, i, cb1) {
                mongoose.model('MailInboundChannel').remove({ _id: s._id }, cb1);
            }, function (err) {
                cb(err);
            })
        }
    });
};


MailInboundChannelSchema.plugin(require('mongoose-aggregate-paginate'));
MailInboundChannelSchema.set('toObject', { getters: true });
MailInboundChannelSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('MailInboundChannel', MailInboundChannelSchema);

