


module.exports = function (client, sessionId) {
    var ternalPrefix = _config.activemq.queueName;
    log.debug('/queue/subscribe/cdr-subscribe', sessionId);

    // TODO: lưu CDR Call Info được gửi từ CORE
    client.subscribe('/queue/' + ternalPrefix + '-' + 'CDRCallInfoReqMsg', function (body, header) {
        var dirtyMessage = JSON.parse(body);
        log.debug('CDRCallInfoReqMsg', dirtyMessage);

        var message = {};
        _.each(_.keys(dirtyMessage), function (key) {
            if (!_.isEqual(dirtyMessage[key], '')) message[key] = dirtyMessage[key];
        });

        if (message.callType == 1 || message.callType == 7 || message.callType == 8) {
            // TODO: Gọi vào
            _CdrCallInfo.create(message, function (err, result) {
                if (err) log.error('CDRCallInfoReqMsg ', err);
            });
            //_CdrCallInfo.update({callId: message.callId}, {$set: message}, {upsert: true, new: true}, function(err, result){
            //    if(err) log.error('CDRCallInfoReqMsg ', err);
            //});
        } else if (message.callType == 6) {
            // TODO: Gọi ra
            _CdrCallInfo.create(_.omit(message, 'serviceId'), function (err, result) {
                if (err) log.error('CDRCallInfoReqMsg ', err);
            });
            //_CdrCallInfo.update({callId: message.callId}, {$set: _.omit(message, 'serviceId')}, {upsert: true, new: true}, function(err, result){
            //    if(err) log.error('CDRCallInfoReqMsg ', err);
            //});
        }

    });

    // TODO: lưu CDR Trans Info được gửi từ CORE
    client.subscribe('/queue/' + ternalPrefix + '-' + 'CDRTransInfoReqMsg', function (body, header) {
        var dirtyMessage = JSON.parse(body);
        log.debug('CDRTransInfoReqMsg', dirtyMessage);

        var message = {};
        _.each(_.keys(dirtyMessage), function (key) {
            if (!_.isEqual(dirtyMessage[key], '')) message[key] = dirtyMessage[key];
        });
        _async.waterfall([
            function (next) {
                message.skillId = null;
                if (message.idCampain === null || message.idCampain === undefined || message.idCampain === '') {
                    next();
                } else {
                    _Campains.findOne({ _id: message.idCampain }, function (err, campaign) {
                        if (campaign !== null) {
                            message.idCompany = campaign.idCompany;
                        }
                        next();
                    });
                }
            },
            function (next) {
                if (message.invokerId === null || message.invokerId === undefined || message.invokerId === '') {
                    next();
                } else {
                    _Users.findOne({ idAgentCisco: message.invokerId }, function (err, user) {
                        message.invokerId = user._id.toString();
                        next();
                    });
                }
            },
            function (next) {
                if (message.disAgentId === null || message.disAgentId === undefined || message.disAgentId === '') {
                    next();
                } else {
                    _Users.findOne({ idAgentCisco: message.disAgentId }, function (err, user) {
                        message.disAgentId = user._id.toString();
                        next();
                    });
                }
            },
            function (next) {
                if (message.agentId === null || message.agentId === undefined || message.agentId === '') {
                    next();
                } else {
                    _Users.findOne({ idAgentCisco: message.agentId }, function (err, user) {
                        message.agentId = user._id.toString();
                        message.deviceId = user.accountCode;
                        next();
                    });
                }
            },
            function (next) {
                if (message.cdrAgentCallId) {
                    message.callId = message.cdrAgentCallId;
                };
                if (message.answerTime) {
                    message.callDuration = message.endTime - message.answerTime;
                    message.durationBlock = Math.floor((message.callDuration) / (5 * 1000));
                    log.debug('callDuration ', message.callDuration, ' - durationBlock ', message.durationBlock);
                }
                if ((message.answerTime || message.endTime) && (message.ringTime || message.startTime)) {
                    message.waitDuration = (message.answerTime || message.endTime) - (message.ringTime || message.startTime);
                    message.waitingDurationBlock = Math.floor((message.waitDuration) / (5 * 1000));
                    log.debug('waitDuration ', message.waitDuration, ' - waitingDurationBlock ', message.waitingDurationBlock);
                }
                if (message.startTime) {
                    message.timeBlock = moment(message.startTime).hour();
                    log.debug('timeBlock ', message.timeBlock);
                }
                if (message.serviceId) {
                    message.serviceId = message.serviceId;
                }
                if (message.campaignID) {
                    message.idCampain = message.campaignID;
                }
                if (message.answerTime === 0) {
                    message.callDuration = 0;
                    message.durationBlock = Math.floor((message.callDuration) / (5 * 1000));
                    console.log('Message answerTime = 0. callDuration ' + message.callDuration + ' - durationBlock ' + message.durationBlock);
                }
                _CdrTransInfo.update({ cdrTransId: message.cdrTransId }, { $set: message }, { upsert: true, new: true }, function (err, result) {
                    if (err) log.error('CDRTransInfoReqMsg', err);
                });

            }
        ]);
    });
};