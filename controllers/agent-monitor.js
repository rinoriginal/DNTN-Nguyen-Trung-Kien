// GET
exports.index = {
    // json: function (req, res) {
    //     var _query = req.query;
    //     _Users.find(_query, function (error, users) {
    //         res.json(users);
    //     });
    // },
    html: function (req, res) {
        log.debug(_socketUsers);
        _Users.find({
            // agentGroupMembers: {
            //     $exists: true
            // },
            // $where: "this.agentGroupMembers.length > 0"
        }, {
                "name": 1,
                "displayName": 1
            }).lean().exec(function (error, users) {
                _async.eachSeries(users, function (user, next) {
                    user.isOnline = Number(_socketUsers.hasOwnProperty(user._id));

                    //Email
                    user.emailStatus = _socketUsers[user._id] ? _socketUsers[user._id].emailStatus.status : 0;
                    user.emailStatusChange = _socketUsers[user._id] ? _socketUsers[user._id].emailStatus.statusChange : _moment().unix();

                    //Chat
                    user.chatStatus = _socketUsers[user._id] ? _socketUsers[user._id].chatStatus.status : 0;
                    user.chatStatusChange = _socketUsers[user._id] ? _socketUsers[user._id].chatStatus.statusChange : _moment().unix();

                    //Voice
                    user.voiceStatus = _socketUsers[user._id] ? _socketUsers[user._id].voiceStatus.status : 0;
                    user.voiceStatusChange = _socketUsers[user._id] ? _socketUsers[user._id].voiceStatus.statusChange : _moment().unix();

                    next();
                }, function (err) {
                    _async.parallel({
                        mail: function (pCallback) {
                            _async.waterfall([
                                function (callback) {
                                    _AgentEmailStatus.findOne({}, callback);
                                },
                                function (setting, callback) {
                                    if (setting) return callback(null, setting);
                                    _AgentEmailStatus.create({
                                        agent: 30,
                                        online: 30,
                                        offline: 90
                                    }, callback);

                                }
                            ], function (wErr, wResult) {
                                pCallback(wErr, wResult);
                            })
                        },
                        chat: function (pCallback) {
                            _AgentChatStatus.findOne({}, function (queryError, agent) {
                                if (queryError) log.error(queryError);
                                if (agent)
                                    pCallback(null, agent);
                                else {
                                    _AgentChatStatus.create({
                                        agent: 30,
                                        online: 30,
                                        offline: 90
                                    }, pCallback);
                                }
                            });
                        },
                        voice: function (next) {
                            _AgentVoiceStatus.findOne({}, function (queryError, agent) {
                                if (queryError) log.error(queryError);
                                if (agent)
                                    next(null, agent);
                                else {
                                    _AgentVoiceStatus.create({
                                        agent: 30,
                                        san_sang_phuc_vu: 90,
                                        khong_san_sang_phuc_vu: 90,
                                        nghi_trua: 90,
                                        meeting: 90,
                                        autodialing: 90
                                    }, next);
                                }
                            });
                        },
                        voiceStatus: function(next) {
                            // Truy vấn trạng thái làm việc agent
                            _AgentStatus.find({status: 1}, next);
                        },
                    }, function (error, setting) {
                        _.render(req, res, 'agent-monitor', {
                            title: 'Bảng giám sát agent',
                            agents: users,
                            emailSettings: setting.mail,
                            chatSettings: setting.chat,
                            voiceSettings: setting.voice,
                            voiceStatus: setting.voiceStatus,
                            plugins: [
                                ['bootstrap-select']
                            ]
                        }, true, error);
                    });


                });
            });
    }
};