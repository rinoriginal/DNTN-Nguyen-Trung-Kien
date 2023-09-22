
var ProvincesShema = new mongoose.Schema({
    name: {type: String, default: '', required: true},
    typeArea: {type: Number}, // 1 - Miền Bắc , 2 - Miền Trung, 3 - Miền Nam
    status: {type: Number, default: 1},
}, {id: false, versionKey: 'v'});

ProvincesShema.set('toJSON', {getters: true});
module.exports = mongoose.model('Provinces', ProvincesShema);