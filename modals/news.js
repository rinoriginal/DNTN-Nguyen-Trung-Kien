

var NewsShema = new mongoose.Schema({
    title: {type: String, default: '', required: true},
    content: {type: String, default: '', required: true},
    idCategory: {type:mongoose.Schema.Types.ObjectId, default: null, ref: 'restaurantcategories', required: true},
    files: [mongoose.Schema.Types.ObjectId],
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    createBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'},
    updateBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User'}
}, {id: false, versionKey: 'v'});

NewsShema.set('toJSON', {getters: true});
NewsShema.plugin(require('mongoose-aggregate-paginate'));
module.exports = mongoose.model('News', NewsShema);