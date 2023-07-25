var MailCampaignSchema = new mongoose.Schema({
    name: {type: String, required: false, index: true},
    subject: {type: String, required: false, index: true},
    body_raw: {type: String, required: false},
    setting: {type: mongoose.Schema.Types.ObjectId, ref: 'ServiceMail'},
    sources: [{type: mongoose.Schema.Types.ObjectId, ref: 'CustomerSource'}],
    attachments: [{type: String}],
    files: {type: Array, default: []},
    amount: {type: Number, default: 0},
    completed: {type: Number, default: 0},
    type: {type: String, default: 'save'},
    status: {type: Number, default: 1, index: true},
    sendDate: {type: Date, default: null},
    created: {type: Date, default: Date.now},
    isMailInbound: {type: Number, default: 0, index: true}
}, {id: false, versionKey: 'v', collection: 'mailcampaigns'});

MailCampaignSchema.plugin(require('mongoose-aggregate-paginate'));
MailCampaignSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('MailCampaigns', MailCampaignSchema);
