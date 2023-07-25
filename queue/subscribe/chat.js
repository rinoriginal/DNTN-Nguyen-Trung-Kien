var crmPublish = require(path.join(_rootPath, 'queue', 'publish', 'chat.js'));

//ActiveMQ subcribe
module.exports = function (client, sessionId) {
    //CORE gửi yêu cầu lấy thông tin cuộc chat cũ
    client.subscribe('/queue/chat' + '-' + _config.activemq.queueName + '-' + 'ConnectResThread' + '-fromCore', function (body, header) {
        log.debug(body);
        try {
            //query dữ liệu cuộc chat và trả về cho bên chat server
            var result = JSON.parse(body);
            var clientId = result.ip + '-' + result._id + '-' + result.service + '-' + result.cookie;
            _async.waterfall([
                function (next) {
                    var agg = [
                        { $match: { idCompanyChannel: new mongodb.ObjectID(result._id), status: 1 } },
                        {
                            $lookup:
                            {
                                from: "surveychatquestions",
                                localField: "_id",
                                foreignField: "idSurvey",
                                as: "questions"
                            }
                        }
                    ];

                    _SurveyChat.aggregate(agg, next)
                },
                function (survey, next) {
                    _CustomerFields.find({ status: 1 }, function (err, cf) {
                        next(err, survey, cf)
                    });
                },
                function (survey, cfields, next) {
                    var _agg = [
                        { $match: { clientId: clientId, status: 1 } },
                        { $lookup: { from: 'chatlogs', localField: '_id', foreignField: 'threadId', as: 'chatlogs' } },
                        { $sort: { updated: -1 } }
                    ].concat(_.map(cfields, function (o) {
                        return { $lookup: { from: o.modalName, localField: 'customerId', foreignField: 'entityId', as: o.modalName } };
                    }));
                    _ChatThread.aggregate(_agg, function (err, threads) {
                        _ChatThread.populate(threads, {
                            path: "agentId chatlogs.sentFrom.id",
                            model: _Users,
                            populate: {
                                path: 'chatTag',
                                model: _ChatTag
                            }
                        }, function (err1, thread1) {
                            next(err1, survey, thread1);
                        });
                    });
                }
            ], function (wError, survey, wResp) {
                if (!wError) {
                    crmPublish.publishData('ResQueryThread', { sid: result.sid, data: wResp, survey: survey });
                }
                else {
                    console.log(wError, wResp);
                }
            });
        } catch (err) {
            console.log(46, err);
        }
    });

    //CORE gửi yêu cầu tạo cuộc chat
    client.subscribe('/queue/chat' + '-' + _config.activemq.queueName + '-' + 'CreateNewThread' + '-fromCore', function (body, header) {
        try {
            //Tạo cuộc chat mới
            var result = JSON.parse(body);
            var clientId = result.ip + '-' + result._id + '-' + result.service + '-' + result.cookie;
            var chatThread = { clientId: clientId, region: result.region, country: result.country, channelId: result.channelId, companyId: result.idCompany, phone: result.phone, email: result.mail };
            if (_.has(result, "isSurvey")) {
                chatThread.isSurvey = result.isSurvey;
            }
            _ChatThread.create(chatThread, function (error, newThread) {
                log.debug(error, newThread);
                _.genTree();
                crmPublish.publishData('ResNewThread', { sid: result.sid, data: newThread._id });
            });
        } catch (err) {
            console.log(63, err);
        }
    });

    //CORE gửi yêu cầu tạo log chat
    client.subscribe('/queue/chat' + '-' + _config.activemq.queueName + '-' + 'CreateNewLog' + '-fromCore', function (body, header) {
        try {
            //Tạo log chat mới
            var result = JSON.parse(body);
            var body = { threadId: new mongodb.ObjectId(result.threadId), content: result.msg };
            body['sentFrom'] = { from: parseInt(result.from) };
            if (_.has(result, 'sentFrom')) body['sentFrom']['id'] = new mongodb.ObjectId(result.sentFrom);
            if (_.has(result, 'toId')) body['sentFrom']['to'] = !_.isNull(result.toId) ? new mongodb.ObjectId(result.toId) : null;
            if (_.has(result, 'status')) body['status'] = Number(result.status);
            if (_.has(result, 'url-attachment') && _.has(result, 'fileName')) body['attachment'] = [{ url: result['url-attachment'], fileName: result['fileName'] }];
            body['created'] = new Date();
            body['updated'] = new Date();
            body['status'] = 0;
            if (result['name'] || result['phone']) {
                //Chat offline
                body['name'] = result['name'];
                body['phone'] = result['phone'];
            }
            addMsgToBulk(body);
            // _ChatLog.create(body, function (error, newLog) {
            //     _.genTree();
            // });
        } catch (err) {
            //            console.log(13, err);
        }
    });


    client.subscribe('/queue/chat' + '-' + _config.activemq.queueName + '-' + 'AgentJoinedNotify' + '-fromCore', function (body, header) {
        try {
            //Tạo log chat mới
            var result = JSON.parse(body);


            _ChatThread.findOneAndUpdate(
                { _id: new mongodb.ObjectId(result.threadId) },
                { $push: { agentStatusLogs: { agentId: result.agentId, status: 1, created: new Date(Date.now()) } } },
                function (err, chatThread) {
                    _.genTree();
                });
        } catch (err) {
            //            console.log(13, err);
        }
    });


    //CORE gửi yêu cầu update thread
    client.subscribe('/queue/chat' + '-' + _config.activemq.queueName + '-' + 'UpdateThread' + '-fromCore', function (body, header) {
        try {
            var result = JSON.parse(body);
            var threadId = result['threadId'];
            var isOffline = result['isOffline'];
            if (_.isUndefined(threadId) || _.isUndefined(isOffline)) return;
            updateThreadByBulk(threadId, { $set: { isOffline: isOffline } });
            // _ChatThread.findByIdAndUpdate(threadId, {isOffline: isOffline}, {new: true}, function (error, newThread) {});
        } catch (err) {
            console.log(63, err);
        }
    });

    //CORE gửi survey chat-app -> core -> crm
    client.subscribe('/queue/chat' + '-' + _config.activemq.queueName + '-' + 'PostSurvey' + '-fromCore', function (body, header) {
        try {
            var result = JSON.parse(body);
            log.debug(result);

            var answer = {};
            answer.reason = result.reason;
            answer.idQuestion = new mongodb.ObjectId(result.idQuestion);
            answer.value = result.value;
            answer.idAgent = new mongodb.ObjectId(result.agent._id);
            answer.idThread = new mongodb.ObjectId(result.idThread);
            answer.idService = new mongodb.ObjectId(result.idService);
            answer.customerPhone = result.customerPhone;
            answer.customerEmail = result.customerEmail;
            //get idCompany, idCompanyChannel
            _ChatThread.findById(result.idThread)
                .populate({
                    path: 'channelId'
                })
                .exec(function (err, chatThread) {
                    // log.debug(chatThread);
                    answer.idCompanyChannel = chatThread.channelId._id;
                    answer.idCompany = chatThread.channelId.idCompany;
                    log.debug(answer);

                    _SurveyChatAnswer.find({ idThread: answer.idThread }, function (err2, existedAnswer) {
                        log.debug(err2, existedAnswer)
                        if (err2) {
                            if (err2) log.error(err2);
                            return;
                        }
                        if (existedAnswer.length > 0) {
                            _.each(existedAnswer, function (e, i, l) {
                                _SurveyChatAnswer.remove(e, function (err3) {
                                    if (err3) log.error(err3);
                                })
                            })

                        }

                        _SurveyChatAnswer.create(answer, function (err1) {
                            if (err1) log.error(err1);
                        })

                        if (!_.has(chatThread, "isSurvey") || chatThread.isSurvey == 0) {
                            _ChatThread.update({ _id: chatThread._id }, { $set: { isSurvey: 1 } }).exec(function (err) {
                                if (err) log.error(err);
                            })
                        }
                    })

                });
            ;
        } catch (err) {
            console.log(148, err);
        }
    });


    //var dbPath = 'mongodb://' + _config.database.user + ':' + _config.database.pwd + '@' + _config.database.ip + ':' + _config.database.port + '/' + _config.database.name;
    // var dbPath = _dbPath; //no authen
    //interval update database
    _initDBCallBack(_dbPath, _dbName, function (err, db, client) {
        if (err) return process.exit(1);
        mongoClient = db;
        _threadBulk = db.collection('chatthreads').initializeOrderedBulkOp({ useLegacyOps: true });
        _logBulk = db.collection('chatlogs').initializeOrderedBulkOp({ useLegacyOps: true });
    });
    // mongodb.MongoClient.connect(dbPath, function (err, db) {
    //     if (err) return process.exit(1);
    //     mongoClient = db;

    //     _threadBulk = db.collection('chatthreads').initializeOrderedBulkOp({ useLegacyOps: true });
    //     _logBulk = db.collection('chatlogs').initializeOrderedBulkOp({ useLegacyOps: true });
    // });

    //trungdt - giám sát chat - nhận danh sách thread từ core
    client.subscribe('/topic/chat-list-thread', function (body, header) {
        try {
            var result = JSON.parse(body);
            var tenantId = _config.app._id;
            var threadIds = result[tenantId];
            if (!threadIds) threadIds = [];

            _ChatThread.update({ _id: { $nin: threadIds } }, { $set: { status: 0 } }, { multi: true }, function (err, result) {
                // log.info("arguments --------------- ", arguments);
            });

        } catch (err) {
            console.log(63, err);
        }
    });
};

