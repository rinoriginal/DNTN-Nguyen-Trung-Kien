var SurveyChatAnswerSchema = new mongoose.Schema({
    reason: {type: String},
    value: {type: String},
    idQuestion: {type: mongoose.Schema.Types.ObjectId, ref: 'SurveyChatQuestion', default: null},
    idThread: {type: mongoose.Schema.Types.ObjectId, ref: 'SurveyChatQuestion', required:true},
    idAgent: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required:true},
    idService: {type: mongoose.Schema.Types.ObjectId, ref: 'ServiceChat', required:true},
    idCompany: {type: mongoose.Schema.Types.ObjectId, ref: 'Company'},
    idCompanyChannel: {type: mongoose.Schema.Types.ObjectId, ref: 'CompanyChannel'},
    customerName: {type:String},
    customerPhone: {type:String},
    customerEmail: {type: String},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {id: false, versionKey: 'v'});


SurveyChatAnswerSchema.plugin(require('mongoose-aggregate-paginate'));
SurveyChatAnswerSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('SurveyChatAnswer', SurveyChatAnswerSchema);