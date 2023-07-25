exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'scope')) {
            let { scope } = req.query;

            switch (scope) {
                case 'searchReason':
                    _TicketReasonCategory.aggregate([

                    ], function (err, result) {
                        res.json({
                            code: err ? 500 : 200,
                            data: result
                        });
                    })
                    break;
            }

        } else {
            res.json({
                code: 500
            });
        }
    },
    html: async function (req, res) {
        try {
            let config = await _Config.findOne({});
            let survey;
            if(!config || (config && (!config.prefix || !config.ipCiscoReport))) survey = [];
            else survey = await getDialedNumberByPrefix(config);

            _.render(req, res, 'config-system', {
                title: 'CÀI ĐẶT',
                survey: survey,
                config: config,
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
            }, true);

        } catch (err) {
            console.log(err);
            _.render(req, res, '500', null, null, {title: `Có lỗi xảy ra`, message: `500 | ${err.message}`});
        }

        // _async.parallel({
        //     survey: function (next) {
                
        //     },
        //     config: function (next) {
        //         _Config.findOne({}, next)
        //     }
        // }, function (err, result) {
        //     if (err) return res.json({ message: err })
            
        // })

    }
}



exports.update = async function (req, res) {
    console.log(222);
    try {
    let { _id, survey, ipRecording, ipCiscoReport, tokenDefault, prefix, Agent_Team } = req.body
        let queryUpdate = {}
        let dataUpdate = {}
        
        if (survey && survey != '') {
            dataUpdate['survey.code'] = survey;
        }

        if (prefix && prefix != '') {
            dataUpdate['prefix'] = prefix;
        }
        
        if (ipRecording && ipRecording != '') {
            dataUpdate['ipRecording'] = ipRecording;
        }

        if (ipCiscoReport && ipCiscoReport != '') {
            dataUpdate['ipCiscoReport'] = ipCiscoReport;
        }

        if (tokenDefault && tokenDefault != '') {
            dataUpdate['tokenDefault'] = tokenDefault;
        }

        if (Agent_Team && Agent_Team != '') {
            dataUpdate['Agent_Team'] = Agent_Team;
        }

        if(_id) {
            // tạo survey
            queryUpdate._id =  _.convertObjectId(_id);
            dataUpdate.updateBy = _.convertObjectId(req.session.user._id);
            dataUpdate.updated = moment()._d;
        }else {
            dataUpdate.createBy = _.convertObjectId(req.session.user._id);
            dataUpdate.created = moment()._d;
        }

        let result = await _Config.findOneAndUpdate(queryUpdate, dataUpdate, {upsert: true});

        // console.log(result);
        res.json({ code: 200, message: 'success' });

    } catch (err) {
        res.json({ code: 500, message: err.message });
    }
}

/**
 * query lên cisco lấy trạng thái của agent
 * @param {*} req 
 * @param {*} res 
 */
var getDialedNumberByPrefix = function (config) {
    return new Promise(async (resolve, reject) => {
        let pathApi = config.ipCiscoReport + "/api/v1/survey/getDialedNumberByPrefix?Prefix=" + config.prefix; //server

        let option = {
            rejectUnauthorized: false,
            headers: {
                "x-access-token": config.tokenDefault,
            },
            json: true
        }
        _request.get(pathApi, option, function (err, response, body) {
            console.log('ERR GET SURVEY', err);
            if (!err && (response && response.statusCode == 200)) {
                resolve(body.data.recordset);
            } else {
                console.log(err);
                resolve([]);
            }
        });
    });
}