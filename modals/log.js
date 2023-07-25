var Log = new mongoose.Schema({
    idAgent: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    data:{type: mongoose.Schema.Types.Mixed},//Dữ liệu khởi chạy
    result:{type: mongoose.Schema.Types.Mixed},//Kết quả xử lý
    target: {type: String, default: null},//Url API, Method...
    type: {type: String, default: "api"}, // sms, mail, api
    status: {type: Number, default: 1},//1-Success, 2-Fail,
    timeBegin: {type: Date},//Thoi gian bat dau chay API
    timeDone: {type: Date},//Thoi gian server tra ve ket qua
    created: {type: Date, default: Date.now}
}, {id: false, versionKey: 'v'});

Log.set('toJSON', {getters: true});
module.exports = mongoose.model('Log', Log);

