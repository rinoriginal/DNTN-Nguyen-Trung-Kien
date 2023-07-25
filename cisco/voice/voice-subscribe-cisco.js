var hashListCallId = (function () {
    var hash = [];
    var ttl = 60 * 60 * 1000;
    var interLive = setInterval(function () {
        hash = [];
    }, ttl);
    var checkCallIdInList = function (callId) {
        // true: Đã tồn tại
        // false: Chưa tồn tại
        return hash.indexOf(callId) >= 0;
    };
    return {
        /**
         * Thêm một callId vào mảng.
         * Nếu thêm thành công(true) -> Mọi thứ ok
         * Nếu thêm không thành công(false) -> Đây là bản tin popup thứ 2 cho cuộc gọi này reject
         * @param callId
         * @returns {boolean}
         */
        add: function (callId) {
            if (checkCallIdInList(callId)) return false; // Đã tồn tại --> error
            hash.push(callId);
            return true;
        },
        check: checkCallIdInList,
        setTimeToLive: function (newTtl) {
            ttl = newTtl;
            if (interLive) {
                clearInterval(interLive);
                interLive = setInterval(function () {
                    hash = [];
                }, ttl);
            }
        }
    };
})();
var _config = require(path.join(_rootPath, 'config', 'conf.json'));
exports.create = function (req, res) {
    // TODO: nhận bản tin popup new call từ CORE
    try {
        console.log('Tao ban ghi 11')
        var _callData = JSON.parse(req.body.data);
        var result = JSON.parse(req.body.data).mediaProperties;
        var agentId = req.session.user._id.toString();
        let typeClickToCall = req.query['type']
        let caller = _callData.fromAddress
        let recordPath = ""
        if (typeClickToCall === 'update') {
            let callId = _callData.id
            console.log('callID', _callData)
            let endTime = new Date(req.query['endTime']).getTime() + (7 * 3600);
            let answerTime = req.query['answerTime'] === 'null' ? null :
                new Date(req.query['answerTime']).getTime() + (7 * 3600);
            let ringTime = req.query['ringTime'] === 'null' ? null : new Date(req.query['ringTime']).getTime() + (7 * 3600);
            _async.waterfall([
                function (next) {
                    // tim  _cdrCallInfo
                    _CdrCallInfo.findOne({
                        callId: callId,
                    }, function (error, cdr) {
                        if (cdr) {
                            return next(null, cdr);
                        }
                        return next('error');

                    })
                },
                function (data, next) {
                    // cap nhat cdr call info
                    _CdrCallInfo.findOneAndUpdate({ _id: data._id }, { $set: { endTime: endTime } }, { new: true }, function (error, cdrUpdate) {
                        next(error, cdrUpdate)
                    })
                },
                function (data, next) {
                    // tim kiem 
                    console.log('tim kiem ', JSON.stringify(data))
                    _CdrTransInfo.findOne({
                        callId: callId,
                    }, function (error, cdrTransInfo) {
                        next(null, cdrTransInfo)
                    })
                },
                function (data, next) {
                    console.log('sau tim kiem ', JSON.stringify(data))
                    let startTime = data.startTime
                    let callDuration = null
                    let durationBlock = null
                    let waitDuration = null
                    let waitingDurationBlock = null
                    let timeBlock = null
                    ringTime = ringTime === null ? startTime : ringTime;
                    if (answerTime) {
                        callDuration = endTime - answerTime;
                        durationBlock = Math.floor((callDuration) / (5 * 1000));
                        log.debug('callDuration ', callDuration, ' - durationBlock ', durationBlock);
                    }
                    if ((answerTime || endTime) && (ringTime || startTime)) {
                        waitDuration = (answerTime || endTime) - (ringTime || startTime);
                        waitingDurationBlock = Math.floor((waitDuration) / (5 * 1000));
                        log.debug('waitDuration ', waitDuration, ' - waitingDurationBlock ', waitingDurationBlock);
                    }
                    if (startTime) {
                        timeBlock = moment(startTime).hour();
                        log.debug('timeBlock ', timeBlock);
                    }
                    if (!answerTime) {
                        answerTime = 0;
                    }
                    if (callDuration && callDuration > 0) {
                        recordPath = callId;
                    }

                    _CdrTransInfo.findOneAndUpdate({ _id: data._id }, {
                        $set: {
                            endTime: endTime,
                            answerTime: answerTime,
                            ringTime: ringTime,
                            callDuration: callDuration,
                            waitDuration: waitDuration,
                            waitingDurationBlock: waitingDurationBlock,
                            timeBlock: timeBlock,
                            deviceId: caller,
                            recordPath: recordPath
                        }
                    }, { new: true },
                        function (error, cdrTransInfoUpdate) {
                            next(error, cdrTransInfoUpdate)
                        })
                }
            ], function (err, result) {
                res.json({ code: 200 });
            })
        } else if (typeClickToCall === "create") {
            let ticketId = req.query['ticketId']
            let companyId = req.query['companyId'] === "undefined" ? undefined : req.query['companyId'];
            let serviceId = req.query['serviceId'] === "undefined" ? undefined : req.query['serviceId'];
            let campainId = req.query['campainId'] === "undefined" ? undefined : req.query['campainId'];
            let ternalId = _config.app._id
            let called = _callData.toAddress
            let callId = _callData.id
            let participants = _callData.participants.Participant
            let startTime = new Date(participants.startTime).getTime() + (7 * 3600);
            let transId = new Date().getTime()
            _async.waterfall([
                function (next) {
                    // tao _cdrCallInfo
                    _CdrCallInfo.create({
                        idTicket: ticketId,
                        serviceId: serviceId,
                        idCompany: companyId,
                        idCampain: campainId,
                        callType: 6,
                        called: called,
                        callId: callId,
                        caller: caller,
                        tenanl: ternalId,
                        startTime: startTime,
                        transId: transId.toString()
                    }, function (error, cdrData) {
                        _Tickets.update({ _id: ticketId }, {
                            $push: { callId: callId },
                            $inc: { callIdLength: 1 }
                        }, function (err, result) {
                            if (err) {
                                console.log(JSON.stringify(err))
                            } else {
                                console.log(JSON.stringify(result))
                            }
                        });
                        next(null, cdrData)
                    })
                },
                function (data, next) {
                    _CdrTransInfo.create({
                        idTicket: ticketId,
                        idCompany: companyId,
                        idCampain: campainId,
                        agentId: agentId,
                        invokerId: agentId,
                        serviceType: 3,
                        transType: 6,
                        called: called,
                        callId: callId,
                        caller: caller,
                        tenanl: ternalId,
                        startTime: startTime,
                        deviceId: caller,
                        transId: transId.toString(),
                        cdrTransId: transId.toString()
                    }, function (error, cdr) {
                        next(null, cdr)
                    })
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: result });
            })
        } else {
            var callNumber = _callData.fromAddress;
            // var serviceId = _.convertObjectId('5edfb5b0da52a06ae43bcbe8')
            var hotline = Number(result.callvariables.CallVariable[1].value);
            var serviceName = result.queueName;
            var callID = _callData.id;
            if (!hashListCallId.add(callID)) {
                return log.error('DUPLICATE POPUP', { callID });
            }
            var agentSockets = _socketUsers[agentId];
            var callType = 1;
            if (result && result.callType == "OUTBOUND") {
                callType = 6
                callNumber = _callData.toAddress
            }
            // var callType = result.callType;
            var callStatusType = 4;
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
                        serviceId = _.convertObjectId(data._id)
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
                    if (data){
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
                        }
                        if (callType == '1') {
                            // CALL INBOUND
                            _async.waterfall([
                                function (callback) {
                                    _CCKFields['field_so_dien_thoai'].db.find({ value: callNumber }).limit(1).exec(callback);
                                },
                                function (customers, callback) {
                                    if (customers.length > 0) {
                                        callback(null, [{ _id: customers[0].entityId }]);
                                    } else {
                                        _async.waterfall([
                                            function (next2) {
                                                _Customer.create({}, next2);
                                            },
                                            function (newCus, next2) {
                                                mongoClient.collection('customerindex').insert({
                                                    _id: newCus._id,
                                                    field_so_dien_thoai: callNumber
                                                }, function (err, result) {
                                                    next2(err, newCus);
                                                });
                                            },
                                            function (newCus, next2) {
                                                _CCKFields['field_so_dien_thoai'].db.create({ entityId: newCus._id, value: callNumber }, next2);
                                            },
                                            function (newfield, next2) {
                                                var _agg = [];
                                                _agg.push({ $match: { _id: newfield.entityId } });
                                                _agg.push({ $lookup: { from: 'field_so_dien_thoai', localField: '_id', foreignField: 'entityId', as: 'field_so_dien_thoai' } });
                                                _Customer.aggregate(_agg, function (err, cus) {
                                                    next2(err, cus);
                                                });
                                            }
                                        ], callback);
                                    }
                                },
                                function (customers, next) {
                                    console.log('test', customers)
                                    var ticketId = null;
                                    if (customers.length > 0) {
                                        _Tickets.create({ channelType: "Inbound", idCustomer: customers[0]._id, idService: serviceId, idAgent: agentId, callId: [callID], callIdLength: 1 }, function (error, dataTicket) {
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
                    }else {
                        next(null, null)
                    }
                   
                }

            ], function (err, data) {
                if (data){
                    let dataResponse = {};
                    if (callType == '1') {
                        dataResponse = {
                            id: data._id,
                            title: callNumber + ' - ' + _moment(new Date()).format('HH:mm') + ' - ' + serviceName
                        }
                    }
                    if (callType == '6'){
                        let campains = data.campain
                        dataResponse = {
                            id: data.ticket._id,
                            title: callNumber + ' - ' + _moment(new Date()).format('HH:mm') + ' - ' + campains.name
                        }
                    }
                    res.json({ code: err ? 500 : 200, message: err ? err : dataResponse });
                }else {
                    res.json({ code: 201});
                }
               
                
            });
        }


    } catch (err) {
        console.log('voice-subscribe/PopupCallReqMsg ', err);
    }
}