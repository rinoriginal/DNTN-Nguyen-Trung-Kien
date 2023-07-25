var MailSpamIdSchema = new mongoose.Schema({
    from: {type: String, required: true},
    emails_spam_id: {type: String},
    body: {type: String, default: ''},
    subject: {type: String, default: ''},
    date_time: {type: Date, default: Date.now},
    user_id: {type: String},

}, {id: false, versionKey: 'v'});

MailSpamIdSchema.plugin(require('mongoose-aggregate-paginate'));
MailSpamIdSchema.set('toObject', {getters: true});
MailSpamIdSchema.set('toJSON', {getters: true});



module.exports = mongoose.model('MailSpamId', MailSpamIdSchema);

