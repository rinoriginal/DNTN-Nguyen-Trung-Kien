const { updateAgentsToSkillGroup } = require('../commons/CiscoAPI');

exports.edit = function (req, res) {
    _async.parallel({
        // Query group muốn edit
        agentGroup: function (callback) {
            _async.waterfall([
                // Lấy agent có trong skill group
                function (next) {
                    getAgentsFromCisco(req.params.manageagentskill.split('-')[1], function (err, agentsCisco) {
                        if (err) return next(err);
                        return next(null, { agentsCisco });
                    });
                },
                // Lấy ra agent có trong Telehub
                function (data, next) {
                    mapAgent(data.agentsCisco, function (err, agents) {
                        if (err) return next(err);
                        let agentsId = agents.map((element) => {
                            return `${element._id}-${element.idAgentCisco}`
                        })
                        return next(null, { ...data, agentsId })
                    });
                },
            ], function (err, result) {
                if (err) return callback(err);
                return callback(null, result)
            });
        },
        // Query agent
        agent: function (callback) {
            getAgentsFromCisco(null, function (err, agents) {
                if (err) return callback(err);
                mapAgent(agents, callback);
            });
        },
    }, function (error, result) {
        return _.render(req, res, 'agent-skill-edit', {
            agentsSkillGroup: result.agentGroup.agentsId,
            agents: result.agent,
            peripheralNumber: req.params.manageagentskill.split('-')[1],
            idGroup: req.params.manageagentskill.split('-')[0],
            title: 'Sửa nhóm agent',
            plugins: [['bootstrap-duallistbox'], ['bootstrap-select']]
        }, true);
    })
};


exports.update = function (req, res) {
    let agentsTelehub = req.body.members;
    let listPeripheral = req.body.peripheralNumber.split(',')
    let idGroup = req.body.idGroup

    updateAgentToMultiSkillGroup(agentsTelehub, listPeripheral, idGroup, function (error, result) {
        return res.json({ code: error ? 500 : 200, message: error ? error.message : 'Cập nhật thành công!' });
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


        // var skillGroup = {
        //     skillGroupId: req.body.skillGroupId,
        //     peripheralNumber: req.body.peripheralNumber,
        //     changeStamp: req.body.changeStamp
        // }
        _async.eachSeries(listPeripheral, function (peripheral, cb) {
            _async.waterfall([
                // Lấy danh sách skill group trong công ty
                function (next) {
                    getSkillGroupFromCisco(next);
                },
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
                // update số lượng agent sử dụng skill group trong agent group
                function (data, next) {
                    _AgentGroups.update({ idSkillGroups: idGroup }, { members: data.listAgentFromTelehub }, { multi: true }, next)
                },
                function (data, next) {
                    _SkillGroups.findByIdAndUpdate(idGroup, { listIdAgent: agentsTelehub }, { new: true }, next)
                }
            ], function (err, result) {
                // if (err) {
                //     console.log(`------- err ------- `);
                //     console.log(err);
                //     console.log(`------- err ------- `);
                //     return res.json({ code: 500, message: err.message });
                // }
                // return res.json({ code: 200, message: 'Cập nhật thành công!' });
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
                next(new Error('Chưa setup config prefix'));
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

function mapAgent(agentsCisco, callback) {
    let query = {
        role: { $gt: 1 },
        idAgentCisco: { $ne: null },
        status: 1
    }
    _Users.find(query, function (err, result) {
        if (err) {
            return callback(err);
        }

        let agentsFilter = result.filter(agenTele => {
            let checkAgent = false;
            for (let agentCis of agentsCisco) {
                if (agenTele.idAgentCisco == agentCis.agentId) {
                    checkAgent = true;
                }
            }
            if (checkAgent) {
                return agenTele;
            }
        });
        return callback(null, agentsFilter);
    });
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

    let configCisco = _config.cisco.apiCisco;

    let option = {
        rejectUnauthorized: false,
        headers: {
            "x-access-token": configCisco.token,
        },
        json: true
    }

    _async.waterfall([
        function (next) {
            _Config.findOne({}, next);
        },
        function (data, next) {
            if (!data || (data && (!data.prefix || data.prefix == ''))) {
                next(new Error('Chưa setup config prefix'));
            }
            let pathApi = `${configCisco.ip}/api/v1/skillGroup/skill-group-by-company?prefix=${data.prefix}`;

            _request.get(pathApi, option, function (err, response, body) {
                if (err) {
                    next(err);
                }
                next(null, body.data);
            });
        },
    ], callback);
}