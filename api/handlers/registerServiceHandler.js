const accessTokenSecret =
    process.env.ACCESS_TOKEN_SECRET || "access-token-secret-telehub";

const jwtHelper = require("../helpers/jwtHelper");
const jobHelper = require("../helpers/jobHelper")
const stringChatMiss = "O{bTyp | S{WCS-STD}bUsr | S{system}bUid | I{-1}sCmd | S{}sId | A{}sNme | S{}sUrl | S{}sLbl | S{}sCok | S{}mMsg | S{Chat has been initiated by customer.}fAct | S{}fTyp | S{}fKey | S{}fVal | S{}bUserType | S{SYSTEM}transType | S{}mTsp | S{2020-12-26 01:58:57}mDeptId | S{999}bPvtMsg | S{1}bToPvt | S{null}mOffRecord | S{null}mMid | S{}entityName | S{null}}|O{bTyp | S{WCS-STD}bUsr | S{system}bUid | S{1088}sCmd | S{agentPickup}sId | A{}sNme | S{}sUrl | S{}sLbl | S{}sCok | S{}mMsg | S{You are now chatting with ggg agent11}fAct | S{}fTyp | S{}fKey | S{}fVal | S{}bUserType | S{SYSTEM}transType | S{}mTsp | S{2020-12-26 01:59:00}bPvtMsg | S{0}bToPvt | S{}mMid | I{1}mDeptId | S{999}agentName | S{ggg agent11}vchatCapable | I{1}vchatCapable | I{1}|O{bTyp | S{WCS-STD}bUsr | S{ggg agent11}bUid | S{1088}sCmd | S{}sId | A{}sNme | S{}sUrl | S{}sLbl | S{}sCok | S{}mMsg | S{dsg}fAct | S{}fTyp | S{}fKey | S{}fVal | S{}bUserType | S{AGENT}transType | S{}mTsp | S{2020-12-26 01:59:02}bPvtMsg | I{0}bToPvt | S{all}mMid | I{3}mDeptId | S{999}mDeptId | S{999}|O{bTyp | S{EGLV-EXIT}bUsr | S{ggg agent11}bUid | S{1088}bUserType | S{SYSTEM}bXTyp | I{1}mMsg | S{ggg agent11 has ended the chat}mDeptId | S{999}mTsp | S{2020-12-26 01:59:03}mMid | I{4}mMid | I{4}"
class RegisterServiceHandler {
    constructor() { }

