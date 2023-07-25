
var TicketAdvisorySchema = new mongoose.Schema({
    content: { type: String, default: '' }, // Nội dưng tư vấn
    advisoryTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdvisoryType', index: true, default: null },
    emailTo: { type: String }, // email dùng để gủi email tới
    // files: [mongoose.Schema.Types.ObjectId],
    files: [{
        idUpload: { type: String, default: '' },
        urlUpload: { type: String, default: '' },
        nameUpload: { type: String, default: '' },
    }],
    idCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    status: { type: Number, default: 0 },

    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },

    createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }

}, { id: false, versionKey: 'v' });

TicketAdvisorySchema.plugin(require('mongoose-aggregate-paginate'));
TicketAdvisorySchema.set('toObject', { getters: true });
TicketAdvisorySchema.set('toJSON', { getters: true });

module.exports = mongoose.model('TicketAdvisory', TicketAdvisorySchema);