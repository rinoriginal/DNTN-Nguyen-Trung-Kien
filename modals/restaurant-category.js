

var RestaurantCatogoryShema = new mongoose.Schema({
    name: {type: String, default: '', required: true}, // Tên menu
    idParent:  {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'RestaurantCatogory'},
    idRestaurant: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'Restaurants'},
    type: { type: Number}, // Danh mục theo tab,  1 là tab menu,  2 là tab thông tin nhà hàng, 3 là tab CTKM
    weight: {type: Number},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    createBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'},
    updateBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'}
}, {id: false, versionKey: 'v'});

RestaurantCatogoryShema.set('toJSON', {getters: true});

RestaurantCatogoryShema.index({name:1, idRestaurant:1, type: 1, idParent: 1},{unique:true});

module.exports = mongoose.model('RestaurantCatogory', RestaurantCatogoryShema);