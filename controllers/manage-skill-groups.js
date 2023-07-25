const { updateAgentsToSkillGroup } = require('../commons/CiscoAPI');

exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var sort = _.cleanSort(req.query, '');
        var aggregate = _SkillGroups.aggregate([
            { $match: { status: 1 } }
        ]);
        _SkillGroups.aggregatePaginate(aggregate, { page: page, limit: rows }, function (error, ar, pageCount, count) {
            var paginator = new pagination.SearchPaginator({
                prelink: '/manage-skill-groups',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            res.json({ code: error ? 500 : 200, data: ar, paging: paginator.getPaginationData() });
        });
    },
    html: function (req, res) {
        _.render(req, res, 'manage-skill-groups', {
            title: 'Danh sách nhóm kỹ năng',
            plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker']]
        }, true);
    }
}

exports.new = function (req, res) {
    _async.waterfall([
        function (next) {
            getSkillGroupFromCisco(next)
        }
    ], function (error, result) {
        _.render(req, res, 'skill-group-new', {
            result: result,
            title: 'Tạo mới nhóm kỹ năng',
            plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
        }, true, error);
    });


};

exports.edit = function (req, res) {
    _async.parallel({
        data: function (callback) {
            _SkillGroups.findById(req.params['manageskillgroup']).exec(function (err, r) {
                if (_.isNull(r)) return callback(new Error("Nhóm kỹ năng không tồn tại hoặc đã bị xóa bỏ"), r);
                return callback(err, r);
            });
        },
        skillgroup: function (callback) {
            getSkillGroupFromCisco(callback);
        }
    },
        function (err, results) {
            _.render(req, res, 'skill-group-edit', {
                results: results,
                title: 'Chỉnh sửa nhóm kỹ năng',
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
            }, true, err);
            // res.json({ code: err ? 500 : 200, message: err ? err.message : 'OK', data: results.data });
        });
};

exports.destroy = function (req, res) {
    _async.waterfall([
        function (next) {
            _AgentGroups.find({ idSkillGroups: req.params.manageskillgroup }, function (err, result) {
                if (result.length) return next(new Error('Nhóm kỹ năng đang được dùng. Không thể xóa nhóm này.'))
                else return next(null, null)
            })
        }, function (data, next) {
            _SkillGroups.findByIdAndUpdate(req.params.manageskillgroup, { $set: { status: 0 } }, { new: true }, next)
        }
    ], function (error, data) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : data });
    })
};

exports.create = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;

    if (!_.has(req.body, 'name')) {
        validateErr = new Error('Vui lòng nhập tên kỹ năng');
    }
    if (!_.has(req.body, 'listSkills')) {
        validateErr = new Error('Vui lòng chọn skill');
    }
    req.body['createdBy'] = req.session.user._id;

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _SkillGroups.create(req.body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới nhóm kỹ năng thành công!' });
    });

};

exports.update = function (req, res) {
    var validateErr = null;
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    req.body['updatedBy'] = req.session.user._id;
    req.body['updatedAt'] = new Date();

    if (!_.has(req.body, 'name')) {
        validateErr = new Error('Vui lòng nhập tên kỹ năng');
    }
    if (!_.has(req.body, 'listSkills')) {
        validateErr = new Error('Vui lòng chọn skill');
    }

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _SkillGroups.findById(req.params.manageskillgroup, callback);
        },
        function (r, callback) {
            _SkillGroups.findByIdAndUpdate(req.params.manageskillgroup, { $set: req.body }, callback);
        }, function (e, callback) {
            if (!req.body.members) return callback(null)
            let listMember = req.body.members.split(',')
            // mỗi khi thêm skill group vào agent thì update lại agent vào skill mới thêm
            updateAgentToMultiSkillGroup(listMember, req.body.listSkills, req.params.manageskillgroup, callback)
        }
    ], function (err, data) {
        res.json({ code: (err ? 500 : 200), message: err ? err.message : 'Cập nhật nhóm kỹ năng thành công!' });
    })
};

/**
 * fun thực hiên chức năng update agent vào nhiều skill
 * @param {* list agent update} agentsTelehub 
 * @param {* list skill} listPeripheral 
 * @param {*} callback 
 * @returns 
 */
