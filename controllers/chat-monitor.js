// GET
exports.index = {

    html: function (req, res) {


        var chatManager = require(path.join(_rootPath, 'monitor', 'chat-manager.js'));

        var _companies = [];
        var _warningSetting = {};

        _async.waterfall([
            function (next) {
                if (!req.session.user) return next("Không lấy được thông tin đăng nhập của người dùng");
                _SettingChatWarning.findOne({
                    idUser: req.session.user._id
                }, function (err, result) {
                    if (!!err) return next(err);
                    _warningSetting = result;
                    if (!!result) return next();

                    _warningSetting = {
                        idUser: req.session.user._id,
                        thoiGianChat: 30,
                        soLuongMessage: 30,
                        soLuongAgentOffline: 5,
                        soLuongTinNhanDoVaoHeThong: 5,
                        soLuongChatCho: 5,
                        tylePhucVu: 5
                    };
                    _SettingChatWarning.create(_warningSetting, function () {

                    });
                    next();
                })
            },
            function (next) {
                _SkillsChat.aggregate([
                    { $match: { "status": 1 } }
                ], next);
            },
            function (result, next) {
                var _companyIds = _.map(result, function (el) {
                    return el.idCompany;
                });
                _Company.find({ _id: { $in: _companyIds } }, next);
            },
            function (result, next) {
                _companies = result;
                _ServicesChat.aggregate([
                    { $lookup: { from: "companychannels", localField: "idChannel", foreignField: "_id", as: "channel" } },
                    { $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } }
                ], next);
            }
        ], function (err, services) {
            log.info("_warningSetting ---------------- ", _warningSetting);
            _.render(req, res, 'chat-monitor', {
                title: 'GIÁM SÁT HOẠT ĐỘNG KÊNH CHAT',
                companies: _companies,
                settings: _warningSetting,
                services: services,
                agents: chatManager.getAgents(),
                plugins: [
                    ['bootstrap-select']
                ]
            }, true, err);
        });
    }
};