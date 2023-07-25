var DistrictShema = new mongoose.Schema({
    name: { type: String, default: '' },
    idProvince: { type: mongoose.Schema.Types.ObjectId, ref: 'Provinces' },
    status: { type: Number, default: 1 },
}, { id: false, versionKey: 'v' });

DistrictShema.set('toJSON', { getters: true });
module.exports = mongoose.model('Districts', DistrictShema);