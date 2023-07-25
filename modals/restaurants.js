

var RestaurantsShema = new mongoose.Schema({
    name: { type: String, default: '', required: true }, // Tên nhà hàng
    code: { type: String, default: '', required: true }, // Mã nhà hàng 
    tag: { type: String, default: '', required: true }, // SBU - Nhãn nhà hàng
    idProvince: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Provinces', required: true },
    idBrand: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Brands', required: true },
    status: { type: Number, default: 1 },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    createBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updateBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
}, { id: false, versionKey: 'v' });

RestaurantsShema.set('toJSON', { getters: true });

RestaurantsShema.index({ code: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Restaurants', RestaurantsShema);