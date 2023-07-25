

// GET
exports.index = {
  json: function (req, res) {
    try {
      // Lấy danh sách agent với skill group
      if (req.query.type == 'getAgentBySkillGroup' && req.query.idSkillGroup) {
        getAgentsFromCisco(req.query.idSkillGroup, function (err, agents) {
          if (err) {
            throw err;
          }
          mapAgent(agents, function (err, result) {
            if (err) {
              throw err;
            }
            return res.json({ code: 200, data: result });
          });
        })
      }else{
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = _.cleanRequest(req.body);

        var sortQuery = {};
        if (!_.isUndefined(req.query['sortField']))
          sortQuery[req.query['sortField']] = _.isEqual(req.query['sortValue'], 'asc') ? 1 : -1
        if (_.has(req.query, 'search_name') && req.query.search_name)
          query.name = { $regex: new RegExp(_.stringRegex(req.query.search_name)), $options: 'gi' };
        if (_.has(req.query, 'search_company') && req.query.search_company)
          query.idParent = new mongoose.Types.ObjectId(req.query.search_company);

        var _query2 = req.session.auth.company ? (req.session.auth.company.group ? (req.session.auth.company.group.leader ? { _id: new mongodb.ObjectId(req.session.auth.company.group._id) } : { status: 9999 }) : { idParent: new mongodb.ObjectId(req.session.auth.company._id) }) : {};
        var agg = _AgentGroups.aggregate([
          { $match: query  },

          { $lookup: { from: 'users', localField: 'leaders', foreignField: '_id', as: 'leaders' } },
          { $lookup: { from: 'users', localField: 'members', foreignField: '_id', as: 'members' } },
          { $lookup: { from: 'companies', localField: 'idParent', foreignField: '_id', as: 'parent' } },
          { $lookup: { from: 'groupprofiles', localField: 'idProfile', foreignField: '_id', as: 'profile' } },
          { $lookup: { from: 'groupprofilechats', localField: 'idProfileChat', foreignField: '_id', as: 'profileChat' } },
          { $lookup: { from: 'groupprofilemails', localField: 'idProfileMail', foreignField: '_id', as: 'profileMail' } },
          { $lookup: { from: 'users', localField: 'updateBy', foreignField: '_id', as: 'updateBy' } }
        ]);
        if (!_.isEmpty(sortQuery)) {
          agg.append({ $sort: sortQuery });
        }
        // Query danh sách Group Agent
        _AgentGroups.aggregatePaginate(agg, { page: page, limit: rows }, function (error, result, pageCount, count) {
          var paginator = new pagination.SearchPaginator({ prelink: '/agent-groups', current: page, rowsPerPage: rows, totalResult: count });

          res.json({
            code: error ? 500 : 200,
            data: result,
            paging: paginator.getPaginationData()
          });
        });
      }
    } catch (error) {
      console.log(`------- error ------- `);
      console.log(error);
      console.log(`------- error ------- `);
      return res.json({ code: 500, error: error.message });
    }
  },
  html: function (req, res) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    var query = _.cleanRequest(req.body);

    var sortQuery = {};
    if (!_.isUndefined(req.query['sortField']))
      sortQuery[req.query['sortField']] = _.isEqual(req.query['sortValue'], 'asc') ? 1 : -1

    var companies;

    _async.parallel({
      // Query Công Ty để filter
      companies: function (next) {
        var _query = req.session.auth.company ? (req.session.auth.company.group ? { status: 9999 } : { _id: req.session.auth.company._id }) : {};
        _Company.find(_query, next);
      }
    }, function (err, result) {
      companies = result.companies;

      var _query2 = req.session.auth.company ? (req.session.auth.company.group ? (req.session.auth.company.group.leader ? { _id: new mongodb.ObjectId(req.session.auth.company.group._id) } : { status: 9999 }) : { idParent: new mongodb.ObjectId(req.session.auth.company._id) }) : {};
      var agg = _AgentGroups.aggregate([
        { $match: { $and: [query, _query2] } },

        { $lookup: { from: 'users', localField: 'leaders', foreignField: '_id', as: 'leaders' } },
        { $lookup: { from: 'users', localField: 'members', foreignField: '_id', as: 'members' } },
        { $lookup: { from: 'companies', localField: 'idParent', foreignField: '_id', as: 'parent' } },
        { $lookup: { from: 'groupprofiles', localField: 'idProfile', foreignField: '_id', as: 'profile' } },
        { $lookup: { from: 'groupprofilechats', localField: 'idProfileChat', foreignField: '_id', as: 'profileChat' } },
        { $lookup: { from: 'groupprofilemails', localField: 'idProfileMail', foreignField: '_id', as: 'profileMail' } },
        { $lookup: { from: 'users', localField: 'updateBy', foreignField: '_id', as: 'updateBy' } }
      ]);
      if (!_.isEmpty(sortQuery)) {
        agg.append({ $sort: sortQuery });
      }
      // Query danh sách Group Agent
      _AgentGroups.aggregatePaginate(agg, { page: page, limit: rows }, function (error, agentgroups, pageCount, count) {
        var paginator = new pagination.SearchPaginator({ prelink: '/agent-groups', current: page, rowsPerPage: rows, totalResult: count });
        _.render(req, res, 'agent-groups', {
          title: 'Danh sách nhóm agent',
          plugins: ['moment', ['bootstrap-select'], ['mrblack-table']],
          sortData: sortQuery,
          companies: companies,
          groups: agentgroups,
          paging: paginator.getPaginationData()
        }, true, error);
      });
    });
  }
};

