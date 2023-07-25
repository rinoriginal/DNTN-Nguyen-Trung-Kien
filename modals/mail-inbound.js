
var MailInboundSchema = new mongoose.Schema({
    activityId: {type: Number},
    caseId: {type: Number},
    subject: {type: String, default: ''},
    content: {type: String, default: ''},
    textContent: {type: String, default:''},
    emailSize: {type: Number, default: 0},
    formEmailAddress: {type: String},
    recvEmailAddress: {type: String},
    contentType: {type: String},
    header: {type: String},
    activityMode: {type: Number},
    activityType: {type: Number},
    activitySubType: {type: Number},
    activityStatus: {type: Number},
    activitySubStatus: {type: Number},
    whenCreated: {type: Date},
    whenModified: {type: Date},
    aliasId: {type: Number},
    idCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    idAgent: {type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null},
    idMailInboundChannel: {type: mongoose.Schema.Types.ObjectId, ref: 'MailInboundChannel', index: true, default: null},
}, {id: false, versionKey: 'v'});
MailInboundSchema.index({from: 'text', to: 'text', subject: 'text', body: 'text'}, {name: 'Mail index', weights: {subject: 10, body: 4, from: 2, to: 1}});
MailInboundSchema.plugin(require('mongoose-aggregate-paginate'));
MailInboundSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('MailInbound', MailInboundSchema);