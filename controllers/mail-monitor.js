// GET
exports.index = {

    html: function (req, res) {

        if (!!req.query.agent) {
            var _queryTime = moment().startOf('day').toDate();

            _async.waterfall([
                function (next) {
                    _Mail.find({
                        agent: req.query.agent,
                        mail_type: 1,
                        bodyLength: { $gte: req.query.bodyLength },
                        created: { $gte: _queryTime }
                    }).exec(next);
                }
            ], function (err, result) {
                res.json({ code: (err ? 500 : 200), message: err ? err : result });
            });
            return;
        }

        var mailManager = require(path.join(_rootPath, 'monitor', 'mail-manager.js'));

        var _companyIds = [];
        var _warningSetting = {};

        _async.waterfall([
            function (next) {
                if (!req.session.user) return next("Không lấy được thông tin đăng nhập của người dùng");
                _SettingMailWarning.findOne({
                    idUser: req.session.user._id
                }, function (err, result) {
                    if (!!err) return next(err);
                    _warningSetting = result;
                    if (!!result) return next();

                    _warningSetting = {
                        idUser: req.session.user._id,
                        thoiGianPhanHoiMail: 30,
                        soLuongKyTuTrongMail: 30,
                        soLuongAgentOffline: 5
                    };
                    _SettingMailWarning.create(_warningSetting, function () {

                    });
                    next();
                })
            },
            function (next) {
                _SkillsMail.aggregate([
                    { $match: { "status": 1 } }
                ], next);
            },
            function (result, next) {
                _companyIds = _.map(result, function (el) {
                    return el.idCompany;
                });
                _Company.find({ _id: { $in: _companyIds } }, next);
            },
        ], function (err, companies) {
            var obj = {};
            _.each(mailManager.getAgents(), function (el) {
                if (!el._id) return;
                obj[el._id] = {
                    _id: el._id,
                    displayName: el.displayName,
                    idCompany: !!obj[el._id] ? (obj[el._id].idCompany + el.idCompany) : (el.idCompany + '')
                };
            });
            var agents = [];
            _.each(obj, function (el) {
                agents.push(el);
            })

            _.render(req, res, 'mail-monitor', {
                title: 'GIÁM SÁT HOẠT ĐỘNG KÊNH MAIL',
                agents: agents,
                companies: companies,
                settings: _warningSetting,
                plugins: [
                    ['bootstrap-select']
                ]
            }, true, err);
        });
    }
};