// New
exports.new = function (req, res) {
  try {
    _async.parallel({
      // Lấy danh sách công ty
      companies: function (callback) {
        var aggregate = [];
        var _query = req.session.auth.company ? { _id: new mongodb.ObjectId(req.session.auth.company._id) } : {};
        aggregate.push({ $match: { $and: [_query, { status: 1 }] } });
        aggregate.push({ $lookup: { from: 'groupprofiles', localField: '_id', foreignField: 'idCompany', as: 'groupprofiles' } });

        _Company.aggregate(aggregate, function (err, result) {
          if (err) {
            callback(err);
          }

          let companies = _.chain(result)
            .map(function (company) {
              company.groupprofiles = _.chain(company.groupprofiles)
                .filter(function (profile) {
                  return profile.status == 1;
                }).value();
              return company;
            }).value();

          callback(null, companies);
        });
      },
      // Lấy danh sách skill group trong công ty
      skillsGroup: function (callback) {
        // getSkillGroupFromCisco(callback);
        _SkillGroups.find({ status: 1 }, callback)
      },
      // Lấy toàn bộ user trong Telehub
      leaders: function (callback) {
        _Users.find({status: 1}, function (err, users) {
          if (err) {
            callback(err);
          }
          callback(null, users);
        });
      },
      // Query danh sách agent
      agents: function (callback) {
        getAgentsFromCisco(null, function (err, agents) {
          if (err) return callback(err);
          mapAgent(agents, callback);
        });
      },
      // Query group profile
      groupProfileCall: function (callback) {
        var _query = req.session.auth.company
          ? (req.session.auth.company.group
            ? { status: 9999 }
            : { idCompany: req.session.auth.company._id })
          : {};
        _GroupsProfile.find({ $and: [{ status: 1 }, _query] }, function (err, result) {
          if (err) {
            callback(err);
          }
          callback(null, result);
        });
      },
      // Query chat profile
      groupProfileChat: function (callback) {
        _GroupsProfileChat.find({ status: 1 }, function (err, result) {
          if (err) {
            callback(err);
          }
          callback(null, result);
        });
      },
      // Query mail profile
      groupProfileMail: function (callback) {
        _GroupsProfileMail.find({ status: 1 }, function (err, result) {
          if (err) {
            callback(err);
          }
          callback(null, result);
        });
      },
    }, function (error, resp) {
      // if (error) {
      //   throw error
      // }

      return _.render(req, res, 'agent-groups-new', {
        title: 'Tạo mới nhóm agent',
        companies: resp.companies ? resp.companies : [],
        leaders: resp.leaders ? resp.leaders : [],
        agents: resp.agents ? resp.agents : [],
        skillsGroup: resp.skillsGroup ? resp.skillsGroup : [],
        groupsProfile: resp.groupProfileCall ? resp.groupProfileCall : [],
        groupsProfileChat: resp.groupProfileChat ? resp.groupProfileChat : [],
        groupsProfileMail: resp.groupProfileMail ? resp.groupProfileMail : [],
        plugins: [['bootstrap-duallistbox'], ['bootstrap-select']]
      }, true, error);
    });
  } catch (error) {
    console.log(`------- error ------- `);
    console.log(error);
    console.log(`------- error ------- `);
    return _.render(req, res, 'agent-groups-new', {
      title: 'Tạo mới nhóm agent',
      plugins: [['bootstrap-duallistbox'], ['bootstrap-select']]
    }, true, error);
  }
};

