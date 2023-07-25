var AgentEmailStatusSchema = new mongoose.Schema({
    agent: {type: Number, default: 30},
    online: {type: Number, default: 30},
    offline: {type: Number, default: 90}
}, {id: false, versionKey: 'v'});

AgentEmailStatusSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('AgentEmailStatus', AgentEmailStatusSchema);