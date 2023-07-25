'use strict'
var cron = require('node-cron');
const jobSynMailByDay = () => {
    cron.schedule('* * * * *', () => {
        console.log("--------- Bắt đầu đồng bộ Mail--------")
        try {
            var _bulk = mongoClient.collection('mailinbounds').initializeUnorderedBulkOp({ useLegacyOps: true });
            let count = 0
            let arrayActivity = []
            _async.waterfall([
                // Tìm kiếm các kênh Mail
                function (next) {
                    _MailInboundChannel.find({}, function (error, resultMailInboundChannel) {
                        if (resultMailInboundChannel) {
                            next(null, resultMailInboundChannel)
                        } else {
                            next('Chưa thiết lập kênh channel mail')
                        }
                    })
                },
                // Query lấy dữ liệu từ Cisco
                function (data, next) {
                    let channel = [];
                    data.map(item => {
                        channel.push(item.idQueue);
                    })
                    // Chuyển array idQueue thành string
                    let channelString = channel.toString();
                    let dateNow = new Date()
                    let createDate = dateNow.toUTCFormat("YYYY-MM-DD")
                    let queryString = `
                        SELECT [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                            ,[CASE_ID]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL].[SUBJECT]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL].[EMAIL_SIZE]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL].[FROM_EMAIL_ADDRESS]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL].[RECV_EMAIL_ADDRESS]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].[CONTENT]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].CONTENT_TYPE
                            ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].HEADER
                            ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT].[TEXT_CONTENT]
                            ,[eGActiveDB].[dbo].[EGPL_USER].[USER_NAME]
                            ,[ACTIVITY_MODE]
                            ,[ACTIVITY_TYPE]
                            ,[ACTIVITY_SUB_TYPE]
                            ,[ACTIVITY_STATUS]
                            ,[ACTIVITY_SUB_STATUS]
                            ,[ACTIVITY_PRIORITY]
                            ,[eGActiveDB].[dbo].[EGML_EMAIL].[ALIAS_ID]
                            ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_CREATED]
                            ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHO_CREATED]
                            ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_MODIFIED]
                            ,[DUE_DATE]
                            ,[USER_LAST_WORKED]
                            ,[ASSIGNED_TO]
                            ,[DESCRIPTION]
                            ,[LANGUAGE_ID]
                            ,[CUSTOMER_ID]
                            ,[CONTACT_PERSON_ID]
                            ,[QUEUE_ID]
                            ,[CONTACT_POINT_ID]
                            ,[CONTACT_POINT_DATA]
                            ,[LAST_ACTION_REASON]
                            ,[PINNED]
                            ,[LOCKED]
                            ,[ACTIVITY_ACCESS]
                            ,[FOLDER_ID]
                            ,[LAST_DEPARTMENT_ID]
                            ,[SAVE_DRAFT_FLAG]
                            ,[LEAVE_OPEN_FLAG]
                            ,[NUM_NOTES]
                            ,[CASE_TYPE]
                            ,[CONFERENCE_FLAG]
                            ,[IS_ESCALATED]
                            ,[EGPL_CASEMGMT_ACTIVITY].[CREATE_DATE]
                            ,[EGPL_CASEMGMT_ACTIVITY].[UPDATE_VERSION]
                            ,[OUTBOUND_FAILED]
                            ,[VISITOR_SESSION_ID]
                            ,[VISITOR_USER_ID]
                            ,[CUST_ACCOUNT_ID]
                            ,[DELAY_TIME_IN_MIN]
                            ,[ISSUE_TYPE_ID]
                            ,[IS_AUTHENTICATED]
                        FROM [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY]
                        INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL]
                        ON [eGActiveDB].[dbo].[EGML_EMAIL].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                        INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL_DATA]
                        ON [eGActiveDB].[dbo].[EGML_EMAIL_DATA].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                        INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT]
                        ON [eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT].[ACTIVITY_ID] =  [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                        LEFT JOIN [eGActiveDB].[dbo].[EGPL_USER]
                        ON [eGActiveDB].[dbo].[EGPL_USER].[USER_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHO_CREATED]
                        WHERE [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[QUEUE_ID] IN (${channelString}) AND [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_CREATED] >= '${createDate}'
                        `;
                    _requestMssql.query(queryString, function (err, recordset) {
                        if (err) {
                            next(err.message)
                        } else {
                            let mailInboundCisco = (recordset && recordset.recordset)
                            if (mailInboundCisco.length > 0) {
                                next(null, mailInboundCisco)
                            } else {
                                next("Dữ liệu mail inbound đang được cập nhật.")
                            }
                        }
                        

                    });
                },
                // Cập nhật hoặc tạo mới mailInbound
                function (data, next1) {
                    if (data.length > 0) {
                        _async.eachSeries(data, function (el, callback) {
                            // CONTAC_POINT_DATA là trường chứa thông tin khách hàng: địa chỉ mail, 
                            let customerEmail = el.CONTACT_POINT_DATA
                            let idQueue = el.QUEUE_ID // Lấy kênh MAIL
                            let objectMailCreate = {}
                            let objectMailUpdate = {}
                            let idAgent = ""
                            let createCustomer = {}
                            let updateCustomer = {}
                            let customerId = ""
                            let idMailInboundChannel = ""
                            arrayActivity.push(el.ACTIVITY_ID)
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
                                    } else {
                                        next(null, null)
                                    }
                                },
                                // Check và tạo khách hàng mới nếu chưa tồn tại
                                function (data, next) {
                                    if (data) {
                                        customerId = data.entityId
                                        // Tìm trong bẩng customerindex nếu chưa tạo thì tạo mới 
                                        mongoClient.collection('customerindex').findOne({ _id: customerId }, function (error, dataCus) {
                                            if (error) {
                                                next(error)
                                            } else {
                                                if (!dataCus) {
                                                    mongoClient.collection('customerindex').insert({
                                                        _id: customerId,
                                                        field_e_mail: customerEmail
                                                    }, function (err, result) {
                                                        next(err, customerId);
                                                    });
                                                } else {
                                                    next(null, customerId);
                                                }
                                            }
                                        })
                                    } else {
                                        // Tạo mới khách hàng với email
                                        _async.waterfall([
                                            function (next2) {
                                                _Customer.create({}, next2);
                                            },
                                            function (newCus, next2) {
                                                customerId = newCus._id
                                                createCustomer._id = newCus._id
                                                if (customerEmail) {
                                                    createCustomer.field_e_mail = customerEmail
                                                }
                                                mongoClient.collection('customerindex').insert(createCustomer, function (err, result) {
                                                    next2(err, newCus);
                                                });
                                            },
                                            function (data, next2) {
                                                if (customerEmail) {
                                                    _CCKFields['field_e_mail'].db.create({ entityId: customerId, value: customerEmail }, next2);
                                                } else {
                                                    next2(null, data)
                                                }
                                            }
                                        ], next);
                                    }
                                },
                                // Tìm kiếm kênh chat
                                function (data, next) {
                                    _MailInboundChannel.findOne({ idQueue: idQueue }, function (error, mailInboundChannel) {
                                        if (error) {
                                            next(error)
                                        }
                                        if (mailInboundChannel) {
                                            next(null, mailInboundChannel)
                                        } else {
                                            next(`Kênh mail ${idQueue} chưa được thiết lập trên ternal.`)
                                        }
                                    })
                                },
                                // Tìm kiếm agent
                                function (data, next) {
                                    idMailInboundChannel = data._id
                                    _Users.findOne({ name: el.USER_NAME }, function (error, user) {
                                        if (user) {
                                            idAgent = user._id
                                            next(null, user)
                                        } else {
                                            next(null, null)
                                        }
                                    })
                                },
                                // Update hoặc tạo mailInbound
                                function (data, next) {
                                    _MailInbound.findOne({ activityId: el.ACTIVITY_ID }, function (error, dataMail) {
                                        next(error, dataMail)
                                    })
                                }
                            ], function (err, result) {
                                count++
                                // Nếu mailInbound tồn tại 
                                if (result) {
                                    objectMailCreate = {
                                        ...objectMailCreate,
                                        _id: result._id,
                                    }
                                    objectMailUpdate = {
                                        ...objectMailUpdate,
                                        activityId: el.ACTIVITY_ID
                                    }
                                    if (!result.caseId) {
                                        objectMailUpdate = { ...objectMailUpdate, caseId: el.CASE_ID }
                                    }
                                    if (!result.subject) {
                                        objectMailUpdate = { ...objectMailUpdate, subject: el.SUBJECT }
                                    }
                                    if (!result.content) {
                                        objectMailUpdate = { ...objectMailUpdate, content: el.CONTENT }
                                    }
                                    if (!result.textContent) {
                                        objectMailUpdate = { ...objectMailUpdate, textContent: el.TEXT_CONTENT }
                                    }
                                    if (!result.emailSize) {
                                        objectChatUpdate = { ...objectChatUpdate, emailSize: el.EMAIL_SIZE }
                                    }
                                    if (!result.formEmailAddress) {
                                        objectMailUpdate = { ...objectMailUpdate, formEmailAddress: el.FROM_EMAIL_ADDRESS }
                                    }
                                    if (!result.recvEmailAddress) {
                                        objectMailUpdate = { ...objectMailUpdate, recvEmailAddress: el.RECV_EMAIL_ADDRESS }
                                    }
                                    if (!result.contentType) {
                                        objectMailUpdate = { ...objectMailUpdate, contentType: el.CONTENT_TYPE }
                                    }
                                    if (!result.header) {
                                        objectMailUpdate = { ...objectMailUpdate, header: el.HEADER }
                                    }
                                    if (!result.activityMode) {
                                        objectMailUpdate = { ...objectMailUpdate, activityMode: el.ACTIVITY_MODE }
                                    }
                                    if (!result.activityType) {
                                        objectMailUpdate = { ...objectMailUpdate, activityType: el.ACTIVITY_TYPE }
                                    }
                                    if (!result.activitySubType) {
                                        objectMailUpdate = { ...objectMailUpdate, activitySubType: el.ACTIVITY_SUB_TYPE }
                                    }
                                    if (!result.activityStatus) {
                                        objectMailUpdate = { ...objectMailUpdate, activityStatus: el.ACTIVITY_STATUS }
                                    }
                                    if (!result.activitySubStatus) {
                                        objectMailUpdate = { ...objectMailUpdate, activitySubStatus: el.ACTIVITY_SUB_STATUS }
                                    }
                                    if (!result.whenCreated) {
                                        objectMailUpdate = { ...objectMailUpdate, whenCreated: el.WHEN_CREATED }
                                    }
                                    if (!result.whenModified) {
                                        objectMailUpdate = { ...objectMailUpdate, whenModified: el.WHEN_MODIFIED }
                                    }
                                    if (!result.idCustomer) {
                                        objectMailUpdate = { ...objectMailUpdate, idCustomer: customerId }
                                    }
                                    if (!result.idAgent) {
                                        objectMailUpdate = { ...objectMailUpdate, idAgent: idAgent }
                                    }
                                    if (!result.aliasId) {
                                        objectMailUpdate = { ...objectMailUpdate, aliasId: el.ALIAS_ID }
                                    }
                                } else {
                                    objectMailCreate = {
                                        ...objectMailCreate,
                                        idMailInboundChannel: idMailInboundChannel,
                                        idCustomer: customerId,
                                        idAgent: idAgent,
                                    }
                                    objectMailUpdate = {
                                        ...objectMailUpdate,
                                        caseId: el.CASE_ID,
                                        activityId: el.ACTIVITY_ID,
                                        subject: el.SUBJECT,
                                        content: el.CONTENT,
                                        textContent: el.TEXT_CONTENT,
                                        emailSize: el.EMAIL_SIZE,
                                        formEmailAddress: el.FROM_EMAIL_ADDRESS,
                                        recvEmailAddress: el.RECV_EMAIL_ADDRESS == el.FROM_EMAIL_ADDRESS ? el.CONTACT_POINT_DATA : el.RECV_EMAIL_ADDRESS,
                                        contentType: el.CONTENT_TYPE,
                                        header: el.HEADER,
                                        activityMode: el.ACTIVITY_MODE,
                                        activityType: el.ACTIVITY_TYPE,
                                        activitySubType: el.ACTIVITY_SUB_TYPE,
                                        activityStatus: el.ACTIVITY_STATUS,
                                        activitySubStatus: el.ACTIVITY_SUB_STATUS,
                                        whenCreated: el.WHEN_CREATED,
                                        whenModified: el.WHEN_MODIFIED,
                                        aliasId: el.ALIAS_ID
                                    }
                                }
                                // Tìm kiếm mailInbound
                                _bulk.find({ activityId: el.ACTIVITY_ID }).upsert().update({
                                    $setOnInsert: objectMailCreate,
                                    $set: objectMailUpdate
                                });
                                callback(null)
                            })
                        }, function (err) {
                            next1()
                        })
                    }
                }
            ], function (err, data) {
                if (!err) {
                    _bulk.execute(function (err) {
                        if (!err) {
                            // Sau khi tạo xong mailInbound thì tạo ticket nếu  chưa có ticket

                            _MailInbound.find({activityId: { $in: arrayActivity }}, function (errorMail, dataMailInbound) {
                                let dataMails = dataMailInbound
                                if (dataMails.length > 0) {
                                    var _bulkTicketMail = mongoClient.collection('ticketmails').initializeUnorderedBulkOp({ useLegacyOps: true });
                                    let countTicketCreated = 0
                                    _.each(dataMails, function (item) {
                                        if (!item.activityId) return;
                                        if (item.idAgent) {
                                            countTicketCreated++
                                            _bulkTicketMail.find({ caseId: item.caseId }).upsert().update({
                                                $setOnInsert: {
                                                    note: "",
                                                    caseId: item.caseId,
                                                    idCustomer: item.idCustomer,
                                                    idMailInboundChannel: item.idMailInboundChannel,
                                                    idMailInbound: item._id,
                                                    created: item.whenCreated,
                                                    typeMail: 1,
                                                    aliasId: item.aliasId
                                                },
                                                $set: {
                                                    idAgent: item.idAgent,
                                                    channelType: "Email",
                                                }
                                            });
                                        }
                                    })

                                    if (_bulkTicketMail == null || !_bulkTicketMail.s.currentBatch){
                                        console.log("Dữ liệu đang được cập nhật.")
                                        return 
                                    }
                                    _bulkTicketMail.execute(function (err) {
                                        if (!err) {
                                            console.log("- Số ticket được tạo thành công: ", countTicketCreated)
                                            console.log("- Số mail inbound được tạo thành công: ", count)

                                        } else {
                                            console.log("Lỗi tạo ticket mail", err)
                                        }
                                    });
                                } else {
                                    console.log("Dữ liệu đang được cập nhật.")
                                }
                            })
                        } else {
                            console.log('Lỗi đồng bộ mail : ', err)
                        }
                    });
                } else {
                    console.log('Lỗi đồng bộ mail : ', err)
                }
            })
        } catch (error) {
            console.log('Lỗi đồng bộ mail : ', error)
        }
    });
};
module.exports = {
    jobSynMailByDay
};