// POST
exports.create = function (req, res) {
  try {
    // let skillGroup = {
    //   skillGroupId: req.body.skillsGroup.split('-')[0],
    //   peripheralNumber: req.body.skillsGroup.split('-')[1],
    //   changeStamp: req.body.skillsGroup.split('-')[2]
    // }

    let query = {};
    query.name = req.body.name;
    query.idSkillGroups = req.body.skillsGroup.split('-')[0]
    // query.idSkillGroup = skillGroup.peripheralNumber;
    // query.urlSkillGroup = `/unifiedconfig/config/skillgroup/${skillGroup.skillGroupId}`;
    query.leaders = _.arrayObjectId(req.body.leaders);
    if (req.body.idParent.length > 0) query.idParent = req.body.idParent;
    if (!_.isEmpty(req.body.idProfile)) query.idProfile = req.body.idProfile;
    if (!_.isEmpty(req.body.idProfileChat)) query.idProfileChat = req.body.idProfileChat;
    if (!_.isEmpty(req.body.idProfileMail)) query.idProfileMail = req.body.idProfileMail;
    query.status = req.body.status;
    query.createBy = req.session.user._id;
    query.updateBy = req.session.user._id;
    query.updated = new Date();
    let agentsTelehub = req.body.members.split(',');;

    _async.waterfall([
      // Lấy danh sách Agent trên Cisco
      function (next) {
        getAgentsFromCisco(null, next);
      },
      // Lọc ra những Agent đã chọn
      function (data, next) {
        getListAgentFromCisco(data, agentsTelehub, next);
      },
      // // Cập nhật Agent vào Skill Group
      // function (data, next) {
      //   data.skillGroup = skillGroup;
      //   updateAgentsToSkillGroup(data, next);
      // },
      // Tạo Agent Group
      function (data, next) {
        query.members = data.listAgentFromTelehub;
        _AgentGroups.createNew(query, next);
      }
    ], function (err, result) {
      if (err) {
        console.log(`------- err ------- `);
        console.log(err);
        console.log(`------- err ------- `);
        return res.json({ code: 500, message: err.message });
      }

      return res.json({ code: 200, message: 'Tạo Agent Group thành công!' });
    });
  } catch (error) {
    console.log(`------- error ------- `);
    console.log(error);
    console.log(`------- error ------- `);
    return res.json({ code: 500, error: error.message });
  }
};


