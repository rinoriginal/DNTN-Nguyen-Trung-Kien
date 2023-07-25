//Lịch sử tác động khiếu nại - NEW
var ComplaintHistory = new mongoose.Schema({
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },//Phiếu
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },//Người tác động
    content: { type: String }, // Nội dung
    feedback: { type: String }, // feedback
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brands', index: true, default: null }, // Nhãn hiệu
    provinceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Province', index: true, default: null }, // Tĩnh thành
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true, default: null }, // Nhà hàng

    channelType: { type: String }, // Loại kênh,
    typeComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplaintCategory', index: true, default: null }, // Loại khiếu nại
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProblemCategory', index: true, default: null }, // Vấn đề gặp phải

    categoryComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true, default: null }, // Danh mục cha
    subCategoryComplaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', index: true, default: null }, // Danh mục  con 
    deadline: { type: Date, default: null },//thời hạn xử lý
    files: [{
        idUpload: { type: String, default: '' },
        urlUpload: { type: String, default: '' },
        nameUpload: { type: String, default: '' },
    }],
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    status: { type: Number, default: 0 },//0 đang xử lý,1 tạm dừng xử lý 2 đã xử lý
    content: { type: String, default: null },//Nội dung thông báo, allow HTML
    contentObject: { type: mongoose.Schema.Types.Mixed },//Nội dung của lần gửi thông tin đó
    type: { type: Number, default: 0 },//Loại lịch sử thông báo. 0: Thông báo thường, 1: Process ref
    created: { type: Date, default: null, default: Date.now },
    updated: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { id: false, versionKey: 'v' });

ComplaintHistory.set('toJSON', { getters: true });
module.exports = mongoose.model('ComplaintHistory', ComplaintHistory);