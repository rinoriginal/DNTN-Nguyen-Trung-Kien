

const {
    getRequestDefault,
} = require('../commons/functions/api.report')

exports.index = {
	json: function (req, res) {
		_Company.distinct("_id", req.query.idParent ? {_id:req.query.idParent}:{}, function(err,com){
			_AgentGroups.distinct("_id", {idParent:{$in:com}}, function (err, r) {
				_Users.find({$or: [{'agentGroupLeaders.group': {$in: r}}, {'agentGroupMembers.group': {$in: r}}, {'companyLeaders.company': {$in: com}}]}, function (err, r2) {
					res.status(200).json(r2);
				});
			});
		});
	},
	html: function (req, res) {
		var query = {};
		query = _.cleanRequest(req.query, ['startDate', 'endDate']);
		var serQuery = {};
		var transQuery = {};
		var companyQuery = {};
		var cond = {};
		cond.$or = [];
		if (_.has(req.query, "startDate") || _.has(req.query, "endDate")) {
			query.startTime = {};
			query.created = {};
			if (_.has(req.query, "startDate")) {
				query.startTime.$gte = _moment(req.query['startDate'], "DD/MM/YYYY").startOf('day').valueOf();
				query.created.$gte = _moment(req.query['startDate'], "DD/MM/YYYY").startOf('day')._d;
			}
			;
			if (_.has(req.query, "endDate")) {
				query.startTime.$lte = _moment(req.query['endDate'], "DD/MM/YYYY").endOf('day').valueOf();
				query.created.$lte = _moment(req.query['endDate'], "DD/MM/YYYY").endOf('day')._d;
			}
			;
		}
		if (_.has(req.query, "status")) {
			query.status = parseInt(req.query.status);
		}
		if (req.session.auth.company) {
			serQuery.idCompany = _.convertObjectId(req.session.auth.company._id);
			transQuery.idCompany = _.convertObjectId(req.session.auth.company._id);
			companyQuery._id = _.convertObjectId(req.session.auth.company._id);
			cond.$or.push({'companyLeaders.company': _.convertObjectId(req.session.auth.company._id)});
			if (!req.session.auth.company.leader) {
				_.render(req, res, 'report-inbound-overall-agent-productivity', {
					title: 'Báo cáo gọi vào - Báo tổng quát theo điện thoại viên',
					result: [],
					company: [],
					agent: [],
					plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel']
				}, true, new Error("Không đủ quyền truy cập"));
				return;
			}
		}
		_async.parallel({
			com: function (cb) {
				_Company.find(companyQuery, cb);
			},
			agent: function (cb) {
				_async.waterfall([
					function (callback) {
						_Company.distinct("_id", req.session.auth.company ? {_id: req.session.auth.company} : {}, function (err, com) {
							_AgentGroups.find({idParent:{$in:com}}, {_id: 1}, function (err, result) {
								if (err) return callback(err, null);
								var ag = _.pluck(result, '_id');
								cond.$or.push({'agentGroupLeaders.group': {$in: ag}}, {'agentGroupMembers.group': {$in: ag}}, {'companyLeaders.company': {$in: com}});
								_Users.find(cond, callback);
							});
						});
					}
				], cb);
			}
		}, function (err, result) {
			_.isEmpty(req.query) ? (_.render(req, res, 'report-inbound-overall-agent-productivity', {
					title: 'Báo cáo gọi vào - Báo tổng quát theo điện thoại viên',
					result: [],
					company: result.com,
					agent: result.agent,
					plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel'],
					EXCEL_CONFIG,
				}, true, err)) : (
					_async.waterfall([function(cb){
						var serviceQuery = {};
						if (_.has(req.query, 'idCompany')) {
							serviceQuery.idCompany = _.convertObjectId(req.query.idCompany);
						};
						_Services.distinct("_id", serviceQuery,cb)
					},
						function (a,cb) {
							transQuery = {};
							var ticketQuery = {idService:{$in:a},status:{$ne:-1}};
							if (_.has(req.query, 'startDate')) {
								transQuery.startDate = _moment(req.query['startDate'], "DD/MM/YYYY").startOf('day').format("YYYY-MM-DD HH:mm:ss");
							}else {
								transQuery.startDate = _moment().startOf('day').format("YYYY-MM-DD HH:mm:ss");
							}
							if (_.has(query, 'created')) {
								ticketQuery.created = query.created;
							}
							if (_.has(req.query, 'agentId')) {
								// transQuery.agentId = {$in: _.arrayObjectId(req.query.agentId)};
								ticketQuery.idAgent = {$in: _.arrayObjectId(req.query.agentId)};
							}
							if (_.has(req.query, 'endDate')) {
								transQuery.endDate = _moment(req.query['endDate'], "DD/MM/YYYY").endOf('day').format("YYYY-MM-DD HH:mm:ss");
							}else {
								transQuery.endDate = _moment().endOf('day').format("YYYY-MM-DD HH:mm:ss");
							}

							getReportData(transQuery.startDate, transQuery.endDate, req.query, (err, r) => {
								
								_Tickets.aggregate([
									{$match:ticketQuery},
									{$group:{
										_id:'$idAgent',
										total:{$sum:1},
										done:{$sum:{$cond:[{$eq:['$status',2]},1,0]}}
									}},
									{
										$lookup: {
											from: "users",
											localField: "_id",
											foreignField: "_id",
											as: "agentInfo"
										}
									},
									{
										$unwind:{ path: '$agentInfo', preserveNullAndEmptyArrays: true }
									},
									{
										$project:{
											_id:{$ifNull: ['$agentInfo.displayName', null] },
											total:1,
											done:1
										}
									}
								], function(err,r2){
									var result = [];

									_.each(_.union(_.pluck(r,'_id'), _.pluck(r2,'_id')), function(o){
										var obj1 = _.findWhere(r, {_id: o}) ? _.findWhere(r, {_id: o}):{_id:o,totalCall:0, callDuration:0, connected: 0, missed: 0, avgCallDuration: 0};
										var obj2 = _.findWhere(r2, {_id: o}) ? _.findWhere(r2, {_id: o}):{_id:o,total:0,done:0};
										result.push(_.extend(obj1,obj2));
									})
									// console.log(_.pluck(r,'_id'), _.pluck(r2,'_id'))
									cb(err, result);
								})
							});
						}
					], function (err, results) {
						_.render(req, res, 'report-inbound-overall-agent-productivity', {
							title: 'Báo cáo gọi vào - Báo tổng quát theo điện thoại viên',
							result: results,
							company: result.com,
							agent: result.agent,
							plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel'],
							EXCEL_CONFIG
						}, true, err)
					})
				)
		})
	}
}

