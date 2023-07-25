var SkillGroupShema = new mongoose.Schema({
    name: { type: String, default: '', required: true, unique: true },
    listSkills: [],
    listIdAgent: [],
    status: { type: Number, default: 1 },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null, ref: 'User' }
}, { id: false, versionKey: 'v' });

SkillGroupShema.plugin(require('mongoose-aggregate-paginate'));
SkillGroupShema.set('toJSON', { getters: true });
module.exports = mongoose.model('SkillGroups', SkillGroupShema);

