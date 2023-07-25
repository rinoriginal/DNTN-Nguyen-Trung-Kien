

var acdPublish = require(path.join(_rootPath, 'queue', 'publish', 'acd-publish.js'));
var manager = require(path.join(_rootPath, 'monitor', 'manager.js'));
var orderMonitor = require(path.join(_rootPath, 'monitor', 'order-monitor'));

/**
 * Kiểm tra trạng thái đăng nhập của agent, nếu không còn kết nối socket thì xóa dữ liệu khỏi bộ nhớ và Log Out
 * @param agentId ID user
 */
var checkOnline = function (agentId, socket) {
    //console.log(9, agentId, _socketUsers[agentId].sid);
    if (_socketUsers[agentId] && _socketUsers[agentId].sid.length == 0) {
        acdPublish.sendLogOutRequest(agentId, '');
        var monitor = _socketUsers[agentId].monitor;
        if (monitor) monitor.destroy();
        delete _socketUsers[agentId];
        socket.broadcast.emit("agentOffline", agentId);
        //console.log(15, _socketUsers[agentId]);
    }
}

module.exports = function init(socket) {
    //TODO: thiết lập kết nối từ client
    socket.on('client-connect', function (data) {
        //1 agent 1 socket
        //_socketUsers[data._id] = {sid: data.sid};
        //1 agent nhieu socket

        /* hoangdv join socket to room, room name is agentId*/
        socket.join(data._id);

        //TODO: lưu socket id của user để quản lý
        if (_.has(_socketUsers, data._id)) {
            _socketUsers[data._id].sid.push(data.sid);
            // DUONGNB: Add event assign ticket when online
            orderMonitor.assignWhenOnline(data._id, function (err) {
                if (err) log.error(err);
            })
        } else {
            //_socketUsers[data._id] = {sid: [data.sid]};
        }

        socket.broadcast.emit("agentOnline", {
            _id: data._id,
            emailStatus: _socketUsers[data._id] && _socketUsers[data._id].hasOwnProperty("emailStatus") ? _socketUsers[data._id].emailStatus : null,
            chatStatus: _socketUsers[data._id] && _socketUsers[data._id].hasOwnProperty("chatStatus") ? _socketUsers[data._id].chatStatus : null,
            voiceStatus: _socketUsers[data._id] && _socketUsers[data._id].hasOwnProperty("voiceStatus") ? _socketUsers[data._id].voiceStatus : null
        });
        //console.log(24,'socket connect ', data, _socketUsers[data._id]);
    });

    //TODO: ngắt kết nối với client
    socket.on('disconnect', function () {
        var sid = socket.id;
        var agentId = _.find(_.keys(_socketUsers), function (key) {
            return _socketUsers[key].sid.indexOf(sid) >= 0;
        });

        log.debug("Socket on disconnect: ", sid);
        log.debug("Socket AgentId: ", agentId);
        if (_socketUsers[agentId]) {
            log.debug("Socket _socketUsers: ", _socketUsers[agentId].sid);
        }

        if (agentId) {
            //TODO: xóa socket id khỏi bộ nhớ
            _socketUsers[agentId].sid = _.reject(_socketUsers[agentId].sid, function (el) {
                return _.isEqual(el.toString(), sid.toString());
            });
            delete sio.sockets.sockets[sid];
            //TODO: nếu user không còn kết nối socket nào với backend thì tự động Log Out sau 100s
            if (_socketUsers[agentId].sid.length == 0) {
                //cuongnm : cập nhật trạng thái
                // _socketUsers[agentId].emailStatus = {
                //     status: 0,
                //     statusChange: 0
                // };
                // _socketUsers[agentId].chatStatus = {
                //     status: 0,
                //     statusChange: 0
                // };
                //cuongnm : thông báo agent rời đi
                // socket.broadcast.emit("agentOffline", agentId);
                setTimeout(checkOnline, 60000, agentId, socket);

                // trungdt: cập nhật trạng thái tương tác của agent
                // _socketUsers[agentId].emailTuongTac = 0;
            }
        }
    });

    //TODO: gửi bản tin yêu cầu danh sách đầu số có thể sử dụng để tạo mới service
    socket.on('getQueueNumberReq', function (data) {
        acdPublish.sendGetQueueNumber(data.sid);
    });

    //TODO: kiểm tra đầu số đã được sử dụng hay chưa
    socket.on('CheckQueueNumberReq', function (data) {
        acdPublish.sendCheckQueueNumber(data.sid, data.number);
    });

    //TODO: Yêu cầu click to call từ client
    socket.on('MakeCallReq', function (data) {
        var monitor = _socketUsers[data._id.toString()] ? _socketUsers[data._id.toString()].monitor : null;
        var callStatus = monitor ? monitor.getCallStatus() : null;

        if (callStatus && callStatus == 5 && data.ticket) {
            if (data.ticket.idCampain) {
                var campaignId = data.ticket.idCampain._id.toString();
                monitor.setWorkPlace(campaignId);
                monitor.setCallStatus(-1);
                monitor.setCurCall(data.ticket);
                acdPublish.sendMakeCallRequest(data._id, data.number, data.sid, data.ticket.idCampain.trunk.prefix, 1, campaignId);
            } else if (data.ticket.idService) {
                //TODO: truy vấn dữ liệu trunk để make call
                _Trunk.findOne({
                    idCompany: data.ticket.idService.idCompany._id
                }, function (err, trunk) {
                    if (!err) {
                        var serviceId = data.ticket.idService._id.toString();
                        monitor.setWorkPlace(data.ticket.idService._id.toString());
                        monitor.setCallStatus(-1);
                        monitor.setCurCall(data.ticket);
                        acdPublish.sendMakeCallRequest(data._id, data.number, data.sid, trunk.prefix, 1, serviceId);
                    }
                });
            }
        }
    });

    //TODO: yêu cầu lấy danh sách trạng thái làm việc của agent từ client
    socket.on('GetAgentStatus', function (data) {
        _AgentStatus.find({}, function (err, result) {
            if (_socketUsers[data.user] && _socketUsers[data.user].monitor) {
                var curStatus = _socketUsers[data.user].monitor.getStatus();
                var curCallStatus = _socketUsers[data.user].monitor.getCallStatus();
                var chatStatus = !!_socketUsers[data.user].chatStatus ? _socketUsers[data.user].chatStatus.status : 0;
                var emailStatus = !!_socketUsers[data.user].emailStatus ? _socketUsers[data.user].emailStatus.status : 0;
                socket.emit('GetAgentStatus', {
                    data: result,
                    curStatus: curStatus,
                    curCallStatus: curCallStatus,
                    chatStatus: chatStatus,
                    emailStatus: emailStatus
                });
            }
        });
    });

    //TODO: yêu cầu thay đổi trạng thái làm việc của agent từ client
    socket.on('ChangeAgentStatus', function (data) {
        var monitor = _socketUsers[data.user] ? _socketUsers[data.user].monitor : null;
        if (monitor && monitor.getStatus() != Number(data.status)) {
            acdPublish.sendChangeAgentStatusRequest(data.user, data.changeBy, data.status, data.sid);
        }
    });

    socket.on('sendTestConnection', function (data) {
        //log.debug(data);
        console.log('cuongnm 132 -------------------------------------------------------------------\n', data);
        if (_.isEqual(data.status, '1')) {
            _SkillsMail.find({
                status: 1,
                _id: new mongoose.Types.ObjectId(data.idSkill)
            }, function (e, skills) {
                //log.debug(skills);
                if (skills.length > 0) {
                    data.appId = _config.app._id;
                    QUEUE_Mail.sentTest(data);
                } else {
                    data.otherError = "Cần kích hoạt skill đã chọn trước!"
                    sio.to(data.socketId).emit("testConnectionResponse", data);
                }
            });
        } else {
            data.appId = _config.app._id;
            QUEUE_Mail.sentTest(data);
        }
    })

    socket.on('checkTrunkReq', function (data) {
        data.queueName = _config.activemq.queueName;
        QUEUE_VoicePublish.checkTrunk(data);
    });

    //TODO: yêu cầu lấy tập bộ lọc khách hàng từ client
    socket.on('getCustomerFilterReq', function (data) {
        acdPublish.sendGetCustomerFilter(data.sid);
    });

    //TODO: yêu cầu khởi động lại quá trình đồng bộ dữ liệu khách hàng từ client
    socket.on('restartSync', function (data) {
        var syncCustomer = require(path.join(_rootPath, 'monitor', 'sync-customer.js'));
        syncCustomer.restartSync(data);
    });

    //TODO: yêu cầu tạm dừng quá trình đồng bộ dữ liệu khách hàng từ client
    socket.on('stopSync', function (data) {
        var syncCustomer = require(path.join(_rootPath, 'monitor', 'sync-customer.js'));
        syncCustomer.stopSync(data);
    });

    //TODO: các thao tác Queue Call Controll từ màn hình monitor
    socket.on('QueueCallControl', function (data) {
        console.log(134, data);
        switch (data.type) {
            case '1':
                acdPublish.sendDisconnectCall(data.agentID, data._id, data.channelID, _config.app._id);
                break;
            case '2':
                acdPublish.sendPickupCall(data.agentID, data._id, data.channelID, _config.app._id);
                break;
            case '4':
                acdPublish.sendListenCall(data.agentID, data._id, _config.app._id);
                break;
            case '5':
                acdPublish.sendWhisperCall(data.agentID, data._id, _config.app._id);
                break;
            case '6':
                acdPublish.sendJoinCall(data.agentID, data._id, _config.app._id);
                break;
        };
    });

    //TODO: các thao tác Group Call Controll từ màn hình monitor
    socket.on('GroupCallControl', function (data) {
        var agent = _socketUsers[data._id.toString()] ? _socketUsers[data._id.toString()].monitor : null;
        if (agent && agent.getCallID()) {
            switch (data.type) {
                case '1':
                    _.each(_socketUsers[data._id.toString()].sid, function (sid) {
                        var _clientSocket = sio.sockets.sockets[sid];
                        if (_clientSocket) _clientSocket.emit('DisconnectByLeader', {});
                    });
                    acdPublish.sendDisconnectCall(data.agentID, agent.getCallID(), agent.getChannelID(), _config.app._id);
                    break;
                case '2':
                    acdPublish.sendPickupCall(data.agentID, agent.getCallID(), agent.getChannelID(), _config.app._id);
                    break;
                case '3':
                    //agentID, toAgentID, toExtension, callID, option, tenant
                    var toAgent = _socketUsers[data.transAgent.toString()] ? _socketUsers[data.transAgent.toString()].monitor : null;
                    if (toAgent) acdPublish.sendTransferCall(data._id, data.transAgent, toAgent.getUserData().deviceID, agent.getCallID(), data.option, _config.app._id);
                    break;
                case '4':
                    acdPublish.sendListenCall(data.agentID, agent.getCallID(), _config.app._id);
                    break;
                case '5':
                    acdPublish.sendWhisperCall(data.agentID, agent.getCallID(), _config.app._id);
                    break;
                case '6':
                    acdPublish.sendJoinCall(data.agentID, agent.getCallID(), _config.app._id);
                    break;
            };
        }
    });

    //TODO: yêu cầu lấy dữ liệu agents của nhóm từ màn hình monitor
    socket.on('GetGroupAgents', function (groupId) {
        var groupMonitor = manager.getGroup(groupId);
        if (groupMonitor) {
            socket.emit('GetGroupAgents', groupMonitor.getAgentsData());
        }
    });

    //TODO: thao tác enable và disable trạng thái của agent trên queue từ monitor
    socket.on('QueueAgentStatus', function (message) {
        switch (message.status) {
            case 1:
                acdPublish.addQueueMember(message);
                break;
            case 2:
                acdPublish.removeQueueMember(message);
                break;
        }
    });

    //TODO: yêu cầu lấy danh sách agent phục vụ 1 queue từ màn hình monitor
    socket.on('GetQueueAgents', function (callId, user, serviceId) {
        var serviceMonitor = manager.getService(serviceId);
        if (serviceMonitor) {
            var agents = [];
            var fromAgent = null;
            var call = serviceMonitor.getCall(callId);
            if (call) fromAgent = serviceMonitor.getCall(callId).agentID;
            var serviceSkill = null;
            _async.waterfall([
                function (next) {
                    _Services.findById(serviceId, next);
                },
                function (service, next) {
                    serviceSkill = service.idSkill;
                    _Users.findById(user, next);
                },
                function (user, next) {
                    var aggs = [{
                        $match: {
                            _id: {
                                $in: _.pluck(user.agentGroupLeaders, "group")
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "groupprofiles",
                            localField: "idProfile",
                            foreignField: "_id",
                            as: "profile"
                        }
                    },
                    {
                        $unwind: "$profile"
                    },
                    {
                        $project: {
                            _id: 1,
                            skills: "$profile.skills"
                        }
                    },
                    {
                        $match: {
                            skills: {
                                $elemMatch: {
                                    idSkill: serviceSkill
                                }
                            }
                        }
                    },
                    ];
                    _AgentGroups.aggregate(aggs, next);
                },
                function (ags, next) {
                    _Users.find({
                        $and: [{
                            _id: {
                                $ne: user
                            }
                        },
                        {
                            _id: {
                                $in: _.keys(_socketUsers)
                            }
                        },
                        {
                            $or: [{
                                agentGroupLeaders: {
                                    $elemMatch: {
                                        group: {
                                            $in: _.pluck(ags, '_id')
                                        }
                                    }
                                }
                            },
                            {
                                agentGroupMembers: {
                                    $elemMatch: {
                                        group: {
                                            $in: _.pluck(ags, '_id')
                                        }
                                    }
                                }
                            }
                            ]
                        }
                        ]
                    }, next);
                }
            ], function (err, result) {
                socket.emit('GetQueueAgents', result, fromAgent);
            });
        }
    });

    // Sự kiện agent thay đổi setting
    socket.on('canGetOrder', function (bundle) {
        orderMonitor.changeStatus(bundle.agentId, bundle.status);
    });

    // Sự kiện lấy trạng thái lấy đơn hàng, trả lại đúng cho agent gọi
    socket.on('getOrderStatus', function (bundle) {
        socket.emit('getOrderStatus', {
            status: orderMonitor.getStatus(bundle.agentId)
        });
    });

    // Sự kiện thay đổi cài đặt order monitor
    socket.on("settingOrderMonitor", function (bundle) {
        orderMonitor.settingOrderMonitor(bundle.remain, bundle.delay);
    });

    // Sự kiện thay đổi cài đặt agent email monitor
    socket.on("updateEmailSetting", function (setting) {
        _AgentEmailStatus.update({}, setting, function (error, s) {
            console.log(error, s);
        });
    });

    // Sự kiện thay đổi trạng thái agent email
    socket.on("changeEmailStatus", function (data) {
        log.info("socket changeEmailStatus -------- ", data);
        if (!_socketUsers.hasOwnProperty(data.id)) return;

        var status = {
            status: data.value, // 0 : offline, 1 : online
            statusChange: _moment().unix()
        };

        _socketUsers[data.id].emailStatus = status;

        socket.broadcast.emit("agentChangeMailStatus", Object.assign({
            id: data.id
        }, status));

        // trungdt - fix lỗi khi agent chuyển trạng thái làm việc sang sẵn sàng phục vụ thì không route email cũ
        if (data.value == 0) return;

        var _spam = [];
        _async.waterfall([
            function (next) {
                _Mail.count({ "agent": null, "mail_type": 2 }, function (err, result) {
                    return next(result > 0 ? null : "Không có email mới");
                });
            },
            function (next) {
                _MailSpam.distinct('emails_spam', { user_id: data.id }, (err, result) => {
                    if (!err) _spam = result;
                    next();
                });
            },
            function (next) {
                _Mail.aggregate([
                    { $match: { "agent": null, "mail_type": 2 } },
                    { $lookup: { from: "servicemails", localField: "service", foreignField: "_id", as: "service" } },
                    { $unwind: { path: "$service", preserveNullAndEmptyArrays: false } },
                    { $lookup: { from: "groupprofilemails", localField: "service.idCompany", foreignField: "idCompany", as: "service.groups" } },
                    { $unwind: { path: "$service.groups", preserveNullAndEmptyArrays: false } },
                    { $lookup: { from: "agentgroups", localField: "service.groups._id", foreignField: "idProfileMail", as: "service.groups.mails" } },
                    { $unwind: { path: "$service.groups.mails", preserveNullAndEmptyArrays: false } },
                    { $lookup: { from: "users", localField: "service.groups.mails._id", foreignField: "agentGroupMembers.group", as: "users" } },
                    { $lookup: { from: "users", localField: "service.groups.mails._id", foreignField: "agentGroupLeaders.group", as: "leaders" } },
                    // { $unwind: { path: "$users", preserveNullAndEmptyArrays: false } },
                    {
                        $match: {
                            $or: [
                                { "users._id": _.convertObjectId(data.id) },
                                { "leaders._id": _.convertObjectId(data.id) },
                            ]
                        }
                    }
                ], function (error, mails) {
                    if (error) log.error(error);
                    if (mails.length) {
                        var _mailBulk = mongoClient.collection("mails").initializeUnorderedBulkOp({ useLegacyOps: true });
                        var _totalNotify = 0;

                        _.each(mails, function (el) {
                            if (_spam.toString().indexOf(el.from) < 0) _totalNotify++;
                            _mailBulk.find({ _id: _.convertObjectId(el._id) }).update({ $set: { agent: _.convertObjectId(data.id) } });
                        })
                        _mailBulk.execute(function (err) {
                            if (!err) log.error(err);
                            if (_totalNotify > 0) socket.emit('MailComming', { total: _totalNotify });
                        });
                    }
                });
            }
        ], function (err) {
            if (!!err) log.error(err);
        });
    });

    // Sự kiện thay đổi cài đặt agent chat monitor
    socket.on("updateChatSetting", function (setting) {
        _AgentChatStatus.update({}, setting, function (error, s) {
            console.log(error, s);
        });
    });

    // Sự kiện thay đổi cài đặt agent voice monitor
    socket.on("updateVoiceSetting", function (setting) {
        _AgentVoiceStatus.update({}, setting, function (error, s) {
            console.log(error, s);
        });
    });

    // Sự kiện thay đổi trạng thái agent email
    socket.on("changeChatStatus", function (data) {

        if (!_socketUsers.hasOwnProperty(data.id)) return;

        var status = {
            status: data.value, // 0 : offline, 1 : online
            statusChange: _moment().unix()
        };

        _socketUsers[data.id].chatStatus = status;

        socket.broadcast.emit("agentChangeChatStatus", Object.assign({
            id: data.id
        }, status));

    });

    // Thay đổi trạng thái đang tương tác kênh email
    socket.on("EmailTuongTac", function (data) {
        if (!data || !data._id || !_socketUsers[data._id]) return;
        _socketUsers[data._id].emailTuongTac = data.status;
    });

    socket.on("updateEmailMonitorWarning", function (data) {
        _SettingMailWarning.update({ idUser: data.idUser }, data, function () {

        });
    });

    socket.on("updateChatMonitorWarning", function (data) {
        _SettingChatWarning.update({ idUser: data.idUser }, data, function () {

        });
    });
};