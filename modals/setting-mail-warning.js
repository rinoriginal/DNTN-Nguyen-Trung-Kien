var Schema = new mongoose.Schema({
    idUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    thoiGianPhanHoiMail: { type: Number, default: 0 },
    soLuongKyTuTrongMail: { type: Number, default: 0 },
    soLuongAgentOffline: { type: Number, default: 0 }
}, { id: false, versionKey: 'v' });
Schema.set('toJSON', { getters: true });
module.exports = mongoose.model('SettingMailWarning', Schema);