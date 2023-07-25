var WorkLog = new mongoose.Schema({
    idAgent: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    idTicket: {type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null},
    idCompany: {type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null},
    createTime:  {type: Date, default:null},
    completeTime:  {type: Date, default:null},
    processTime: {type: Number, default: null},

    type: {type: Number, default: 1}, // 1= voice, 2= chat, 3 = mail

    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {id: false, versionKey: 'v'});

WorkLog.set('toJSON', {getters: true});
module.exports = mongoose.model('WorkLog', WorkLog);