function updateAgentToMultiSkillGroup(agentsTelehub, listPeripheral, idGroup, callback) {
    try {
        _async.eachSeries(listPeripheral, function (peripheral, cb) {
            _async.waterfall([
                // Lấy danh sách skill group trong công ty
                function (next) {
                    getSkillGroupFromCisco(next);
                },
                // lấy thông tin của skill group
                function (data, next) {
                    let skillGroup = data.filter((item) => {
                        return item.peripheralNumber == peripheral
                    })
                    next(null, data, skillGroup[0])
                },
                function (data, skillGroup, next) {
                    getAgentsFromCisco(null, function (err, result) {
                        next(err, result, skillGroup)
                    });
                },
                function (data, skillGroup, next) {
                    getListAgentFromCisco(data, agentsTelehub, function (err, result) {
                        next(err, result, skillGroup)
                    });
                },
                function (data, skillGroup, next) {
                    data.skillGroup = skillGroup;
                    updateAgentsToSkillGroup(data, next);
                },
                function (data, next) {
                    _SkillGroups.findByIdAndUpdate(idGroup, { listIdAgent: agentsTelehub }, { new: true }, next)
                }


            ], function (err, result) {
                cb()
            });
        }, function (err) {
            if (err) {
                console.log(`------- err ------- `);
                console.log(err);
                console.log(`------- err ------- `);
                callback(err);
            }
            callback(null, 'Cập nhật thành công!')
        })

    } catch (error) {
        console.log(`------- error ------- `);
        console.log(error);
        console.log(`------- error ------- `);
        callback(error);
    }
}

// Lấy tất cả các agent có trong công ty
function getAgentsFromCisco(idSkillGroup, callback) {
    _async.waterfall([
        // Lấy config trong BD
        function (next) {
            _Config.findOne({}, next);
        },
        function (data, next) {
            if (!data || (data && (!data.prefix || data.prefix == ''))) {
                return next(new Error('Chưa setup config prefix'));
            }
            let pathApi = `${data.ipCiscoReport}/api/v1/agent/agent-by-company?prefix=${data.prefix}`;

            let option = {
                rejectUnauthorized: false,
                headers: {
                    "x-access-token": data.tokenDefault,
                },
                json: true
            }

            if (idSkillGroup && idSkillGroup != '') {
                pathApi += `&idSkillGroup=${idSkillGroup}`
            }

            _request.get(pathApi, option, function (err, response, body) {
                if (err) {
                    return next(err);
                }

                if (response && response.statusCode == 200) {
                    let agentsCisco = body.data;
                    return next(null, agentsCisco);
                }
            });
        },
    ], callback);
}

var getListAgentFromCisco = function (agentsCisco, agentsTelehub, callback) {
    try {
        let listAgentCisco = [];

        let listAgentTelehub = agentsTelehub.filter(agentTelehub => {
            let isCheckAgent = false;

            let idAgentCisco = agentTelehub.split('-')[1];

            for (let item of agentsCisco) {
                if (item.agentId == idAgentCisco) {
                    listAgentCisco.push(item)
                    isCheckAgent = true;
                    break;
                }
            }
            if (isCheckAgent) {
                return agentTelehub;
            }
        })

        let listAgentIdTelehub = listAgentTelehub.map((el) => {
            return el.split('-')[0];
        })

        let data = {
            listAgentFromTelehub: _.arrayObjectId(listAgentIdTelehub),
            listAgentForSkillGroup: listAgentCisco,
        }
        callback(null, data)
    } catch (error) {
        callback(error);
    }
}
// Lấy ra các Skill group trên cisco
function getSkillGroupFromCisco(callback) {
    _async.waterfall([
        function (next) {
            _Config.findOne({}, next);
        },
        function (data, next) {
            if (!data || (data && (!data.prefix || data.prefix == ''))) {
                return next(new Error('Chưa setup config prefix'));
            }
            let pathApi = `${data.ipCiscoReport}/api/v1/skillGroup/skill-group-by-company?prefix=${data.prefix}`;

            let option = {
                rejectUnauthorized: false,
                headers: {
                    "x-access-token": data.tokenDefault,
                },
                json: true
            }

            _request.get(pathApi, option, function (err, response, body) {
                if (err) {
                    return next(err);
                }
                return next(null, body.data);
            });
        },
    ], callback);
}