var CustomerIndexSchema = new mongoose.Schema({
    field_so_dien_thoai: { type: String },
    field_ho_ten: { type: String },
    field_thoi_gian_lap_dat_mua: { type: Date, default: null },
    field_san_pham_kh_lap_dat: { type: String },
    field_dia_chi_dai_ly_lap_dat: { type: String },
    status: { type: Number, default: 1 },
    sources: [{ type: mongoose.Schema.Types.ObjectId }],
}, { id: false, versionKey: 'v', collection: 'customerindex' });

CustomerIndexSchema.plugin(require('mongoose-aggregate-paginate'));
CustomerIndexSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('Customerindex', CustomerIndexSchema);