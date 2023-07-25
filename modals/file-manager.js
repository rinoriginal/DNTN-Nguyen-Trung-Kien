

var FileManagerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    created: { type: Date, default: Date.now },
    updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updated: { type: Date, default: null },
    type: { type: Number, default: 0 },
    //0: Chưa xác định
    //1: File đính kèm trong bài viết thường (news)
    //2: File đính kèm trong Giải trình (complaint)
    //3: File đính kèm trong Xử lý sự vụ (complaint)
    //4: File đính kèm trong Thêm chốt lỗi (complaint)
    status: { type: Number, default: 1 },// Kich hoat
}, { id: false, versionKey: 'v' });

FileManagerSchema.plugin(require('mongoose-aggregate-paginate'));
FileManagerSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('FileManager', FileManagerSchema);





