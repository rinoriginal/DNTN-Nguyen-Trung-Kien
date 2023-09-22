
var BrandsShema = new mongoose.Schema({
    name: {type: String, default: '', required: true},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    createBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'},
    updateBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'}
}, {id: false, versionKey: 'v'});

BrandsShema.set('toJSON', {getters: true});

BrandsShema.index({name: 1},{unique:true});

module.exports = mongoose.model('Brands', BrandsShema);