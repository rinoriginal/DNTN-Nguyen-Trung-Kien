
var TicketComplaintSchema = new mongoose.Schema({
    content: { type: String }, // Nội dung
    feedbacks: [
        {
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            time: { type: Date, default: Date.now },
            content: { type: String },
            attachments: { type: Array, default: [] },

        }
    ],//Phản hồi của khách hàng
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brands', index: true, default: null }, // Nhãn hiệu
    provinceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Province', index: true, default: null }, // Tĩnh thành
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true, default: null }, // Nhà hàng

    channelType: { type: Number }, // Loại kênh,
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
    filesRecord: [
        {
            source: { type: String },
            recordPath: { type: String }
        }],//file ghi âm
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    status: { type: Number, default: 0 },//0 đang xử lý,1 tạm dừng xử lý 2 đã xử lý

    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },


}, { id: false, versionKey: 'v' });

TicketComplaintSchema.plugin(require('mongoose-aggregate-paginate'));
TicketComplaintSchema.set('toObject', { getters: true });
TicketComplaintSchema.set('toJSON', { getters: true });

module.exports = mongoose.model('TicketComplaint', TicketComplaintSchema);