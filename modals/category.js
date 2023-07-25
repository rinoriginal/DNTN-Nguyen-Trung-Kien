//Danh mục 
var CategorySchema = new mongoose.Schema({
    category: { type: String },// tên danh mục
    status: { type: Number, default: 1 },//trạng thái hiển thị
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

}, { id: false, versionKey: 'v' });

CategorySchema.plugin(require('mongoose-aggregate-paginate'));
CategorySchema.set('toJSON', { getters: true });
module.exports = mongoose.model('Category', CategorySchema);