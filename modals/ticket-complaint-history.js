
var TicketComplaintHistorySchema = new mongoose.Schema({
    ticketComplaintId: {type: mongoose.Schema.Types.ObjectId, ref: 'TicketComplaint', index: true, default: null},
    tickeComplainttObject: {type: mongoose.Schema.Types.Mixed, required: true}
}, {id: false, versionKey: 'v'});

TicketComplaintHistorySchema.plugin(require('mongoose-aggregate-paginate'));
TicketComplaintHistorySchema.set('toObject', {getters: true});
TicketComplaintHistorySchema.set('toJSON', {getters: true});

module.exports = mongoose.model('TicketComplaintHistory', TicketComplaintHistorySchema);