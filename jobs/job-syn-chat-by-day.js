'use strict'
var cron = require('node-cron');
const { ischeckEmail, decodeMessageChat } = require("../helpers/commons/create")
const jobSynChatByDay = () => {
    cron.schedule('* * * * *', () => {
        console.log("--------- Bắt đầu đồng bộ Chat--------")
        try {
            var _bulk = mongoClient.collection('chatthreads').initializeUnorderedBulkOp({ useLegacyOps: true });
            let count = 0
            _async.waterfall([
                // Tìm kiếm các kênh chát 
                function (next) {
                    _CompanyChannel.find({status: 1}, function (error, resultCompanyChannel) {
                        if (resultCompanyChannel && resultCompanyChannel.length > 0) {
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
                    let dateNow = new Date()
                    let createDate = dateNow.toUTCFormat("YYYY-MM-DD")
                    let queryString = `
                    SELECT
                         [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID]
                        ,[ENTRY_POINT_ID]
                        ,[CUST_CONNECTION_STATUS]
                        ,[CHAT_STATUS]
                        ,[eGActiveDB].[dbo].[EGPL_USER].[USER_NAME]
                        ,[eGActiveDB].[dbo].[EGLV_SESSION_CONTENT].[CONTENT]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CUSTOMER_ID]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_PERSON_ID]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_POINT_DATA]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_POINT_ID]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_STATUS]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_SUB_STATUS]
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
                    LEFT JOIN[eGActiveDB].[dbo].EGLV_SESSION_CONTENT
                    ON [eGActiveDB].[dbo].EGLV_SESSION_CONTENT.[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID]
                    LEFT JOIN [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY]
                    ON [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID] =  [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                    LEFT JOIN [eGActiveDB].[dbo].[EGPL_USER]
				    ON [eGActiveDB].[dbo].[EGPL_USER].[USER_ID] =  [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ASSIGNED_TO]
                    WHERE [eGActiveDB].[dbo].[EGLV_SESSION].[ENTRY_POINT_ID] IN (${channelString}) AND [eGActiveDB].[dbo].[EGLV_SESSION].[CREATE_DATE] >= '${createDate}'
                    `;
                    _requestMssql.query(queryString, function (err, recordset) {
                        if (err) {
                            return next("SQL Error " + err.message)
                        }
                        
                        if (recordset && recordset.recordset && recordset.recordset.length > 0) {
                            next(null, recordset.recordset)
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
                            let checkCustomerExitSystem = false
                            let objectChatCreate = {}
                            let objectChatUpdate = {}
                            let agentId = ""
                            let createCustomer = {}
                            let updateCustomer = {}
                            if (ischeckEmail(contactPointData)) {
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
                                        checkCustomerExitSystem = true
                                        next(null, customerId)
                                    } else {
                                        // Tạo mới khách hàng với kênh chat live và email
                                        if (customerEmail){
                                            _async.waterfall([
                                                function (next2) {
                                                    _Customer.create({}, next2);
                                                },
                                                function (newCus, next2) {
                                                    customerId = newCus._id
                                                    createCustomer._id = newCus._id
                                                    if (customerDisplayName) {
                                                        createCustomer.field_ho_ten = customerDisplayName
                                                    }
                                                    if (customerEmail) {
                                                        createCustomer.field_e_mail = customerEmail
                                                    }
                                                    mongoClient.collection('customerindex').insert(createCustomer, function (err, result) {
                                                        next2(err, newCus);
                                                    });
                                                },
                                                function (data, next2) {
                                                    if (customerDisplayName) {
                                                        _CCKFields['field_ho_ten'].db.create({ entityId: customerId, value: customerDisplayName }, next2);
                                                    } else {
                                                        next2(null, data)
                                                    }
                                                },
                                                function (data, next2) {
                                                    if (customerEmail) {
                                                        _CCKFields['field_e_mail'].db.create({ entityId: customerId, value: customerEmail }, next2);
                                                    } else {
                                                        next2(null, data)
                                                    }
                                                }
                                            ], next);
                                        }else {
                                            next(null, data)
                                        }
                                        
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
                                    companyChannelId = data._id
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

                                },
                                // Tìm kiếm agent
                                function (data, next) {
                                    serviceChatId = data._id
                                    _Users.findOne({ name: el.USER_NAME }, function (error, user) {
                                        if (user) {
                                            agentId = user._id
                                            next(null, user)
                                        } else {
                                            next(null, null)
                                        }
                                    })
                                },
                                // Update hoặc tạo chatThread
                                function (data, next) {
                                    _ChatThread.findOne({ activityId: el.ACTIVITY_ID }, function (error, dataChat) {
                                        next(error, dataChat)
                                    })
                                }
                            ], function (err, result) {
                                count++
                                messageChatDecode = decodeMessageChat(contentChat)
                                // Lấy thời gian agent trả lời tin nhắn đâu tiên nếu đó là cuộc hội thoại tiếp nhận
                                if (el.CHAT_STATUS == 4) {
                                    const messageAgentFirst = messageChatDecode.find(element => {
                                        return element.type == "agent"
                                    });
                                    timeAgentAnswerMessageFirst = messageAgentFirst.createAt

                                }
                                // Nếu ChatThead tồn tại 
                                if (result) {
                                    objectChatCreate = {
                                        ...objectChatCreate,
                                        _id: result._id,
                                    }
                                    objectChatUpdate = {
                                        ...objectChatUpdate,
                                        channelId: companyChannelId,
                                        activityId: el.ACTIVITY_ID
                                    }
                                    // if (!result.agentFirstResponseTime) {
                                    //     objectChatUpdate = { ...objectChatUpdate, agentFirstResponseTime: el.AGENT_FIRST_RESPONSE_TIME }
                                    // }
                                    objectChatUpdate = { ...objectChatUpdate, agentFirstResponseTime: el.AGENT_FIRST_RESPONSE_TIME }
                                    objectChatUpdate = { ...objectChatUpdate, agentLastResponseTime: el.AGENT_LAST_RESPONSE_TIME }
                                    objectChatUpdate = { ...objectChatUpdate, customerLastMessageTime: el.CUSTOMER_LAST_MESSAGE_TIME }
                                    objectChatUpdate = { ...objectChatUpdate, agentResponseCount: el.AGENT_RESPONSE_COUNT }
                                    objectChatUpdate = { ...objectChatUpdate, agentTotalResponseTime: el.AGENT_TOTAL_RESPONSE_TIME }
                                    objectChatUpdate = { ...objectChatUpdate, agentMaxResponseTime: el.AGENT_MAX_RESPONSE_TIME }
                                    objectChatUpdate = { ...objectChatUpdate, agentTotalWaitTimeCustMsg: el.AGENT_TOTAL_WAIT_TIME_CUST_MSG }
                                    objectChatUpdate = { ...objectChatUpdate, customerMessageCount: el.CUSTOMER_MESSAGE_COUNT }
                                    objectChatUpdate = { ...objectChatUpdate, entryPointId: el.ENTRY_POINT_ID }
                                    objectChatUpdate = { ...objectChatUpdate, clientCustomerId: el.CLIENT_IP }
                                    objectChatUpdate = { ...objectChatUpdate, serviceInterval: el.SERVICE_INTERVAL }
                                    objectChatUpdate = { ...objectChatUpdate, custConnectionStatus: el.CUST_CONNECTION_STATUS }
                                    objectChatUpdate = { ...objectChatUpdate, nameCustomer: el.CUST_DISPLAY_NAME }
                                    objectChatUpdate = { ...objectChatUpdate, eventDateGMT: el.EVENT_DATE_GMT }
                                    objectChatUpdate = { ...objectChatUpdate, eventDate: el.EVENT_DATE }
                                    objectChatUpdate = { ...objectChatUpdate, userAgent: el.USER_AGENT }
                                    objectChatUpdate = { ...objectChatUpdate, createDate: el.CREATE_DATE }
                                    objectChatUpdate = { ...objectChatUpdate, activityStatus: el.ACTIVITY_STATUS }
                                    objectChatUpdate = { ...objectChatUpdate, activitySubStatus: el.ACTIVITY_SUB_STATUS }
                                    objectChatUpdate = { ...objectChatUpdate, chatStatus: el.CHAT_STATUS }
                                    objectChatUpdate = { ...objectChatUpdate, whenModified: el.WHEN_MODIFIED }
                                    if (result.messagesChat.length == 0) {
                                        objectChatUpdate = { ...objectChatUpdate, messagesChat: messageChatDecode }
                                    }
                                    objectChatUpdate = { ...objectChatUpdate, pageId: pageId }
                                    // objectChatUpdate = { ...objectChatUpdate,  messagesChat: messageChatDecode }
                                    if (!result.agentAnswerMessageFirstTime) {
                                        objectChatUpdate = { ...objectChatUpdate, agentAnswerMessageFirstTime: timeAgentAnswerMessageFirst }
                                    }
                                    // objectChatUpdate = { ...objectChatUpdate,   agentAnswerMessageFirstTime: timeAgentAnswerMessageFirst }
                                    objectChatUpdate = { ...objectChatUpdate, pageId: pageId }
                                    // if (!result.pageId) {
                                    //     objectChatUpdate = { ...objectChatUpdate, pageId: pageId }
                                    // }
                                    objectChatUpdate = { ...objectChatUpdate, customerId: customerId }
                                    objectChatUpdate = { ...objectChatUpdate, agentId: [agentId] }
                                    // if (!result.customerId) {
                                    //     objectChatUpdate = { ...objectChatUpdate, customerId: customerId }
                                    // }
                                    // if (result.agentId.lenth == 0) {
                                    //     objectChatUpdate = { ...objectChatUpdate, agentId: [agentId] }
                                    // }
                                } else {
                                    objectChatCreate = {
                                        ...objectChatUpdate,
                                        channelId: companyChannelId,
                                        companyId: companyId,
                                        idServiceChat: serviceChatId,
                                        customerId: customerId,
                                        agentId: [agentId],
                                    }
                                    objectChatUpdate = {
                                        ...objectChatUpdate,
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
                                        activityStatus: el.ACTIVITY_STATUS,
                                        activitySubStatus: el.ACTIVITY_SUB_STATUS,
                                        messagesChat: messageChatDecode,
                                        agentAnswerMessageFirstTime: timeAgentAnswerMessageFirst,
                                        pageId: pageId,
                                    }
                                }
                                // Tìm kiếm chatThread 
                                _bulk.find({ activityId: el.ACTIVITY_ID }).upsert().update({
                                    $setOnInsert: objectChatCreate,
                                    $set: objectChatUpdate
                                });
                                callback(null)
                            })
                        }, function (err) {
                            console.log("count ", count)
                            next1()
                        })
                    }
                }
            ], function (err, data) {
                if (err) {
                    console.log('Error', err)
                } else {
                    _bulk.execute(function (err) {
                        if (err) {
                            console.log('Error', err)
                        } else {
                            console.log('Đồng bộ data thành công')
                        }
                    });
                }
            })
        } catch (error) {
            console.log('Error', error)
        }
    });
};
module.exports = {
    jobSynChatByDay
};