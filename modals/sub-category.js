//Danh mục sub category 
var SubCategorySchema = new mongoose.Schema({
    subCategory: { type: String },//	VARCHAR2
    status: { type: Number, default: 1 },//trạng thái hiển thị
    idCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

}, { id: false, versionKey: 'v' });

SubCategorySchema.plugin(require('mongoose-aggregate-paginate'));
SubCategorySchema.set('toJSON', { getters: true });
module.exports = mongoose.model('SubCategory', SubCategorySchema);