// Edit
exports.edit = function (req, res) {
  _async.parallel({
    // Query group muốn edit
    agentGroup: function (callback) {
      _async.waterfall([
        // Lấy agent group
        function (next) {
          _AgentGroups.findById(req.params['agentgroup'], function (err, agentGroups) {
            if (err) return next(err);
            return next(null, { agentGroups });
          });
        },
        // Lấy agent có trong skill group
        function (data, next) {
          if (!data.agentGroups.idSkillGroups) {
            getAgentsFromCisco(null, function (err, agentsCisco) {
              if (err) return next(err);
              return next(null, { ...data, agentsCisco });
            });
          } else {
            _SkillGroups.findById(data.agentGroups.idSkillGroups, function (error, result) {
              if (!error && result) {
                getAgentsFromCisco(result.listSkills.toString(), function (err, agentsCisco) {
                  if (err) return next(err);
                  return next(null, { ...data, agentsCisco });
                });
              } else {
                next(new Error('Có lỗi xảy ra'))
              }
            })
          }
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
    // Query công ty
    companies: function (callback) {
      var aggregate = [];
      var _query = req.session.auth.company ? { _id: new mongodb.ObjectId(req.session.auth.company._id) } : {};
      aggregate.push({
        $match: { $and: [_query, { status: 1 }] }
      });
      aggregate.push({
        $lookup: {
          from: 'groupprofiles',
          localField: '_id',
          foreignField: 'idCompany',
          as: 'groupprofiles'
        }
      });

      _Company.aggregate(aggregate, function (err, result) {
        if (err) {
          callback(err);
        }

        let companies = _.chain(result)
          .map(function (company) {
            company.groupprofiles = _.chain(company.groupprofiles)
              .filter(function (profile) {
                return profile.status == 1;
              }).value();
            return company;
          }).value();
        callback(null, companies);
      });
    },
    // Query leader
    leader: function (callback) {
      _Users.find({ role: { $gt: 1 }, status: 1}, callback);
    },
    // Query agent
    agent: function (callback) {
      getAgentsFromCisco(null, function (err, agents) {
        if (err) return callback(err);
        mapAgent(agents, callback);
      });
    },
    // Query group profile
    groupsProfile: function (callback) {
      _GroupsProfile.find({ status: 1 }, callback);
    },
    // Query group profile chat
    groupsProfileChat: function (callback) {
      _GroupsProfileChat.find({ status: 1 }, callback);
    },
    // Query group profile mail
    groupsProfileMail: function (callback) {
      _GroupsProfileMail.find({ status: 1 }, callback);
    },
    // Query danh sách agent No ACD
    agentGroupDisable: function (callback) {
      _AgentGroupDisable.find({ idGroup: req.params['agentgroup'] }, callback);
    },
    // Lấy danh sách skill group trên Cisco
    skillGroup: function (callback) {
       // getSkillGroupFromCisco(callback);
       _SkillGroups.find({ status: 1 }, callback)
    }
  }, function (error, result) {
    try {
      if (error) throw error;

      // bo nhung user đang là agent trên cisco
      result.leader = result.leader.filter(i => {
        // console.log(i._id.toString(), result.agentGroup.agentsId, result.agentGroup.agentsId.includes( i._id.toString() ) );
        return ! result.agentGroup.agentsId.find(j =>  j.includes(i._id.toString()) ) ;
      });
      
      return _.render(req, res, 'agent-groups-edit', {
        title: 'Sửa nhóm agent',
        org: result.agentGroup.agentGroups,
        agentsSkillGroup: result.agentGroup.agentsId,
        companies: result.companies,
        leaders: result.leader,
        agents: result.agent,
        groupsProfile: result.groupsProfile,
        groupsProfileChat: result.groupsProfileChat,
        groupsProfileMail: result.groupsProfileMail,
        agentDisable: _.pluck(result.agentGroupDisable, 'idAgent'),
        skillsGroup: result.skillGroup ? result.skillGroup : [],
        plugins: [['bootstrap-duallistbox'], ['bootstrap-select']]
      }, true);
    } catch (error) {
      console.log(`------- error ------- `);
      console.log(error);
      console.log(`------- error ------- `);
      return _.render(req, res, 'agent-groups-edit', {
        title: 'Sửa nhóm agent',
        plugins: [['bootstrap-duallistbox'], ['bootstrap-select']]
      }, true, error);
    }
  });
};

// PUT
exports.update = function (req, res) {
  try {
    // var skillGroup = {
    //   skillGroupId: req.body.skillsGroup.split('-')[0],
    //   peripheralNumber: req.body.skillsGroup.split('-')[1],
    //   changeStamp: req.body.skillsGroup.split('-')[2]
    // }

    var query = {};
    query.name = req.body.name;
    query._id = req.params['agentgroup'];
    query.idSkillGroups = req.body.skillsGroup.split('-')[0]
    // query.idSkillGroup = skillGroup.peripheralNumber;
    // query.urlSkillGroup = `/unifiedconfig/config/skillgroup/${skillGroup.skillGroupId}`;
    //query.leaders = _.arrayObjectId(req.body.leaders);
    query.idParent = req.body.idParent && req.body.idParent.length > 0 ? req.body.idParent : null;
    query.idProfile = _.isEmpty(req.body.idProfile) ? null : req.body.idProfile;
    query.idProfileChat = _.isEmpty(req.body.idProfileChat) ? null : req.body.idProfileChat;
    query.idProfileMail = _.isEmpty(req.body.idProfileMail) ? null : req.body.idProfileMail;
    query.status = req.body.status || !_.isEqual(req.body.status, '') ? req.body.status : 1;
    query.updateBy = req.session.user._id;
    query.updated = new Date();
    let agentsTelehub = req.body.members.split(',');

    _async.waterfall([
      function (next) {
        getAgentsFromCisco(null, next);
      },
      function (data, next) {
        getListAgentFromCisco(data, agentsTelehub, next);
      },
      // function (data, next) {
      //   data.skillGroup = skillGroup;
      //   updateAgentsToSkillGroup(data, next);
      // },
      function (data, next) {
        // Clear danh sách agent No ACD
        _AgentGroupDisable.remove({ idGroup: req.params['agentgroup'] }, function (err, result) {
          if (err) {
            next(err);
          }
          next(null, data);
        });
      },
      function (data, next) {
        if (!req.body.disableAgents || req.body.disableAgents.length == 0) {
          next(null, data);
        } else {
          // Cập nhật lại danh sách agent no ACD
          var batch = mongoClient.collection('agentgroupdisables').initializeUnorderedBulkOp({ useLegacyOps: true });
          _.each(req.body.disableAgents, function (el, i) {
            var item = new _AgentGroupDisable({
              idAgent: el,
              idGroup: req.params['agentgroup']
            });
            batch.insert(item.toObject());
          });
          batch.execute(function (err, result) {
            if (err) {
              next(err);
            }
            next(null, data);
          });
        }
      },
      function (data, next) {
        query.leaders = _.convertArrayObjectIdToString(req.body.leaders)
        query.members = _.convertArrayObjectIdToString(data.listAgentFromTelehub);
        _AgentGroups.updateGroups(query, next)
      }
    ], function (err, result) {
      if (err) {
        console.log(`------- err ------- `);
        console.log(err);
        console.log(`------- err ------- `);
        return res.json({ code: 500, message: err.message });
      }
      return res.json({ code: 200, message: 'Cập nhật thành công!' });
    });
  } catch (error) {
    console.log(`------- error ------- `);
    console.log(error);
    console.log(`------- error ------- `);
    return res.json({ code: 500, message: error.message });
  }
};

// Validation Engine
exports.validate = function (req, res) {
  var _query = _.cleanRequest(req.query, ['_', 'fieldId', 'fieldValue', 'type', 'cName']);
  if (req.query.type == 'update') {
    if (req.query.name == req.query.cName) {
      res.json([req.query.fieldId, true])
    } else {
      _AgentGroups.findOne(_query).exec(function (error, ca) {
        res.json([req.query.fieldId, _.isNull(ca)]);
      });
    }
  } else if (req.query.type == 'new') {
    _AgentGroups.findOne(_query).exec(function (error, ca) {
      res.json([req.query.fieldId, _.isNull(ca)]);
    });
  }

};

// DELETE
exports.destroy = function (req, res) {
  var ids = [];
  if (!_.isEqual(req.params.agentgroup, 'all')) {
    //_AgentGroups.findByIdAndRemove(req.params['agentgroup'], function (error) {
    //    res.json({code: (error ? 500 : 200), message: error ? error : ""});
    //});
    ids.push(req.params['agentgroup']);
    _AgentGroups.deleteGroups(ids, function (error) {
      res.json({ code: (error ? 500 : 200), message: error ? error : "" });
    })
  } else {
    var query = { $and: [{ _id: { $in: req.body.ids.split(',') } }, { level: 2 }] };

    ids = req.body.ids.split(',');
    _AgentGroups.deleteGroups(ids, function (error) {
      res.json({ code: (error ? 500 : 200), message: error ? error : "" });
    })
  }
};

// SEARCH
exports.search = {
  json: function (req, res) {
    var name = req.query.name;

    _AgentGroups
      .find({ $regex: new RegExp(_.stringRegex(query.name)) }, function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error : result });
      });
  },
  html: function (req, res) {
    var name = req.query.keyword;
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

    var query = _.cleanRequest(req.query, ['sortField', 'sortValue']);
    if (query.name)
      query.name = { $regex: new RegExp(_.stringRegex(query.name)), $options: '-i' };
    if (query.idParent)
      query.idParent = new mongoose.Types.ObjectId(query.idParent);

    var sortQuery = {};
    if (!_.isUndefined(req.query['sortField']))
      sortQuery[req.query['sortField']] = _.isEqual(req.query['sortValue'], 'asc') ? 1 : -1;
    var companies;
    _Company.find({ status: 1 }, function (err, cps) {
      companies = cps;

      var agg = _AgentGroups.aggregate([
        { $match: query },

        { $lookup: { from: 'users', localField: '_id', foreignField: 'agentGroupLeaders.group', as: 'leaders' } },
        { $lookup: { from: 'users', localField: '_id', foreignField: 'agentGroupMembers.group', as: 'members' } },
        { $lookup: { from: 'companies', localField: 'idParent', foreignField: '_id', as: 'parent' } },
        { $lookup: { from: 'groupprofiles', localField: 'idProfile', foreignField: '_id', as: 'profile' } },
        { $lookup: { from: 'groupprofilechats', localField: 'idProfileChat', foreignField: '_id', as: 'profileChat' } },
        { $lookup: { from: 'groupprofilemails', localField: 'idProfileMail', foreignField: '_id', as: 'profileMail' } },
        { $lookup: { from: 'users', localField: 'updateBy', foreignField: '_id', as: 'updateBy' } },
        { $lookup: { from: 'agentstatuses', localField: 'agentStatus', foreignField: '_id', as: 'agentStatus' } }
      ]);
      if (!_.isEmpty(sortQuery)) {
        agg.append({ $sort: sortQuery });
      }
      _AgentGroups.aggregatePaginate(agg, { page: page, limit: rows }, function (error, agentgroups, pageCount, count) {
        var paginator = new pagination.SearchPaginator({ prelink: '/agent-groups', current: page, rowsPerPage: rows, totalResult: count });

        _.render(req, res, 'agent-groups', {
          title: 'Danh sách nhóm agent',
          plugins: [['bootstrap-select']],
          sortData: sortQuery,
          companies: companies,
          groups: agentgroups,
          paging: paginator.getPaginationData()
        }, true, error);
      });
    });
  }
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
          next(err);
        }

        if (response && response.statusCode == 200) {
          let agentsCisco = body.data;
          next(null, agentsCisco);
        }
      });
    },
  ], callback);
}

