var UserRestaurantSchema = new mongoose.Schema({
    idAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    idRestaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurants' },
    status: { type: Number, default: 1 },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { id: false, versionKey: 'v' });
UserRestaurantSchema.plugin(require('mongoose-aggregate-paginate'));
UserRestaurantSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('UserRestaurant', UserRestaurantSchema);