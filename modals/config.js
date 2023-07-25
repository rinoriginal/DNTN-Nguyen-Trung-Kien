var ConfigSchema = new mongoose.Schema({
    survey: {
        code: { type: String },
        campaign: { type: String }
    },
    prefix: { type: String },
    Agent_Team: { type: String },
    ipRecording: { type: String },
    ipCiscoReport: { type: String },
    tokenDefault: { type: String },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    createBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updateBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' }
}, { id: false, versionKey: 'v', collection: 'configs' });

ConfigSchema.plugin(require('mongoose-aggregate-paginate'));
ConfigSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('Config', ConfigSchema);
