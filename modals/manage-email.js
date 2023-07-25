
var ManageEmailSchema = new mongoose.Schema({
    email: {type: String},
    type: {type: Number}, // Phân biệt loại email 
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    createBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref : 'User'},
    updateBy: {type: mongoose.Schema.Types.ObjectId, default: null, ref : 'User'},
    status: {type: Number, default: 1},
}, {id: false, versionKey: 'v'});

ManageEmailSchema.plugin(require('mongoose-aggregate-paginate'));
ManageEmailSchema.set('toObject', {getters: true});
ManageEmailSchema.set('toJSON', {getters: true});

module.exports = mongoose.model('ManageMail', ManageEmailSchema);