    async registerService(req, res) {
        try {
            let test = [1, 2, 4]
            let count = 0;
            let a = 0
            _async.waterfall([
                function (next) {
                    next(null, 1)
                },
                function (data, next) {
                    _async.eachSeries(test, function (el, callback) {
                        _async.waterfall([
                            function (next) {
                                next(null, 3)
                            },
                            function (data, next) {

                                next()
                            }

                        ], function (err, data) {
                            console.log("chay 1 lan 000 ")
                            count++
                            callback()
                        })
                    })
                    console.log("chay 1 lan")
                    a = count
                    next(data, next)
                }

            ], function (err, data) {
                // console.log('ergerg', data)
                res.status(200).json({
                    success: true,
                    error: a,
                });
            })
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                error: error,
            });
        }
    }
    async convertString(req, res) {
        try {
            var _bulk = mongoClient.collection('chatthreads').initializeUnorderedBulkOp({ useLegacyOps: true });
            let count = 0
            _async.waterfall([
                // Tìm kiếm các kênh chát 
                function (next) {
                    _CompanyChannel.find({}, function (error, resultCompanyChannel) {
                        if (resultCompanyChannel) {
                            next(null, resultCompanyChannel)
                        } else {
                            next('Chưa thiết lập kênh chat')
                        }
                    })
                },
                // Query lấy dữ liệu từ Cisco
                function (data, next) {
                    let channel = [];
                    data.map(item => {
                        channel.push(item.entryPointId);
                    })
                    // Chuyển array entryPointId thành string
                    let channelString = channel.toString();
                    let queryString = `
                    SELECT
                         [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID]
                        ,[ENTRY_POINT_ID]
                        ,[CUST_CONNECTION_STATUS]
                        ,[CHAT_STATUS]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CONTENT].[CONTENT]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CUSTOMER_ID]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_PERSON_ID]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_POINT_DATA]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_POINT_ID]
                        ,[SERVICE_INTERVAL]
                        ,[USER_AGENT]
                        ,[REFERRER_URL]
                        ,[REFERRER_NAME]
                        ,[CUST_DISPLAY_NAME]
                        ,[CLIENT_IP]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION].[CREATE_DATE]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION].[WHEN_MODIFIED]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[AGENT_FIRST_RESPONSE_TIME]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[AGENT_LAST_RESPONSE_TIME]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[CUSTOMER_LAST_MESSAGE_TIME]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[AGENT_RESPONSE_COUNT]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[AGENT_TOTAL_RESPONSE_TIME]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[AGENT_MAX_RESPONSE_TIME]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[AGENT_TOTAL_WAIT_TIME_CUST_MSG]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[CUSTOMER_MESSAGE_COUNT]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[ORIGIN_TYPE]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[EVENT_OPERATION_DATA]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[REASON_DATA]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[RESPONSE_EVENT_DATA]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[EVENT_DATE_GMT]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[EVENT_DATE]
                    FROM [eGActiveDB].[dbo].[EGLV_SESSION]
                    LEFT JOIN [eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT]
                    ON [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[ACTIVITY_ID]
                    INNER JOIN[eGActiveDB].[dbo].EGLV_SESSION_CONTENT
                    ON [eGActiveDB].[dbo].EGLV_SESSION_CONTENT.[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID]
                    INNER JOIN [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY]
                    ON [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID] =  [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                    WHERE [eGActiveDB].[dbo].[EGLV_SESSION].[ENTRY_POINT_ID] IN (${channelString})
                    `;
                    _requestMssql.query(queryString, function (err, recordset) {
                        if (err) {
                            next(err.message)
                        }
                        let chatThreadCisco = (recordset && recordset.recordset)
                        if (chatThreadCisco.length > 0) {
                            next(null, chatThreadCisco)
                        } else {
                            next("Dữ liệu cisco đang được cập nhật.")
                        }

                    });
                },
                // Cập nhật hoặc tạo mới chatThreads
                function (data, next1) {
                    if (data.length > 0) {
                        _async.eachSeries(data, function (el, callback) {
                            // CONTAC_POINT_DATA là trường chứa thông tin khách hàng: địa chỉ mail, 
                            // hoặc là định danh khách hàng qua kệnh facebook hoặc zalo
                            // VD : zalo|8477075411962769770|4316568977468089172, facebook_messenger|3525704057526115|103827978110609
                            let contactPointData = el.CONTACT_POINT_DATA
                            let customerDisplayName = el.CUST_DISPLAY_NAME
                            let entryPointId = el.ENTRY_POINT_ID // Lấy kênh chat 
                            let customerEmail = ""
                            let customerSocialFacebookId = ""
                            let customerSocialZaloId = ""
                            let pageId = ""
                            let customerId = "";
                            let companyId = ""
                            let companyChannelId = ""
                            let contentChat = el.CONTENT
                            let timeAgentAnswerMessageFirst = "";
                            let messageChatDecode = ""
                            let serviceChatId = ""
                            if (jobHelper.ischeckEmail(contactPointData)) {
                                customerEmail = contactPointData
                            } else {
                                let stringArray = contactPointData.split("|");
                                // Check dữ liệu sau khi thêm idpage vào sau 
                                if (stringArray.length == 3) {
                                    pageId = stringArray[2]
                                    if (stringArray[0] == "zalo") {
                                        customerSocialZaloId = stringArray[1]
                                    } else {
                                        customerSocialFacebookId = stringArray[1]
                                    }
                                } else {
                                    // Chuyển về page test mặc định cho đồng bộ dữ liệu test
                                    if (stringArray[0] == "zalo") {
                                        pageId = "4316568977468089172"
                                        customerSocialZaloId = stringArray[1]
                                    } else {
                                        pageId = "103827978110609"
                                        customerSocialFacebookId = stringArray[1]
                                    }
                                }
                            }
                            _async.waterfall([
                                // Tìm kiếm khách hàng : Nếu khách hàng chưa tồn tại thì tạo mới
                                function (next) {
                                    // Tìm kiếm khách hàng với email này
                                    if (customerEmail) {
                                        mongoose.model('field_e_mail').findOne({ 'value': customerEmail }, function (error, dataCustomerEmail) {
                                            let a = 44444
                                            if (error) {
                                                next(error)
                                            }
                                            if (dataCustomerEmail) {
                                                next(null, dataCustomerEmail)
                                            } else {
                                                next(null, null)
                                            }
                                        })
                                    } else if (customerSocialFacebookId) {
                                        // Tìm kiếm khách hàng với facebook
                                        mongoose.model('field_facebook').findOne({ 'value': customerSocialFacebookId }, function (error, dataCustomerFacebook) {
                                            if (error) {
                                                next(error)
                                            }
                                            if (dataCustomerFacebook) {
                                                next(null, dataCustomerFacebook)
                                            } else {
                                                next(null, null)
                                            }
                                        })
                                    } else {
                                        // Tìm kiếm khách hàng với zalo
                                        mongoose.model('field_zalo').findOne({ 'value': customerSocialZaloId }, function (error, dataCustomerZalo) {
                                            if (error) {
                                                next(error)
                                            }
                                            if (dataCustomerZalo) {
                                                next(null, dataCustomerZalo)
                                            } else {
                                                next(null, null)
                                            }

                                        })
                                    }
                                },
                                // Check và tạo khách hàng mới nếu chưa tồn tại
                                function (data, next) {
                                    if (data) {
                                        customerId = data.entityId
                                        next(null, customerId)
                                    } else {
                                        // Tạo mới khách hàng với kênh chat live và email
                                        _async.waterfall([
                                            function (next2) {
                                                _Customer.create({}, next2);
                                            },
                                            function (newCus, next2) {
                                                customerId = newCus._id
                                                mongoClient.collection('customerindex').insert({
                                                    _id: newCus._id,
                                                    field_ho_ten: customerDisplayName,
                                                    field_facebook: customerSocialFacebookId,
                                                    field_zalo: customerSocialZaloId,
                                                    field_e_mail: customerEmail
                                                }, function (err, result) {
                                                    next2(err, newCus);
                                                });
                                            },
                                            function (data, next2) {
                                                _CCKFields['field_facebook'].db.create({ entityId: customerId, value: customerSocialFacebookId }, next2);
                                            },
                                            function (data, next2) {
                                                _CCKFields['field_ho_ten'].db.create({ entityId: customerId, value: customerDisplayName }, next2);
                                            },
                                            function (data, next2) {
                                                _CCKFields['field_zalo'].db.create({ entityId: customerId, value: customerSocialZaloId }, next2);
                                            },
                                            function (data, next2) {
                                                _CCKFields['field_e_mail'].db.create({ entityId: customerId, value: customerEmail }, next2);
                                            }
                                        ], next);
                                    }
                                },
                                // Tìm kiếm kênh chat
                                function (data, next) {
                                    _CompanyChannel.findOne({ entryPointId: entryPointId }, function (error, companyChannel) {
                                        if (error) {
                                            next(error)
                                        }
                                        if (companyChannel) {
                                            companyId = companyChannel.idCompany
                                            next(null, companyChannel)
                                        } else {
                                            next(`Entry point ${entryPointId} chưa được thiết lập trên ternal.`)
                                        }
                                    })
                                },
                                // Tìm kiếm service chat 
                                function (data, next) {
                                    // tim kiem chat service
                                    companyChannelId = data._id.toString()
                                    _ServicesChat.findOne({ idChannel: companyChannelId }, function (error, serviceChat) {
                                        if (error) {
                                            next(error)
                                        }
                                        if (serviceChat) {
                                            next(null, serviceChat)
                                        } else {
                                            next("Chưa thiết lập service chat.")
                                        }
                                    })

                                }
                            ], function (err, result) {
                                count++
                                console.log("count ", count)
                                console.log("error111 ", err)
                                serviceChatId = result._id
                                messageChatDecode = jobHelper.decodeMessageChat(contentChat)
                                // Lấy thời gian agent trả lời tin nhắn đâu tiên nếu đó là cuộc hội thoại tiếp nhận
                                if (el.CHAT_STATUS == 4) {
                                    const messageAgentFirst = messageChatDecode.find(element => {
                                        return element.type == "agent"
                                    });
                                    timeAgentAnswerMessageFirst = messageAgentFirst.createAt
                                }
                                _bulk.find({ activityId: el.ACTIVITY_ID }).upsert().update({
                                    $setOnInsert: {
                                        customerId: customerId,
                                        channelId: companyChannelId,
                                        companyId: companyId,
                                        idServiceChat: serviceChatId
                                    },
                                    $set: {
                                        agentFirstResponseTime: el.AGENT_FIRST_RESPONSE_TIME,
                                        agentLastResponseTime: el.AGENT_LAST_RESPONSE_TIME,
                                        customerLastMessageTime: el.CUSTOMER_LAST_MESSAGE_TIME,
                                        agentResponseCount: el.AGENT_RESPONSE_COUNT,
                                        agentTotalResponseTime: el.AGENT_TOTAL_RESPONSE_TIME,
                                        agentMaxResponseTime: el.AGENT_MAX_RESPONSE_TIME,
                                        agentTotalWaitTimeCustMsg: el.AGENT_TOTAL_WAIT_TIME_CUST_MSG,
                                        customerMessageCount: el.CUSTOMER_MESSAGE_COUNT,
                                        entryPointId: el.ENTRY_POINT_ID,
                                        clientCustomerId: el.CLIENT_IP,
                                        serviceInterval: el.SERVICE_INTERVAL,
                                        custConnectionStatus: el.CUST_CONNECTION_STATUS,
                                        nameCustomer: el.CUST_DISPLAY_NAME,
                                        chatStatus: el.CHAT_STATUS,
                                        eventDateGMT: el.EVENT_DATE_GMT,
                                        eventDate: el.EVENT_DATE,
                                        userAgent: el.USER_AGENT,
                                        createDate: el.CREATE_DATE,
                                        whenModified: el.WHEN_MODIFIED,
                                        messagesChat: messageChatDecode,
                                        agentAnswerMessageFirstTime: timeAgentAnswerMessageFirst,
                                        pageId: pageId
                                    }
                                });
                                callback(null)
                            })
                        }, function (err) {
                            console.log("err ", err)
                            console.log("count ", count)
                            next1()
                        })
                    }
                }
            ], function (err, data) {
                console.log('chay cuoi')
                if (err) {
                    res.status(500).json({
                        success: false,
                        error: error.toString(),
                    });
                } else {
                    _bulk.execute(function (err) {
                        if (err) {
                            res.status(500).json({
                                success: false,
                                error: error.toString(),
                            });
                        } else {
                            res.status(200).json({
                                success: true,
                                message: data,
                            });
                        }
                    });
                }
            })
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.toString(),
            });
        }

    }
}

module.exports = RegisterServiceHandler;