var addMsgToBulk = function (data) {
    _logBulk.insert(data);
    if (data['sentFrom'] && data['threadId']) {
        if (_.isEqual(data['sentFrom']['from'], 0)) {
            //agentChat
            updateThreadByBulk(data['threadId'], { $set: { lastAgentChatTime: new Date(), updated: new Date() }, $inc: { "agentMessage.0.send": 1 } });
        } else if (_.isEqual(data['sentFrom']['from'], 1)) {
            //customer chat
            updateThreadByBulk(data['threadId'], { $set: { updated: new Date() }, $inc: { "agentMessage.0.receive": 1 } });
        }
    }
    scheduleUpdate();
};

var updateThreadByBulk = function (threadId, data) {
    if (threadId && data) {
        _threadBulk.find({ _id: _.convertObjectId(threadId) }).update(data);
        scheduleUpdate();
    }
};

//bulk
var _threadBulk = {};
var _logBulk = {};
var _scheduled = false;
var mongoClient;

var scheduleUpdate = function () {
    if (_scheduled) {
        //Đã đặt lịch execute bulk
        return;
    }

    var timeSchedule = 1000; //1s
    setTimeout(function () {
        //excute bulk update, insert
        if (_threadBulk.length > 0) {
            (function (threadBulk) {
                threadBulk.execute(function (err, threads) {
                    if (err) {
                        log.error(err);
                    }
                });
            })(_threadBulk);
            _threadBulk = mongoClient.collection('chatthreads').initializeOrderedBulkOp({ useLegacyOps: true });
        }

        if (_logBulk.length > 0) {
            (function (logBulk) {
                logBulk.execute(function (err, logs) {
                    if (err) {
                        log.error(err);
                    }
                });
            })(_logBulk);
            _logBulk = mongoClient.collection('chatlogs').initializeOrderedBulkOp({ useLegacyOps: true });
        }
        _scheduled = false; //reset schedule
    }, timeSchedule);
};