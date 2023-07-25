exports.create = function (req, res) {

    if (!req.session || !_.has(req.session, 'user')) return res.json({ code: 500, data: { message: "Lỗi phân quyền" } });

    // trungdt - mảng _ids chứa id của agents và groups được chọn
    var _ids = !!req.body['agent'] ? req.body['agent'].split(',').map(el => _.convertObjectId(el)) : [];
    if (_ids.length == 0) return res.json({ code: 200 });
    var _agents = [];
    var _mail = null;
    var _newMails = [];
    var _newTickets = [];

    _async.waterfall([
        next => {
            _Mail.findOne({ _id: req.body['mail'] }).lean().exec((err, result) => {
                if (!result) next({ message: "Email không tồn tại" });
                _mail = result;
                next(err);
            });
        },
        next => {
            // trungdt - lấy danh sách agent được forward từ danh sách agents và groups
            _Users.find({
                $or: [
                    { _id: { $in: _ids } },
                    { 'agentGroupLeaders.group': { $in: _ids } },
                    { 'agentGroupMembers.group': { $in: _ids } }
                ],
                _id: { $ne: req.session.user._id }
            }).lean().exec((err, result) => {
                _agents = result;
                next(err);
            });
        },
        next => {
            _async.eachSeries(_agents, (el, cb) => {
                var _new = _.clone(_mail);
                delete _new['_id'];
                _new['agent'] = el._id;
                _new['subject_raw'] = 'Fwd:' + _new['subject_raw'];
                _new['subject'] = _new['subject_raw'];
                _new['created'] = new Date();
                _new['date_forward'] = new Date();
                _new['readed'] = 0;
                _Mail.create(_new, err => {
                    if (!err) sendToClient(sio.sockets, _new.agent + '', 'MailComming', _new);
                    cb(err);
                });
            }, err => {
                next(err);
            });
        }
    ], err => {
        if (!!err) log.error(err);
        res.json({ code: !err ? 200 : 500, data: !err ? "Thành công" : err });
    });
};

var sendToClient = function (s, agent, name, val) {
    var sids = !!_socketUsers[agent] ? _socketUsers[agent].sid : [];
    sids.forEach(function (sid) {
        s.socket(sid).emit(name, val);
    });
};
