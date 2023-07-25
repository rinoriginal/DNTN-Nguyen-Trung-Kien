
class VoiceHandler {
    constructor() { }

    async getSurveyCode(req, res) {
        try {
            const configResult = await _Config.find({});
            console.log(`------- configResult ------- `);
            console.log(configResult);
            console.log(`------- configResult ------- `);
            if (!configResult || configResult.length <= 0) {
                const error = new Error('Không tìm thấy survey!');
                throw error;
            }
            return res.json({ code: 200, surveyCode: configResult[0].survey.code });
        } catch (error) {
            console.log(`------- error ------- `);
            console.log(error);
            console.log(`------- error ------- `);
            return res.json({ code: 500, message: error })
        }
    }

    async clickTwoCall(req, res) {
        try {
            console.log('BODY OUTBOUND', JSON.stringify(req.body));
            var field_so_dien_thoai = req.body.phone;
            var idCampain = req.body.idCampain;
            let callId = req.body.id;
            if (!field_so_dien_thoai || !idCampain) {
                return res.json({
                    code: 500,
                    message: 'Tạo ticket bị lỗi: Thiếu dữ liệu.'
                });
            }
            if (['0', '+', '84'].indexOf(field_so_dien_thoai[0]) < 0) {
                field_so_dien_thoai = '0' + field_so_dien_thoai;
            }
            if (!req.session.user._id) {
                return res.json({
                    code: 500,
                    message: 'Tạo ticket bị lỗi: Agent đang đăng nhập không hợp lệ.'
                });
            }
            _async.waterfall([
                // Kiểm tra số điện thoại đã tồn tại trong trường field_so_dien_thoai của khách hàng
                function (next) {
                    _CCKFields['field_so_dien_thoai'].db.find({
                        value: field_so_dien_thoai
                    })
                        .limit(1)
                        .exec(next);
                },
                function (customerPhone, next) {
                    if (customerPhone && customerPhone.length > 0) {
                        // Đã tồn tại khách hàng với số điện thoại này
                        return next(null, { _id: customerPhone[0].entityId });
                    }
                    // Tạo mới khách hàng
                    _async.waterfall([
                        function (next) {
                            _Customer.create({}, next);
                        },
                        function (newCus, next) {
                            // mongoClient.collection('customerindex').insert({
                            //     _id: newCus._id,
                            //     field_so_dien_thoai: field_so_dien_thoai
                            // }, function (err, result) {
                            //     if (err || result.result.n != 1) {
                            //         return next(err || 'Tạo customerindex xảy ra lỗi.');
                            //     }
                            //     next(null, newCus);
                            // });
                            _Customerindex.create({
                                _id: newCus._id,
                                field_so_dien_thoai: field_so_dien_thoai
                            }, function (err, result) {
                                if (err || !result._id) {
                                    return next(err || 'Tạo customerindex xảy ra lỗi.');
                                }
                                next(null, newCus);
                            });
                        },
                        function (newCus, next) {
                            _CCKFields['field_so_dien_thoai'].db.create({
                                entityId: newCus._id,
                                value: field_so_dien_thoai
                            }, next);
                        }
                    ], next);
                },
                function (cusObject, next) {
                    // Khách hàng mới hoàn toàn. Tạo ticket
                    if (cusObject.entityId && cusObject.value) {
                        _Tickets.create({
                            channelType: "Outbound",
                            createBy: req.session.user._id,
                            idCustomer: cusObject.entityId,
                            idCampain: idCampain,
                            idAgent: req.session.user._id
                        }, function (errorTicket, dataTicket) {
                            // Tạo bản ghi cho bảng customer journey
                            var obj = {};
                            obj['ticketId'] = dataTicket._id;
                            obj['ticketObject'] = dataTicket;
                            _CustomerJourney.create(obj, function (errorJourney, resultJourney) {
                                if (resultJourney) {
                                    next(null, dataTicket)
                                } else {
                                    next(null, null)
                                }
                            });
                        });
                    } else {
                        // Khách hàng đã tồn tại, tìm ticket gọi ra theo khách hàng
                        var idCustomer = cusObject._id;
                        _Tickets.findOne({
                            idCustomer,
                            idCampain
                        }, function (err, ticket) {
                            if (err) {
                                return next(err);
                            } else {
                                if (!ticket) {
                                    // Chưa có ticket gọi ra
                                    _Tickets.create({
                                        channelType: "Outbound",
                                        createBy: req.session.user._id,
                                        idCustomer: idCustomer,
                                        idCampain: idCampain,
                                        idAgent: req.session.user._id,
                                        callId: [callId]
                                    }, function (errorTicket, dataTicket) {
                                        // Tạo bản ghi cho bảng customer journey
                                        var obj = {};
                                        obj['ticketId'] = dataTicket._id;
                                        obj['ticketObject'] = dataTicket;
                                        _CustomerJourney.create(obj, function (errorJourney, resultJourney) {
                                            if (resultJourney) {
                                                next(null, dataTicket)
                                            } else {
                                                next(null, null)
                                            }
                                        });
                                    });
                                } else {
                                    // Cập nhật thông tin ticket với call id
                                    _Tickets.update({ _id: ticket._id }, {
                                        $push: { callId: callId },
                                        $inc: { callIdLength: 1 },
                                        updated: new Date()
                                    }, function (err, result) {
                                        next(null, ticket)
                                    });
                                }
                            }

                        });
                    }

                }
            ], function (err, result) {
                res.json({
                    code: err ? 500 : 200,
                    ticketId: (result && result._id) ? result._id : null,
                    message: err
                });
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                error: error,
            });
        }
    }
    // Kiểm tra thông tin khách hàng và tạo ticket cho cuộc call inbound và autocall
    async create(req, res) {
        try {
            var _callData = JSON.parse(req.body.data);
            var result = JSON.parse(req.body.data).mediaProperties;
            var agentId = req.session.user._id.toString();
            var callNumber = _callData.fromAddress;
            var hotline = Number(result.callvariables.CallVariable[1].value);
            var serviceName = result.queueName;
            var callID = _callData.id;
            var callType = 1;
            if (result && result.callType == "OUTBOUND") {
                callType = 6
                callNumber = _callData.toAddress
            }
            var serviceId = ""
            var idCustomer = ""
            _async.waterfall([
                // Tìm kiếm service
                function (next) {
                    _Services.findOne({ queueNumber: hotline }, function (errorService, data) {
                        if (data) {
                            next(null, data)
                        } else {
                            next(null, null)
                        }
                    })
                },
                function (data, next) {
                    if (data) {
                        serviceId = data._id
                        next(null, serviceId)
                    } else {
                        let callvariables = result.callvariables.CallVariable
                        for (let item of callvariables) {
                            if (item.name == "BACampaign") {
                                serviceId = item.value
                            }
                            if (item.name == "BAAccountNumber") {
                                idCustomer = item.value
                            }
                        }
                        next(null, serviceId)
                    }
                },
                function (data, next) {
                    // CALL OUTBOUND
                    if (data) {
                        if (callType == '6') {
                            _async.waterfall([
                                function (callback) {
                                    _Campains.findById(serviceId, function (error, cp) {
                                        callback(null, cp)
                                    });
                                },
                                function (data, callback) {
                                    if (_.isEqual(data.type.toString(), '2')) {
                                        //Todo: Gọi ra tự động/auto dialing
                                        _Tickets.create({ channelType: "Outbound", idCustomer: idCustomer, idCampain: serviceId, idAgent: agentId, callId: [callID], callIdLength: 1 }, function (err, ticket) {
                                            let dataNext = {
                                                ticket: ticket,
                                                campain: data
                                            }
                                            // Tạo bản ghi cho bảng customer journey
                                            var obj = {};
                                            obj['ticketId'] = ticket._id;
                                            obj['ticketObject'] = ticket;
                                            _CustomerJourney.create(obj, function (errorTicket, resultTickket) {
                                                if (resultTickket) {
                                                    callback(null, dataNext)
                                                } else {
                                                    callback(null, null)
                                                }
                                            });
                                        });
                                    } else {
                                        //Todo: Gọi ra bình thường
                                        let dataNext = {
                                            ticket: null,
                                            campain: data
                                        }
                                        next(null, dataNext);
                                    }
                                },
                            ], next);
                        } else {
                            if (callType == '1') {
                                // CALL INBOUND
                                _async.waterfall([
                                    // Tìm kiếm thông tin khách hàng
                                    function (next) {
                                        mongoose.model('field_so_dien_thoai').findOne({ 'value': callNumber }, function (error, dataCustomerPhone) {
                                            if (error) {
                                                next(error)
                                            } else {
                                                if (dataCustomerPhone) {
                                                    next(null, dataCustomerPhone)
                                                } else {
                                                    next(null, null)
                                                }
                                            }

                                        })
                                    },
                                    function (data, callback) {
                                        if (data) {
                                            idCustomer = data.entityId
                                            callback(null, idCustomer);
                                        } else {
                                            _async.waterfall([
                                                function (next2) {
                                                    _Customer.create({}, next2);
                                                },
                                                function (newCus, next2) {
                                                    idCustomer = newCus._id
                                                    // mongoClient.collection('customerindex').insert({
                                                    //     _id: idCustomer,
                                                    //     field_so_dien_thoai: callNumber
                                                    // }, function (err, result) {
                                                    //     next2(err, newCus);
                                                    // });
                                                    _Customerindex.create({
                                                        _id: idCustomer,
                                                        field_so_dien_thoai: callNumber
                                                    }, function (err, result) {
                                                        next2(err, newCus);
                                                    });
                                                },
                                                function (newCus, next2) {
                                                    _CCKFields['field_so_dien_thoai'].db.create({ entityId: idCustomer, value: callNumber }, next2);
                                                }
                                            ], callback);
                                        }
                                    },
                                    function (data, next) {
                                        if (data) {
                                            _Tickets.create({ channelType: "Inbound", idCustomer: idCustomer, idService: serviceId, idAgent: agentId, callId: [callID], callIdLength: 1 }, function (error, dataTicket) {
                                                // Tạo bản ghi cho bảng customer journey
                                                var obj = {};
                                                obj['ticketId'] = dataTicket._id;
                                                obj['ticketObject'] = dataTicket;
                                                _CustomerJourney.create(obj, function (errorTicket, resultTickket) {
                                                    if (resultTickket) {
                                                        next(errorTicket, dataTicket);
                                                    } else {
                                                        next(errorTicket, null)
                                                    }
                                                });
                                            });
                                        } else {
                                            next(customers, null);
                                        }
                                    }
                                ], function (error, data) {
                                    next(null, data)
                                });
                            }
                        }

                    } else {
                        next(null, null)
                    }

                }

            ], function (err, data) {
                if (data) {
                    let dataResponse = {};
                    if (callType == '1') {
                        dataResponse = {
                            id: data._id,
                            title: callNumber + ' - ' + _moment(new Date()).format('HH:mm') + ' - ' + serviceName
                        }
                    }
                    if (callType == '6') {
                        let campains = data.campain
                        dataResponse = {
                            id: data.ticket._id,
                            title: callNumber + ' - ' + _moment(new Date()).format('HH:mm') + ' - ' + campains.name
                        }
                    }
                    res.json({ code: err ? 500 : 200, message: err ? err : dataResponse });
                } else {
                    res.json({ code: 201 });
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error,
            });
        }
    }
    async updateTicket(req, res) {
        try {
            let callId = req.body.id;
            let ticketId = req.body.ticketId
            // Cập nhật thông tin ticket với call id
            _Tickets.update({ _id: ticketId }, {
                $push: { callId: callId },
                $inc: { callIdLength: 1 }
            }, function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err : "Cập nhật ticket thành công!" });
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                error: error,
            });
        }
    }
}

module.exports = VoiceHandler;
