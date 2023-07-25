var CustomerIndexSchema = new mongoose.Schema({
    field_so_dien_thoai: { type: String },
    field_ho_ten: { type: String },
    field_tinh_thanh: [{ type: String }],
    field_quan_huyen: [{ type: String }],
    field_id: { type: String, default: null },
    field_ghi_chu: { type: String },
    field_dia_chi_chi_tiet: { type: String },
    field_dong_xe: { type: String },
    sources: [{ type: mongoose.Schema.Types.ObjectId }],
    status: { type: Number, default: 1 },
}, { id: false, versionKey: 'v', collection: 'customerindex' });

CustomerIndexSchema.pre('save', function (next) {
    var self = this;
    self.constructor.count(function (err, data) {
        if (err) {
            return next(err);
        }
        self.field_id = "KH" + (data + 1)
        mongoClient.collection('field_id').insert({ entityId: self._id, value: "KH" + (data + 1) });
        return next();
    });
})

CustomerIndexSchema.plugin(require('mongoose-aggregate-paginate'));
CustomerIndexSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('Customerindex', CustomerIndexSchema);