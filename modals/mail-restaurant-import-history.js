var MailRestaurantImportHistorySchema = new mongoose.Schema({
    name: {type: String, required: true, index: true},
    url: {type: String, required: true},
    description: {type: String},
    createBy: {type: String},
    created: {type: Date, default: Date.now()},
    status: {type: Number, default: 1}
}, {id: false, versionKey: 'v'});

MailRestaurantImportHistorySchema.plugin(require('mongoose-aggregate-paginate'));
MailRestaurantImportHistorySchema.set('toJSON', {getters: true});
module.exports = mongoose.model('MailRestaurantImportHistory', MailRestaurantImportHistorySchema);