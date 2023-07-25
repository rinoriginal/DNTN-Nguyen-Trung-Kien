// GET
exports.index = {

    html: function (req, res) {

        _async.parallel({
            companies: function (next) {
                _Company.find({}, next);
            },
            campaigns: function (next) {
                _Campains.find({}, next);
            },
            voiceServices: function (next) {
                _Services.find({}, next);
            },
            chatServices: function (next) {
                _ServicesChat.aggregate([
                    { $lookup: { from: "companychannels", localField: "idChannel", foreignField: "_id", as: "channel" } },
                    { $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } }
                ], next);
            },
            mailServices: function (next) {
                _ServicesMail.find({}, next);
            },
        }, function (err, result) {
            _.render(req, res, 'realtime-supervision', {
                title: 'REALTIME SUPERVISION',
                companies: result.companies,
                campaigns: result.campaigns,
                voiceServices: result.voiceServices,
                chatServices: result.chatServices,
                mailServices: result.mailServices,
                settings: {},
                plugins: [
                    ['bootstrap-select']
                ]
            }, true, err);
        });
    }
};