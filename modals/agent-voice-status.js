var AgentVoiceStatusSchema = new mongoose.Schema({
    agent: {type: Number, default: 30},
    san_sang_phuc_vu: {type: Number, default: 90},
    khong_san_sang_phuc_vu: {type: Number, default: 90},
    nghi_trua: {type: Number, default: 90},
    meeting: {type: Number, default: 90},
    autodialing: {type: Number, default: 90}
}, {id: false, versionKey: 'v'});

AgentVoiceStatusSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('AgentVoiceStatus', AgentVoiceStatusSchema);