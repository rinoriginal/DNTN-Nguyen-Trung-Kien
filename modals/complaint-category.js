//Danh mục thể loại khiếu nại 
var ComplaintCatSchema = new mongoose.Schema({
    nameComplaint: { type: String },//	tên thể loại
    slaComplaint: { type: Number, default: 0 },//sla khiếu nại
    status: { type: Number, default: 1 },//trạng thái hiển thị
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

}, { id: false, versionKey: 'v' });

ComplaintCatSchema.plugin(require('mongoose-aggregate-paginate'));
ComplaintCatSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('ComplaintCategory', ComplaintCatSchema);