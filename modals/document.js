// Tài liệu quản lý nghiệp vụ
var DocumentSchema = new mongoose.Schema({
    title: { type: String },//tiêu đề 
    content: { type: String }, // Nội dung 
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    createBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updateBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    files: [{
        idUpload: { type: String, default: '' },
        urlUpload: { type: String, default: '' },
        nameUpload: { type: String, default: '' },
        created: { type: Date, default: Date.now }
    }],
    type: { type: Number }//type = 1 : quy trình, 2: tài liệu nghiệp vụ, 3 callcenter
}, { id: false, versionKey: 'v' });

DocumentSchema.plugin(require('mongoose-aggregate-paginate'));
DocumentSchema.set('toObject', { getters: true });
DocumentSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('Document', DocumentSchema);