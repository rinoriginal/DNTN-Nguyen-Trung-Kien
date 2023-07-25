var Schema = new mongoose.Schema({
    idUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    thoiGianChat: { type: Number, default: 0 },
    soLuongMessage: { type: Number, default: 0 },
    soLuongAgentOffline: { type: Number, default: 0 },
    soLuongTinNhanDoVaoHeThong: { type: Number, default: 0 },
    soLuongChatCho: { type: Number, default: 0 },
    tylePhucVu: { type: Number, default: 0 }
}, { id: false, versionKey: 'v' });
Schema.set('toJSON', { getters: true });
module.exports = mongoose.model('SettingChatWarning', Schema);