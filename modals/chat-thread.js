var ChatThreadSchema = new mongoose.Schema({
    agentId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    agentMessage: { type: mongoose.Schema.Types.Mixed, default: [] },
    /*agentMessage:
        [
            {_id: "123123123", send: 1, receive: 10, response: 20},
            {_id: "123123123" , send: 0, receive : 2, response: 0}
    ],*/ //send: số lượng tin nhắn agent gửi; receive: số lượng nhận; response: thời gian phản hồi tin nhắn

    agentStatusLogs: { type: mongoose.Schema.Types.Mixed, default: [] },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    clientId: { type: String, required: true }, //ip + channel + service + cookie
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyChannel', index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    country: { type: String, default: '' },
    region: { type: String, default: '' },
    created: { type: Date, default: Date.now, index: true },
    status: { type: Number, default: 1, index: true }, //0: closed, 1: open
    chatTag: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChatTag', index: true }],
    isOffline: { type: Number, default: 0, index: true },
    updated: { type: Date, default: Date.now },
    /*
        trungdt - chat-monitor
        id của service được tính bằng cách tách trường clientId.split('-')[2]
    */
    idServiceChat: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceChat', index: true },

    /*
        trungdt - số lượng tương tác
        số điện thoại, email khách hàng
    */
    phone: { type: String },
    email: { type: String },
    /*
        trungdt - chat-monitor
        cập nhật thời gian chat mới nhất của agent để monitor
    */
    lastAgentChatTime: { type: Date, index: true, default: Date.now },


    isSurvey: { type: Number, default: 0 }, //0:ko co survey, 1:có survey
    idCallDialog: { type: String },
    activityId: { type: Number },
    agentFirstResponseTime: {type: Date, default: null},
    agentLastResponseTime: {type: Date, default: null},
    customerLastMessageTime: {type: Date, default: null},

    agentResponseCount: {type: Number},
    agentResponseCount: {type: Number},
    agentTotalResponseTime: {Type: Number},
    agentMaxResponseTime: {Type: Number},
    agentTotalWaitTimeCustMsg: {type: Number},
    customerMessageCount: {type: Number},
    messagesChat: { type: mongoose.Schema.Types.Mixed, default: [] }, // Save tin nhắn 
    entryPointId: {type: Number},
    queueId: {type: Number}, // same idChannelCisco  on  the table company-channel,
    sourceId: {type: String}, // ID nguồn chat,
    clientCustomerId: {type: String}, // IP khách hàng
    userAgent: {type: String},
    serviceInterval: {type: Number},
    custConnectionStatus: {type: Number}, // Trạng thái kết nối khách hàng 
    chatStatus: {type: Number}, // Trạng thái chat, 1 là chat offline, 2 là chat nhỡ , 3 là chat tiếp nhận
    nameAgent: {type: String}, // tên agent,
    nameCustomer: {type: String}, // Tên hiện thị khách hàng,
    eventDateGMT: {type: Date}, // thời gian kêt thúc phiên chat
    createDate: {type: Date}, // thời gian khách hàng nhắn tin vào
    eventDate: {type: Number}, // Thời gian  theo int,
    pageId: {type: String},
    agentAnswerMessageFirstTime: {type: Date} , // Thời gian trả lời tin nhắn đầu tiên,
    whenModified: {type: Date},// Thời gian kêt thúc 1 cuôc hội thoại     
    activityStatus: {type: Number}, // 9000 là hoàn thành 
    activitySubStatus: {type: Number} // 9000 là hoàn thành 

}, { id: false, versionKey: 'v' });
ChatThreadSchema.plugin(require('mongoose-aggregate-paginate'));
ChatThreadSchema.set('toJSON', { getters: true });
module.exports = mongoose.model('ChatThread', ChatThreadSchema);