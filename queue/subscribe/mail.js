
var mkdirp = require('mkdirp');
var fs = require('fs');
var request = require('request');

const _ERROR = {
    NONE: null,
    NOSKILL: { code: 1, description: 'Không có skill' },
    SKILLNOTINGROUP: { code: 2, description: 'Skill không thuộc nhóm nào' },
    NOAGENTMACTH: { code: 3, description: 'Không có agent phù hợp' },
    NOAGENTONLINE: { code: 4, description: 'Không có agent online' },
    AGENTMACTHED: { code: 5, description: 'Đã tìm thấy' },
};

const _Rules = [
    {
        name: 'Skill Priority', route: 1,
        s: function (_mail, agents, next) {
            _TicketsMail.aggregate([
                { $match: { "status": 2, "idAgent": { $in: agents } } },
                { $group: { "_id": "$idAgent", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ], function (err, a) {
                if (err) return next(err, _mail);
                try {
                    _mail.agent = a[0]._id;
                    next(_ERROR.AGENTMACTHED, _mail);
                } catch (e) {
                    _mail.agent = null;
                    next(_ERROR.NOAGENTMACTH, _mail);
                }
            });
        }
    },
    {
        name: 'Agent Performance', route: 2,
        s: function (_mail, agents, next) {
            _TicketsMail.aggregate([
                { $match: { "idAgent": { $in: agents } } },
                { $group: { "_id": "$idAgent", count: { $sum: { $cond: [{ $eq: ["$status", 2] }, 1, 0] } } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ], function (err, a) {
                if (err) return next(err, _mail);
                try {
                    _mail.agent = a[0]._id;
                    next(_ERROR.AGENTMACTHED, _mail);
                } catch (e) {
                    _mail.agent = null;
                    next(_ERROR.NOAGENTMACTH, _mail);
                }
            });
        }
    },
    {
        name: 'Random', route: 3,
        s: function (_mail, agents, next) {
            _mail.agent = _.sample(agents);
            next(_ERROR.AGENTMACTHED, _mail);
        }
    }
];

const _sortRules = function (mail) {
    var _w = _.findWhere(_Rules, { route: mail.route });
    var _arrR = [_w.s];
    _.each(_.without(_Rules, _w), function (s, i) {
        _arrR.push(s.s);
    });
    return _arrR;
}

const sendToClient = function (s, sids, name, val) {
    sids.forEach(function (sid) {
        s.socket(sid).emit(name, val);
    });
};

var _skillMails = {};

console.log(_.trim('/queue/mail/tenant-' + _config.app._id));
var ternalPrefix = _config.activemq.queueName;

module.exports = function (client, sessionId) {
    _SkillsMail.aggregate([
        { $match: { "status": 1 } },
        { $lookup: { from: "groupprofilemails", localField: "idCompany", foreignField: "idCompany", as: "groups" } },
        { $unwind: { path: "$groups" } },
        { $lookup: { from: "agentgroups", localField: "groups._id", foreignField: "idProfileMail", as: "agentgroups" } },
        { $project: { "skillName": 1, "idCompany": 1, "groups._id": 1, "groups.name": 1, "agentgroups.name": 1, "agentgroups._id": 1 } },
        { $group: { "_id": { "_id": "$_id", "groups": "$groups.name", "skillName": "$skillName", agentgroups: "$agentgroups" } } },
    ], function (error, skills) {
        _skillMails = _.chain(skills).reduce(function (memo, k) {
            memo[k._id._id] = {
                group: k._id.groups,
                skillName: k._id.skillName,
                agentsGroup: _.chain(k._id.agentgroups).map(function (v) {
                    return v._id;
                }).value()
            };
            return memo;
        }, {}).value();
    });

    client.subscribe(_.trim('/queue/mail/tenant-' + _config.app._id + '/MailResponse'), function (body, header) {
        var a = JSON.parse(body);
        var setting = { agent: null, mailId: null, campaign: null };
        try {
            var s = (/dft-start-config(.*?)dft-end-config/i.exec(a.body_raw)[1]).split('-');
            setting = { agent: _.convertObjectId(_.trim(s[1])) || null, mailId: _.convertObjectId(_.trim(s[2])) || null, campaign: _.convertObjectId(_.trim(s[3])) || null };
        } catch (e) {
            console.log(41, a.body_raw);
            console.log(40, e);
            log.debug(e)
        }
        _async.parallel({
            updateMail: function (next) {
                _Mail.findByIdAndUpdate(setting.mailId, { err_message: a.error, process_date: Date.now() }, { new: true, upsert: false }, next);
            },
            updateCampaign: function (next) {
                if (!_.isNull(setting.campaign)) {
                    _MailCampaigns.findByIdAndUpdate(setting.campaign, { $inc: { completed: 1 } }, { new: true, upsert: false }, next);
                } else {
                    next(null, null);
                }
            }
        }, function (error, result) {
            if (!error && !_.isNull(setting.agent) && _.has(_socketUsers, setting.agent)) {
                if (_.has(result, 'updateMail') && !_.isNull(result.updateMail)) sendToClient(sio.sockets, _socketUsers[String(setting.agent)].sid, 'MailSentResponse', { id: result.updateMail._id, title: result.updateMail.subject, error: a.error });
                //if (_.has(result, 'updateCampaign') && !_.isNull(result.updateCampaign)) sendToClient(sio.sockets, _socketUsers[String(setting.agent)].sid, 'MailCampaignsUpdated', result.updateCampaign);

            }
            sio.sockets.emit('MailCampaignsUpdated', result.updateCampaign);
        });

    });

    client.subscribe('/queue/' + _config.app._id + '-MailComming', function (body, header) {
        var _mail = JSON.parse(body);
        var setting = { agent: null, mailId: null, campaign: null };
        log.info('\n----------------------------------------have a new mail -------------------------------------', _mail.subject);
        // //Try to get setting from new mail
        // try {
        //     var s = _mail.extra;//(/dft-start-config(.*?)dft-end-config/i.exec(_mail.body_raw)[1]).split('-');
        //     setting = {agent: s[1] || null, mailId: s[2] || null, campaign: s[3] || null};
        // } catch (e) {
        //     console.log(41, _mail.body_raw);
        //     console.log(40, e);
        //     log.debug(e);
        // }
        _mail.readed = 0;
        _mail.status = 0;
        _mail.type = 2;

        //if (setting.campaign) _.mail.campaign = setting.campaign;

        _mail["_id"] = new mongoose.Types.ObjectId();
        // _mail["attachments"] = [];
        _async.waterfall([
            function (next) {
                // trungdt - lấy file đính kèm từ core lưu về CRM qua HTTP
                _async.eachSeries(_mail.attachments, (el, cb) => {
                    var uri = `http://${_config['core-app'].ip}:${_config['core-app'].port}/assets/uploads/attachments/${el}`;
                    request.head(uri, function (err, httpResponse, body) {
                        if (!!err) log.error(err);
                        if (!!err) return cb();
                        request(uri)
                            .pipe(fs.createWriteStream(path.join(_rootPath, "assets", "uploads", "attachments", el)))
                            .on('close', function () {
                                cb();
                            });
                    });
                }, function (err) {
                    if (!!err) log.error(err);
                    next();
                })
            },
            // function (next) {
            //     if (!_.has(_mail, "raw_attachments") || !_mail.raw_attachments.length) return next(null);
            //     //console.log("\n--------------------------------------------------------------------\n " + 172, _mail.raw_attachments, "\n--------------------------------------------------------------------\n ")
            //     fsx.mkdirs(path.join(_rootPath, "assets", "uploads", "attachments", _mail["_id"].toString()), function (error) {
            //         if (error) return next(error);
            //         _async.eachSeries(_mail.raw_attachments, function (file, _next) {
            //             var _fileName = file.name.replace(/[?=/]/g, '');
            //             fs.writeFile(path.join(_rootPath, "assets", "uploads", "attachments", _mail["_id"].toString(), _fileName), file.data, "base64", function (err) {
            //                 if (err) return next(err);
            //                 _mail["attachments"].push("/assets/uploads/attachments/" + _mail["_id"].toString() + "/" + _fileName)
            //                 _next(null);
            //             });
            //         }, next);
            //     });
            // },
            function (next) {
                //kiem tra xem co agent nao dang phuc vu mail do va agent do dang online thi route luon
                //truong hop nay danh cho mail reply
                if (!_.isNull(setting.agent) || _.has(_socketUsers, setting.agent)) {
                    _mail.agent = setting.agent;
                    console.log(170, _mail);
                    next(_ERROR.AGENTMACTHED, _mail);
                }
                //neu ko co agent nao online thi pending va route lai sau
                else if (_.isNull(_socketUsers) || _.isEmpty(_socketUsers)) {
                    console.log(175, _socketUsers);
                    _mail.status = 6;
                    log.debug("NOAGENTONLINE");
                    next(_ERROR.NOAGENTONLINE, _mail);
                }
                else {
                    _mail.agent = null;
                    if (_.has(_mail, 'skill') && _.has(_skillMails, _mail.skill)) {
                        //kiem tra xem skill co trong nhom nao hay khong
                        if (_skillMails[_mail.skill].agentsGroup) {
                            //tim cac agent trong nhom
                            var _query = { "$or": [{ "agentGroupMembers.group": { "$in": _skillMails[_mail.skill].agentsGroup } }, { "agentGroupLeaders.group": { "$in": _skillMails[_mail.skill].agentsGroup } }] };
                            //neu co agent online thi dua them dieu kien vao

                            // start - trungdt - fix lỗi khi route tìm cả agent trạng thái làm việc = offline
                            var _onlineAgents = [];
                            _.each(_socketUsers, function (el, k) {
                                if (!el.emailStatus || el.emailStatus.status != 1) return;
                                _onlineAgents.push(k);
                            });
                            if (_.keys(_socketUsers).length > 0) _query['_id'] = { "$in": _.arrayObjectId(_onlineAgents) };
                            // end - trungdt - fix lỗi khi route tìm cả agent trạng thái làm việc = offline 

                            _Users.aggregate([{ $match: _query }, { $project: { '_id': 1, 'name': 1 } }], function (error, agents) {
                                if (error) return next(error, _mail);
                                //neu khong co agent online thi luu lai de route sau
                                if (_.isNull(agents) || _.isUndefined(agents) || _.isEmpty(agents)) {
                                    _mail.status = 5;
                                    log.debug("NOAGENTMACTH", _mail);
                                    next(_ERROR.NOAGENTMACTH, _mail);
                                }
                                //neu chi co 1 agent trong ket qua tra ve thi route luon
                                else if (_.isEqual(agents.length, 1)) {
                                    _mail.agent = agents[0]._id;
                                    next(_ERROR.AGENTMACTHED, _mail);
                                }
                                //neu co nhieu hon 1 agent tra ve thi dua vao luat route
                                else {
                                    next(_ERROR.NONE, _mail, _.chain(agents).map(function (a) {
                                        return _.pick(a, '_id')._id;
                                    }).value());
                                }
                            });
                        }
                        //skill khong thuoc nhom nao
                        else {
                            _mail.status = 6;
                            log.debug("SKILLNOTINGROUP", _mail);
                            next(_ERROR.SKILLNOTINGROUP, _mail);
                        }
                    }
                    else {
                        //mail khong skill
                        //kha nang do service mail da bi xoa
                        _mail.status = 6;
                        log.debug("NOSKILL", _mail);
                        next(_ERROR.NOSKILL, _mail);
                    }
                }
            }
        ].concat(_sortRules(_mail)), function (error, m) {
            _Mail.create(error ? _mail : result, function (error, nm) {
                if (_.has(m, 'agent') && !_.isNull(m.agent)) {
                    _MailSpam.distinct('emails_spam', { user_id: m.agent }, (error2, result) => {
                        if (!result || !!error2 || result.toString().indexOf(m.from) >= 0) return;
                        m._id = nm._id;
                        m.created = _moment()._d;
                        sendToClient(sio.sockets, _socketUsers[m.agent].sid, 'MailComming', m);
                    });
                }
            });
        });
    });

    client.subscribe('/queue/' + _config.app._id + '/MailTestResponse', function (data, headers) {
        var dataObj = JSON.parse(data);
        sio.to(dataObj.socketId).emit("testConnectionResponse", dataObj);
    });

}