function getReportData(startDate, endDate, _query, callback) {
	let options = {
        startDate,
        endDate,
        // pages,
        // rows,
        // download,
        callType: _config.cisco.apiCisco.callType,
        skillGroup: _config.cisco.apiCisco.skillGroup,
    };

	getRequestDefault(_config.cisco.apiCisco, pathURL = `reportTRCallType/inOverAllAgent`, options, (err, data) => {
        if (!err) {
			// filter data nếu truyền lên idAgentCisco
			if(_query && _query.idAgentCisco){
				data = data.filter(i => _query.idAgentCisco.includes(i.block) );
			}
			
			// let data = body.data.recordset;
			let idAgentCisco = _.union(_.pluck(data, "block"));
			
			// do trên cisco trả về string nhưng trong data base mongodb đang là string
			idAgentCisco = idAgentCisco.map(Number);

			_async.waterfall([
				function(cb) {
					// lấy thông tin agent của telehub
					_Users.find({idAgentCisco: { $in: idAgentCisco } }, cb);
				}, function (results, cb) {
					let dataAgentInfo = data.map((item, index) => {
						let agentFound = results.find(iAgent => iAgent.idAgentCisco == item.block);
						if(agentFound) item.agentInfo = agentFound;

						return item;
					});
					cb(null, dataAgentInfo);
				}
			], (err, result) => {
				if(err) return callback(err);
				let data = mappingData(result);
				callback(null, data);
			})
			
        }else {
            callback(err);
        }
    })
}

function mappingData(data) {
	
	return data.map((item, index) => {

		// totalCall:0, callDuration:0, connected: 0, missed: 0, avgCallDuration
		item._id = item.agentInfo ? item.agentInfo.displayName: item.block;
		item.totalCall = item.total;
		item.callDuration = item.SumsDuration*1000;
		item.connected = item.connect;
		// item.missed = item.missed;
		item.maxLength = item.MaxDuration*1000;
		item.minLength = item.MinDuration*1000;
		item.avgCallDuration = (item.SumsDuration/ item.connect)*1000;

		return item;
	});
}