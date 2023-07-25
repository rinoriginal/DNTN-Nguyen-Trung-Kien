
var CustomerJourneySchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.Mixed, index: true, default: null },
    ticketObject: { type: mongoose.Schema.Types.Mixed, required: true }
}, { id: false, versionKey: 'v' });

CustomerJourneySchema.plugin(require('mongoose-aggregate-paginate'));
CustomerJourneySchema.set('toObject', { getters: true });
CustomerJourneySchema.set('toJSON', { getters: true });

module.exports = mongoose.model('CustomerJourney', CustomerJourneySchema);