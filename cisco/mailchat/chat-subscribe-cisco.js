exports.create = function (req, res) {
    if (_.has(req.query, 'idChannelCisco')) {
        let { phoneNumber, email, name, idChannelCisco, idCallDialog, activityId } = req.query;
        var idChannel = ""
        var idCompany = ""
        var customerId = null
        let idFacebook = null
        let idZalo = null
        let agentId = req.session.user._id.toString();
        let channelTypeSocial = ""
        let pageId = ""
        let insertCus = {};
        // check email  và get id Khách hàng với trường hợp chat zalo và facebook
        if (email && !ischeckEmail(email)) {
            channelTypeSocial = email.split("|")[0];
            if (channelTypeSocial == 'zalo') {
                idZalo = email.split("|")[1];
                pageId = email.split("|")[2]
            } else {
                idFacebook = email.split("|")[1];
                pageId = email.split("|")[2]
            }
        }
        _async.waterfall([
            function (next) {
                if (!channelTypeSocial) {
                    if (phoneNumber) {
                        insertCus.field_so_dien_thoai = phoneNumber
                        mongoose.model('field_so_dien_thoai').findOne({ 'value': phoneNumber }, function (error, result) {
                            if (result) {
                                next(null, result)
                            } else {
                                insertCus.field_so_dien_thoai = email
                                mongoose.model('field_e_mail').findOne({ 'value': email }, function (err, data) {
                                    next(err, data)
                                })
                            }
                        })
                    } else {
                        insertCus.field_so_dien_thoai = email
                        mongoose.model('field_e_mail').findOne({ 'value': email }, function (err, data) {
                            next(err, data)
                        })
                    }

                } else {
                    // Tìm kiếm khách hàng nếu đó là kênh chat feacebook
                    mongoose.model('field_facebook').findOne({ 'value': idFacebook }, function (error, dataCustomerFacebookIndex) {
                        if (dataCustomerFacebookIndex) {
                            next(error, dataCustomerFacebookIndex);
                        } else {
                            // Tìm kiếm khách hàng nếu đó là kênh chat zalo
                            mongoose.model('field_zalo').findOne({ 'value': idZalo }, function (error, dataCustomerZaloIndex) {
                                next(error, dataCustomerZaloIndex)
                            })
                        }
                    })
                }

            },
            function (customers, next) {
                if (customers) {
                    customerId = customers.entityId
                    next(null, customerId)
                } else {
                    // Tạo mới khách hàng với kênh chat live và email
                    if (!channelTypeSocial) {
                        insertCus.field_ho_ten = name
                        _async.waterfall([
                            function (next2) {
                                _Customer.create({}, next2);
                            },
                            function (newCus, next2) {
                                insertCus._id = newCus._id
                                customerId =newCus._id
                                mongoClient.collection('customerindex').insert(
                                    insertCus
                                    , function (err, result) {
                                        next2(err, newCus);
                                    });
                            },
                            function (newCus, next2) {
                                if (!channelTypeSocial) {
                                    _CCKFields['field_e_mail'].db.create({ entityId: customerId, value: email }, next2);
                                } else {
                                    next2(null, newCus)
                                }

                            },
                            function (newCus, next2) {
                                if (phoneNumber){
                                    _CCKFields['field_so_dien_thoai'].db.create({ entityId: customerId, value: phoneNumber }, next2);
                                } else {
                                    next2(null, newCus)
                                }
                            },
                            function (newCus, next2) {
                                if (name){
                                    _CCKFields['field_ho_ten'].db.create({ entityId: customerId, value: name }, next2);
                                } else {
                                    next2(null, newCus)
                                }
                            }
                        ], next);
                    } else {
                        next(null, null)
                    }
                }

            },
            function (data, callback) {
                // Tim kiem service  idChannelCisco
                _CompanyChannel.findOne({ idChannelCisco: idChannelCisco }, function (error, companyChannel) {
                    if (companyChannel) {
                        idCompany = companyChannel.idCompany
                        callback(null, companyChannel)
                    }
                })

            },
            function (data, callback) {
                // tim kiem chat service
                idChannel = data._id.toString()
                _ServicesChat.findOne({ idChannel: idChannel }, function (error, serviceChat) {
                    if (serviceChat) {
                        callback(null, serviceChat)
                    }
                })

            },
            function (data, callback) {
                // create chat thread
                var clientId = data._id.toString() + '-' + data.idChannel + '-' + data._id.toString()
                var chatThread = {
                    customerId: customerId,
                    clientId: clientId,
                    channelId: idChannel,
                    companyId: idCompany,
                    idServiceChat: data._id,
                    phone: phoneNumber,
                    email: email,
                    idCallDialog: idCallDialog,
                    agentId: agentId,
                    activityId: activityId,
                    pageId: pageId
                };
                _ChatThread.findOne({
                    channelId: idChannel,
                    companyId: idCompany,
                    activityId: activityId,
                    idServiceChat: data._id.toString()
                }, function (error, chatThreadResult) {
                    if (chatThreadResult) {
                        callback(error, chatThreadResult)
                    } else {
                        _ChatThread.create(chatThread, function (error, newThread) {
                            callback(error, newThread);
                        });
                    }
                })
            }
        ], function (error, result) {
            res.json({ code: (error ? 500 : 200), result: error ? error : result });
        })
    } else {
        let { idMailCisco, email, subject, queueNumber, queueName, activityId } = req.query
        var idServiceMail = null
        var idMailCampaign = null
        var agentId = req.session.user._id.toString();
        _async.waterfall([
            function (next) {
                _CCKFields['field_e_mail'].db.find({ value: email }).limit(1).exec(next);
            },
            function (customers, next) {
                if (customers.length > 0) {
                    customerId = customers[0].entityId
                    next(null, customerId)
                } else {
                    _async.waterfall([
                        function (next2) {
                            _Customer.create({}, next2);
                        },
                        function (newCus, next2) {
                            mongoClient.collection('customerindex').insert({
                                _id: newCus._id,
                                field_e_mail: email
                            }, function (err, result) {
                                next2(err, newCus);
                            });
                        },
                        function (newCus, next2) {
                            _CCKFields['field_e_mail'].db.create({ entityId: newCus._id, value: email }, next2);
                        },
                    ], next);
                }

            },
            function (data, next) {
                // tim kiem service email đã tồn tại hay chưa
                _ServicesMail.findOne({ idServiceMailCisco: queueName }, function (error, result) {
                    if (result) {
                        idServiceMail = result._id
                        next(null, result)
                    } else {
                        next(error, null)
                    }
                })
            },
            function (data, next) {
                // Tim kiem campaign mail cho inbound cisco , isMailInbound = 1
                _MailCampaigns.findOne({ isMailInbound: 1 }, function (error, mailCampaign) {
                    if (mailCampaign) {
                        idMailCampaign = mailCampaign._id
                        next(null, mailCampaign)
                    } else {
                        next(error, null)
                    }
                })
            },
            function (data, next) {
                // Tao moi email neu chua ton tai
                _Mail.findOne({ idMailCisco: idMailCisco }, function (error, mailResult) {
                    if (mailResult) {
                        next(null, mailResult)
                    } else {
                        // tao moi ban ghi vao bang Email
                        _Mail.create({
                            from: email,
                            to: 'demo1@thinhtientech.com',
                            subject: subject,
                            subject_raw: subject,
                            mail_type: 2,
                            agent: agentId,
                            campaign: idMailCampaign,
                            service: idServiceMail,
                            idMailCisco: idMailCisco,
                            activityId: activityId,
                            mail_status: 2,
                            status: 3,
                            created: Date.now()

                        }, function (error, createMail) {
                            next(null, createMail)
                        })
                    }
                })
            }
        ], function (error, result) {

            res.json({ code: (error ? 500 : 200), result: error ? error : result });
        })
    }
}

function ischeckEmail(params) {
    var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (params.match(mailformat)) {
        return true;
    }
    return false;
}