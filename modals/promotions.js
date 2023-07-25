

var PromotionsShema = new mongoose.Schema({
    title: {type: String, default: '', required: true},
    content: {type: String, default: '', required: true},
    files: [mongoose.Schema.Types.ObjectId],
    status: {type: Number, default: 1},
    idRestaurants: [mongoose.Schema.Types.ObjectId],
    type: {type: Number}, // 1 - Miền Bắc , 2 - Miền Trung, 3 - Miền Nam
    startTime: {type: Date, default: Date.now},
    endTime: {type: Date, default: Date.now},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    createBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'},
    updateBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'}
}, {id: false, versionKey: 'v'});

PromotionsShema.set('toJSON', {getters: true});
PromotionsShema.plugin(require('mongoose-aggregate-paginate'));
module.exports = mongoose.model('Promotions', PromotionsShema);