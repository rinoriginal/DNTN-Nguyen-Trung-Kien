var MailSpamSchema = new mongoose.Schema({
    emails_spam: {type: String},
    date_time: {type: Date, default: Date.now},
    user_id: {type: String},

}, {id: false, versionKey: 'v'});

MailSpamSchema.plugin(require('mongoose-aggregate-paginate'));
MailSpamSchema.set('toObject', {getters: true});
MailSpamSchema.set('toJSON', {getters: true});



module.exports = mongoose.model('MailSpam', MailSpamSchema);

