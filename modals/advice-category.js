//Danh mục loại tư vấn
var AdviceCatSchema = new mongoose.Schema({
    nameAdvice: { type: String },//	tên loại tư vấn
    status: { type: Number, default: 1 },//trạng thái hiển thị
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    type:{type:Number},//loại tư vấn -1:tuyển dụng,2 đề xuất kinh doanh, 3 khác
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now }
}, { id: false, versionKey: 'v' });

AdviceCatSchema.plugin(require('mongoose-aggregate-paginate'));
AdviceCatSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('AdviceCategory', AdviceCatSchema);