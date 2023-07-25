
var SignatureSchema = new mongoose.Schema({
    mail_picker: {type: String, required: true},
    name: {type: String, default: ''},
    mail_name: {type: String, default: ''},
    active: {type: Boolean, required: true},
    body: {type: String, default: ''},
    body_raw: {type: String, default: ''},
    created:{type:Date,default: Date.now()}
}, {id: false, versionKey: 'v'});
SignatureSchema.plugin(require('mongoose-aggregate-paginate'));
SignatureSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('Signature', SignatureSchema);