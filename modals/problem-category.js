//Danh mục thể loại vấn đề 
var ProblemCatSchema = new mongoose.Schema({
    nameProblem: { type: String },//	tên vấn đề
    slaProblem:{type:Number},//sla vấn đề
    status: { type: Number, default: 1 },//trạng thái hiển thị
    idComplaint:{type: mongoose.Schema.Types.ObjectId, ref: 'ComplaintCategory', required: true, index: true},// id của loại khiếu nại
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

}, { id: false, versionKey: 'v' });

ProblemCatSchema.plugin(require('mongoose-aggregate-paginate'));
ProblemCatSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('ProblemCategory', ProblemCatSchema);