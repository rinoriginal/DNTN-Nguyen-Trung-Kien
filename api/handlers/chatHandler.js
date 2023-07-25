
const chatHelper = require("../helpers/chatHelper");
class ChatHandler {
  constructor() { }

  ischeckEmail(params) {
    var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (params.match(mailformat)) {
      return true;
    }
    return false;
  }

  async getTicketChat(req, res) {
    try {
      // Kiểm tra activityId đã được truyền lên chưa
      if (!req.body.activityId) {
        const error = new Error('Vui lòng nhập activityId');
        throw error;
      }

      // Tìm kiếm thông tin activityId trên Cisco
      const activityResult = await chatHelper.getFlowChatByActivityId(req.body.activityId);
      if (!activityResult || !activityResult.ACTIVITY_ID) {
        const error = new Error('Không tìm thấy activityId trên Cisco');
        throw error;
      }

      /**
       * CONTAC_POINT_DATA là trường chứa địa chỉ mail hoặc là định danh khách hàng qua kênh facebook hoặc zalo
       * VD: abcd@gmail.com
       *     zalo|8477075411962769770|4316568977468089172 
       *     facebook_messenger|3525704057526115|103827978110609 
       */
      let contactPointData = activityResult.CONTACT_POINT_DATA;
      let customerDisplayName = activityResult.CUST_DISPLAY_NAME;
      let entryPointId = activityResult.ENTRY_POINT_ID;
      let phoneNumber = activityResult.PHONE_NUMBER;
      let agentId = req.session.user._id;

      let customerEmail = "";
      let customerSocialFacebookId = "";
      let customerSocialZaloId = "";
      let pageId = "";
      let companyId = "";
      let companyChannelId = "";
      let serviceChatId = "";


      let threadId = '';
      let idService = '';
      let idCustomer = '';
      let ticketId = '';
      let email = '';
      let idCallDialog = '';
      let isCustomerSocial = true // Nếu là true thì khách hàng đó là kênh social , false là kênh chat live 

      let userInfo;
      // Chỉ khách hàng là kênh chát live có email và số điện thoại mới tạo  thông tin khách hàng
      // Còn khách hàng là facebook và zalo thì chưa tạo , chỉ show id facebook hoặc id zalo ngoài giao diện 
      // Để thực hiện 1 mục đích là một khách hàng định danh 3 kênh thục hiện map với khách hàng đã tồn tại hoặc là tìm kiếm khách hàng với id đó 
      if (this.ischeckEmail(contactPointData)) {
        isCustomerSocial = false
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

      if (customerEmail) {
        // Tìm kiếm khách hàng với email
        userInfo = await mongoose.model('field_e_mail').findOne({ 'value': customerEmail });
      } else if (customerSocialFacebookId) {
        // Tìm kiếm khách hàng với facebook
        userInfo = await mongoose.model('field_facebook').findOne({ 'value': customerSocialFacebookId });
      } else {
        // Tìm kiếm khách hàng với zalo
        userInfo = await mongoose.model('field_zalo').findOne({ 'value': customerSocialZaloId });
      }

      // Kiểm tra user, nếu không tồn tại thì tạo mới
      if (userInfo) {
        idCustomer = userInfo.entityId;
      } else {
        if (!isCustomerSocial) {
          const newCustomer = await _Customer.create({});
          idCustomer = newCustomer._id

          let createCustomer = {};
          createCustomer._id = newCustomer._id
          if (customerDisplayName) {
            createCustomer.field_ho_ten = customerDisplayName
          }
          if (customerEmail) {
            createCustomer.field_e_mail = customerEmail
          }

          if(phoneNumber) {
            createCustomer.field_so_dien_thoai = phoneNumber
          }

          const customerIndexResult = await mongoClient.collection('customerindex').insert(createCustomer);
          if (customerIndexResult.result.ok == 1) {
            idCustomer = customerIndexResult.ops[0]._id;
          }

          if (customerDisplayName) {
            await _CCKFields['field_ho_ten'].db.create({ entityId: idCustomer, value: customerDisplayName });
          }

          if (customerEmail) {
            await _CCKFields['field_e_mail'].db.create({ entityId: idCustomer, value: customerEmail });
          }

          if(phoneNumber) {
            await _CCKFields['field_so_dien_thoai'].db.create({ entityId: idCustomer, value: phoneNumber });
          }
        }
      }

      // Tìm kiếm kênh chat
      const companyChannelResult = await _CompanyChannel.findOne({ entryPointId: entryPointId });
      if (companyChannelResult) {
        companyId = companyChannelResult.idCompany
      } else {
        const error = new Error(`Entry point ${entryPointId} chưa được thiết lập trên ternal`)
        throw error;
      }

      // Tìm kiếm service chat
      companyChannelId = companyChannelResult._id
      const serviceChatResult = await _ServicesChat.findOne({ idChannel: companyChannelId });
      if (serviceChatResult) {
        serviceChatId = serviceChatResult._id
      } else {
        const error = new Error('Chưa thiết lập service chat');
        throw error;
      }

      // Update hoặc tạo chatThread
      let chatThread = {
        clientId: serviceChatResult._id.toString() + '-' + serviceChatResult.idChannel + '-' + serviceChatResult._id.toString(),
        channelId: companyChannelId,
        companyId: companyId,
        idServiceChat: serviceChatId,
        agentId: [agentId],
        email: customerEmail,
        activityId: activityResult.ACTIVITY_ID,
        pageId: pageId
      };

      if (idCustomer != null && idCustomer != '') {
        chatThread.customerId = idCustomer;
      }

      const chatThreadResult = await _ChatThread.findOne({ activityId: activityResult.ACTIVITY_ID });
      if (chatThreadResult) {
        threadId = chatThreadResult._id;
        idService = chatThreadResult.idServiceChat;
        email = chatThreadResult.email;
        idCallDialog = chatThreadResult.idCallDialog;
      } else {
        const chatThreadCreate = await _ChatThread.create(chatThread);
        if (chatThreadCreate) {
          threadId = chatThreadCreate._id;
          idService = chatThreadCreate.idServiceChat;
          email = chatThreadCreate.email;
          idCallDialog = chatThreadCreate.idCallDialog;
        } else {
          const error = new Error('Không thể tạo chatThreard!');
          throw error;
        }
      }

      return res.json({
        code: 200,
        data: {
          threadId,
          idService,
          idCustomer,
          ticketId,
          email,
          idCallDialog,
          activityId: req.body.activityId,
          contactPointData: contactPointData
        }
      });
    } catch (error) {
      console.log(`------- error ------- getTicketChat`);
      console.log(error);
      console.log(`------- error ------- getTicketChat`);
      return res.json({ code: 500, error: error.message });
    }
  }

  async createMessageOfflineChat(req, res) {
    try {
      let { pageId, senderId, entryPointId, nameCustomer, typeSocial, messages } = req.body
      let facebookId = "";
      let zaloId = "";
      let idCompany = "";
      let customerId = "";
      let idChannel = "";
      if (typeSocial == "facebook") {
        facebookId = senderId
      } else {
        zaloId = senderId
      }
      _async.waterfall([
        // Check và tạo khách hàng mới nếu chưa tồn tại trên hệ thống
        function (next) {
          mongoose.model('field_facebook').findOne({ 'value': senderId }, function (error, dataCustomerFacebookIndex) {
            if (dataCustomerFacebookIndex) {
              next(null, dataCustomerFacebookIndex);
            } else {
              // Tìm kiếm khách hàng nếu đó là kênh chat zalo
              mongoose.model('field_zalo').findOne({ 'value': senderId }, function (error, dataCustomerZaloIndex) {
                if (dataCustomerZaloIndex) {
                  return next(null, dataCustomerZaloIndex)
                } else {
                  return next(null, null)
                }

              })
            }
          })
        },
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
                  field_ho_ten: nameCustomer,
                  field_facebook: facebookId,
                  field_zalo: zaloId,
                }, function (err, result) {
                  next2(err, newCus);
                });
              },
              function (data, next2) {
                if (facebookId) {
                  _CCKFields['field_facebook'].db.create({ entityId: customerId, value: facebookId }, next2);
                } else {
                  _CCKFields['field_zalo'].db.create({ entityId: customerId, value: zaloId }, next2);
                }
              },
              function (data, next2) {
                _CCKFields['field_ho_ten'].db.create({ entityId: customerId, value: nameCustomer }, next2);
              }
            ], next);
          }

        },
        function (data, callback) {
          // Tim kiem service  idChannelCisco
          _CompanyChannel.findOne({ entryPointId: entryPointId }, function (error, companyChannel) {
            if (companyChannel) {
              idCompany = companyChannel.idCompany
              callback(null, companyChannel)
            } else {
              callback(`Entry point ${entryPointId} chưa được thiết lập trên ternal.`)
            }
          })

        },
        function (data, callback) {
          // tim kiem chat service
          idChannel = data._id.toString()
          _ServicesChat.findOne({ idChannel: idChannel }, function (error, serviceChat) {
            if (serviceChat) {
              callback(null, serviceChat)
            } else {
              callback("Chưa thiết lập service chat.")
            }
          })

        },
        function (data, callback) {
          // create chat thread
          let clientId = data._id.toString() + '-' + data.idChannel + '-' + data._id.toString()
          let chatThread = {
            customerId: customerId,
            clientId: clientId,
            channelId: idChannel,
            companyId: idCompany,
            idServiceChat: data._id,
            pageId: pageId,
            messagesChat: messages,
            chatStatus: 1,
            agentId: [agentId]
          };
          _ChatThread.create(chatThread, function (error, newThread) {
            callback(error, newThread);
          });
        }

      ], function (err, result) {
        if (err) {
          res.status(500).json({
            success: false,
            error: err,
          });
        } else {
          res.status(200).json({
            success: true,
            message: "Lưu thông tin thành công .",
          });
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        error: error,
      });
    }
  }

  async getHistoryChat(req, res) {
    try {
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
                        WHERE [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[QUEUE_ID] IN (${channelString})
                        `;
            _requestMssql.query(queryString, function (err, recordset) {
              if (err) {
                next(err.message)
              }
              let mailInboundCisco = (recordset && recordset.recordset)
              if (mailInboundCisco.length > 0) {
                next(null, mailInboundCisco)
              } else {
                next("Dữ liệu mail inbound đang được cập nhật.")
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
                // let query = [
                //     {
                //         $match: { activityId: {$in: arrayActivity } }
                //     },
                //     {
                //         $group: {
                //             _id: "$idAgent",
                //             idCustomer: { $first: "$idCustomer" },
                //             idAgent: { $first: "$idAgent" },
                //             idMailInboundChannel: { $first: "$idMailInboundChannel" },
                //             idMailInbound: { $first: "$_id" },
                //             whenCreated: { $first: "$whenCreated" },
                //             aliasId: { $first: "$campains" },
                //             caseId: {$first: "$caseId"}

                //         }
                //     }
                // ]
                _MailInbound.find({ activityId: { $in: arrayActivity } }, function (errorMail, dataMailInbound) {
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
                            idAgent: item.idAgent,
                            caseId: item.caseId,
                            idCustomer: item.idCustomer,
                            idMailInboundChannel: item.idMailInboundChannel,
                            idMailInbound: item._id,
                            created: item.whenCreated,
                            typeMail: 1
                          },
                          $set: {
                            channelType: "Email",
                            aliasId: item.aliasId
                          }
                        });
                      }
                    })

                    // if (_bulkTicketMail == null || !_bulkTicketMail.s.currentBatch){

                    // }
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

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.toString(),
      });
    }
  }
  // Đồng bộ lại bảng ghi âm
  async asyncRecording(req, res) {
    try {
      // Cập nhật idAgent cho bảng recordings
      var _bulkRecordings = mongoClient.collection('recordings').initializeUnorderedBulkOp({ useLegacyOps: true });
      _async.waterfall([
        // Tìm kiếm các kênh recordings
        function (next) {
          _Recording.find({}, function (error, recordings) {
            if (recordings && recordings.length > 0) {
              next(null, resultCompanyChannel)
            } else {
              next('Không tồn tại dữ liệu')
            }
          })
        },
        // Cập nhật hoặc tạo mới chatThreads
        function (data, next1) {
          if (data.length > 0) {
            _async.eachSeries(data, function (el, callback) {
              let agentId = ""
              if (el.called && el.caller) {
                _async.waterfall([
                  // Tìm kiếm user theo called hoặc caller
                  function (next) {
                    _Users.findOne({ $or: [{ accountCode: el.caller }, { accountCode: el.called }] }, function (error, user) {
                      if (error) {
                        next(error)
                      } else {
                        if (user) {
                          agentId = user._id
                          next(null, user)
                        } else {
                          next(null, null)
                        }
                      }
                    })
                  },
                  function (data, next) {
                    // Tìm kiếm chatThread
                    if (data) {
                      _bulkRecordings.find({ _id: el._id }).update({
                        $set: {
                          agentId: agentId
                        }
                      });
                      next(null, data)
                    } else {
                      next(null)
                    }

                  }
                ], function (err, result) {
                  callback(null)
                })
              } else {
                callback(null)
              }
            }, function (err) {
              next1()
            })
          } else {
            next1("Không tôn tại dữ liệu")
          }
        }
      ], function (err, data) {
        if (err) {
          console.log('Error', err)
        } else {
          _bulkRecordings.execute(function (err) {
            if (err) {
              console.log('Error', err)
            } else {
              console.log('Đồng bộ data recording thành công')
            }
          });
        }
      })
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        error: error,
      });
    }
  }

}

module.exports = ChatHandler;
