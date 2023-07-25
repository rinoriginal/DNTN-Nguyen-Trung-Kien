
var MailAdvisorySchema = new mongoose.Schema({
    emails: [{
        _id:false,
        type: { type: Number },
        email: { type: String, default: '' }
    }],
    note: { type: String, default: '' },

    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },

    createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }

}, { id: false, versionKey: 'v' });

MailAdvisorySchema.plugin(require('mongoose-aggregate-paginate'));
MailAdvisorySchema.set('toObject', { getters: true });
MailAdvisorySchema.set('toJSON', { getters: true });

module.exports = mongoose.model('MailAdvisory', MailAdvisorySchema);