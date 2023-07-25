
var MailComplaintSchema = new mongoose.Schema({
    idRestaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurants', default: null },
    email1: { type: String, default: '' },
    email2: { type: String, default: '' },
    email3: { type: String, default: '' },
    email4: { type: String, default: '' },
    note: { type: String, default: '' },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }

}, { id: false, versionKey: 'v' });

MailComplaintSchema.plugin(require('mongoose-aggregate-paginate'));
MailComplaintSchema.set('toObject', { getters: true });
MailComplaintSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('MailComplaint', MailComplaintSchema);