var UserRestaurantImportHistorySchema = new mongoose.Schema({
    name: {type: String, required: true, index: true},
    url: {type: String, required: true},
    description: {type: String},
    createBy: {type: String},
    created: {type: Date, default: Date.now()},
    status: {type: Number, default: 1}
}, {id: false, versionKey: 'v'});

UserRestaurantImportHistorySchema.plugin(require('mongoose-aggregate-paginate'));
UserRestaurantImportHistorySchema.set('toJSON', {getters: true});
module.exports = mongoose.model('UserRestaurantImportHistory', UserRestaurantImportHistorySchema);