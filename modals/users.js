var user_ternalLeaders = mongoose.Schema({
    ternal: { type: mongoose.Schema.Types.ObjectId, ref: 'Ternal' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
}, { _id: false });

var user_companyLeaders = mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
}, { _id: false });

var user_agentGroupLeaders = mongoose.Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentGroups' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
}, { _id: false });

var user_agentGroupMembers = mongoose.Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentGroups' },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
}, { _id: false });


var UserSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, default: 'Người dùng' },
    email: { type: String, required: true },
    avatar: { type: String, default: '/assets/uploads/avatar/default.jpg' },
    accountCode: { type: Number },
    ternalLeaders: [user_ternalLeaders],
    companyLeaders: [user_companyLeaders],
    agentGroupLeaders: [user_agentGroupLeaders],
    agentGroupMembers: [user_agentGroupMembers],
    status: { type: Number, default: 1 },
    role: { type: Number, default: 3 },
    created: { type: Date, default: Date.now },
    idAgentCisco: { type: Number, default: null },
}, { id: false, versionKey: 'v' });

UserSchema.plugin(require('mongoose-aggregate-paginate'));
UserSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('User', UserSchema);