
const {
  getDataTCDOutboundbyAgent,
} = require('../commons/functions');

const {
  getRequestDefault,
} = require('../commons/functions/api.report')

exports.index = {
  json: async function (req, res) {
    try {
      let ticketFilter = {};
      let callFilter = {};
      let companyQuery = {};
      let campaignQuery = {};
      let serviceQuery = {};

      let { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new Error('Ngày bắt đầu & Ngày kết thúc là bắt buộc!');
      }

      if (startDate || endDate) {
        ticketFilter.created = {};
        callFilter.startTime = {};
      }

      if (startDate) {
        ticketFilter.created.$gte = moment(startDate, 'DD/MM/YYYY').startOf('days')._d;
        callFilter.startTime.$gte = moment(startDate, 'DD/MM/YYYY').startOf('days').valueOf();
        startDate = moment(startDate, 'DD/MM/YYYY').startOf('day').format('YYYY-MM-DD HH:mm:ss');
      }

      if (endDate) {
        ticketFilter.created.$lte = moment(endDate, 'DD/MM/YYYY').endOf('days')._d;
        callFilter.startTime.$lte = moment(endDate, 'DD/MM/YYYY').endOf('days').valueOf();
        endDate = moment(endDate, 'DD/MM/YYYY').endOf('day').format('YYYY-MM-DD HH:mm:ss');
      }

      if (req.session.auth.company) {
        companyQuery = { idCompany: req.session.auth.company._id }
      } else if (req.query.companies) {
        companyQuery = { idCompany: { $in: _.arrayObjectId(req.query.companies) } }
      }

      const campainsResult = await _Campains.distinct("_id", companyQuery);
      campaignQuery = { $in: campainsResult };

      const servicesResult = await _Services.distinct("_id", companyQuery);
      serviceQuery = { $in: servicesResult };

      // Lấy dữ liệu cuộc gọi inbound
      const inboundResult = await getDataInbound(startDate, endDate, serviceQuery, ticketFilter, callFilter);

      // Lấy dữ liệu cuộc gọi outbound
      const outboundResult = await getDataOutbound(req.query.startDate, req.query.endDate);

      return res.json({ code: 200, data: { ...inboundResult, ...outboundResult } });
    } catch (error) {
      console.log(`------- error ------- `);
      console.log(error);
      console.log(`------- error ------- `);
      return res.send({ code: 500, message: error.message ? error.message : error });
    }
  },
  html: async function (req, res) {
    try {
      var companyIds = {};

      if (req.session.auth.company && !req.session.auth.company.leader) {
        throw new Error('Bạn không đủ quyền truy cập!');
      }

      if (req.session.auth.company) {
        companyIds._id = _.convertObjectId(req.session.auth.company._id);
      }

      const companies = await _Company.find(companyIds);

      return _.render(req, res, 'report-inout-general', {
        title: "Báo cáo tổng quát gọi vào - ra",
        plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', ['chosen']],
        companies: companies
      }, true);
    } catch (error) {
      console.log(`------- error ------- render html report-inout-grnaral`);
      console.log(error);
      console.log(`------- error ------- render html report-inout-grnaral`);

      return _.render(req, res, 'report-inout-general', {
        title: "Báo cáo tổng quát gọi vào - ra",
        plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', ['chosen']],
        companies: []
      }, true, error);
    }
  }
}

function getReportData(startDate, endDate) {
  return new Promise((resolve, reject) => {
    try {
      let config = _config.cisco.apiCisco;
      let pathURL = 'reportTRCallType/statisticInbound';
      let options = {
        startDate,
        endDate,
        callType: _config.cisco.apiCisco.callType,
        skillGroup: _config.cisco.apiCisco.skillGroup,
      };

      getRequestDefault(config, pathURL, options, (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      });
    } catch (error) {
      return reject(error);
    }
  });
}

function getDataOutbound(startDate, endDate) {
  return new Promise(async (resolve, reject) => {
    try {
      let queryApi = {};
      let ticketQuery = { idService: null, created: {} };

      // Truy vấn dữ liệu theo ngày
      if (startDate) {
        queryApi.startDate = _moment(startDate, "DD/MM/YYYY").startOf('day').format('YYYY-MM-DD HH:mm:ss');
        ticketQuery.created.$gte = _moment(startDate, "DD/MM/YYYY").startOf('day')._d;
      }

      if (endDate) {
        queryApi.endDate = _moment(endDate, "DD/MM/YYYY").endOf('day').format('YYYY-MM-DD HH:mm:ss');
        ticketQuery.created.$lte = _moment(endDate, "DD/MM/YYYY").endOf('day')._d;
      }

      // Lấy config trong db Telehub
      const configResult = await _Config.find();
      const configApi = {
        ipCiscoReport: configResult[0].ipCiscoReport,
        tokenDefault: configResult[0].tokenDefault,
        pathURL: 'reportTCDoutbound/report-outbound-overall-agent-productivity'
      }
      queryApi.agentTeamId = configResult[0].Agent_Team;

      // Lấy ra các cuộc gọi outbound của từng agent trên db cisco
      const dataCallOutboundResult = await getDataTCDOutboundbyAgent(configApi, queryApi);

      // Lấy danh sách ticket
      const ticketResult = await _Tickets.aggregate([
        { $match: ticketQuery },
        {
          $group: {
            _id: '$idAgent',
            totalTicket: { $sum: 1 },
            ticketDone: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "agentInfo"
          }
        },
        {
          $unwind: { path: '$agentInfo', preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            _id: 1,
            agent: '$agentInfo.displayName',
            idAgentCisco: '$agentInfo.idAgentCisco',
            totalTicket: 1,
            ticketDone: 1
          }
        },
      ]);

      // Map ticket vào agent 
      let newAgentsWithTicket = dataCallOutboundResult.map((agent) => {
        let isTicket = ticketResult.find((ticket) => ticket.idAgentCisco == agent.agentID);
        if (isTicket) {
          return {
            ...agent,
            totalTicket: isTicket.totalTicket,
            ticketDone: isTicket.ticketDone,
          }
        }
        return {
          ...agent,
          totalTicket: 0,
          ticketDone: 0,
        }
      });

      // Tính tổng
      let totalCallOutbound = 0;
      let totalCallOutboundConnected = 0;
      let totalTicketOutbound = 0;

      newAgentsWithTicket.forEach((element) => {
        totalCallOutbound += element.totalCall;
        totalCallOutboundConnected += element.totalCallConnect;
        totalTicketOutbound += element.totalTicket;
      });

      return resolve({
        totalCallOutbound,
        totalCallOutboundConnected,
        totalTicketOutbound
      });
    } catch (error) {
      return reject(error);
    }
  });
}

function getDataInbound(startDate, endDate, serviceQuery, ticketFilter, callFilter) {
  return new Promise(async (resolve, reject) => {
    try {
      let ticketQuery = _.extend({ idService: serviceQuery }, ticketFilter);
      let pickupConditions = [
        {
          "$match": _.extend({
            "transType": { "$in": [1, 7, 8] },
            "serviceType": 3,
            "agentId": { "$ne": null },
            "subReason": { "$eq": null }
          }, callFilter)
        },
        { "$match": { "serviceId": serviceQuery } },
        {
          "$group": {
            "_id": "$callId",
            "serviceId": { "$max": "$serviceId" },
            "agentId": { "$max": "$agentId" },
            "endTime": { "$max": "$endTime" },
            "startTime": { "$max": "$startTime" },
            "answerTime": { "$max": "$answerTime" },
            "caller": { "$max": "$caller" },
            "waitDuration": {
              "$sum": {
                "$cond": [
                  { "$eq": ["$serviceType", 3] },
                  "$waitDuration", 0
                ]
              }
            },
            "waitingDurationBlock": {
              "$sum": {
                "$cond": [
                  { "$eq": ["$serviceType", 3] },
                  "$waitingDurationBlock", 0]
              }
            },
            "callDuration": {
              "$sum": {
                "$cond": [
                  { "$eq": ["$serviceType", 3] },
                  "$callDuration",
                  0
                ]
              }
            },
            "durationBlock": {
              "$sum": {
                "$cond": [
                  { "$eq": ["$serviceType", 3] },
                  "$durationBlock", 0
                ]
              }
            }
          }
        },
        {
          "$match": {
            "answerTime": { "$gt": 0 },
            "agentId": { "$ne": null }
          }
        }
      ];
      var missCondition = [
        { "$match": _.extend({ "serviceId": serviceQuery }, callFilter) },
        { "$match": { "transType": { "$in": [1, 7] } } },
        {
          "$project": {
            "_id": 1,
            "callId": 1,
            "serviceId": 1,
            "serviceType": 1,
            "reason": 1,
            "subReason": 1,
            "answerTime": 1,
            "waitDuration": 1,
            "startTime": 1,
            "endTime": 1,
            "caller": 1,
            "type": {
              "$cond": {
                "if": {
                  "$and": [
                    { "$eq": ["$serviceType", 3] },
                    { "$eq": ["$reason", 0] },
                    { "$eq": ["$subReason", 1] }
                  ]
                },
                "then": 1,
                "else": {
                  "$cond": {
                    "if": {
                      "$and": [
                        { "$eq": ["$serviceType", 2] },
                        { "$eq": ["$reason", 0] },
                        { "$eq": ["$subReason", 1] }
                      ]
                    },
                    "then": 2,
                    "else": {
                      "$cond": {
                        "if": {
                          "$and": [
                            { "$eq": ["$serviceType", 3] },
                            { "$eq": ["$reason", 0] },
                            { "$eq": ["$subReason", 4] }
                          ]
                        },
                        "then": 3,
                        "else": {
                          "$cond": {
                            "if": {
                              "$and": [
                                { "$eq": ["$serviceType", 3] },
                                { "$eq": ["$reason", 8] },
                                { "$eq": ["$subReason", 5] }
                              ]
                            },
                            "then": 4,
                            "else": {
                              "$cond": {
                                "if": {
                                  "$and": [
                                    { "$eq": ["$serviceType", 2] },
                                    { "$eq": ["$reason", 0] },
                                    { "$eq": ["$subReason", 15] }
                                  ]
                                },
                                "then": 5,
                                "else": 6
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },

        {
          "$project": {
            "_id": 1,
            "callId": 1,
            "serviceId": 1,
            "serviceType": 1,
            "reason": 1,
            "subReason": 1,
            "answerTime": 1,
            "waitDuration": 1,
            "type": {
              "$cond": {
                "if": {
                  "$and": [
                    { "$eq": ["$serviceType", 3] },
                    { "$eq": ["$reason", 0] },
                    { "$eq": ["$subReason", 1] }
                  ]
                },
                "then": 1,
                "else": {
                  "$cond": {
                    "if": {
                      "$and": [
                        { "$eq": ["$serviceType", 2] },
                        { "$eq": ["$reason", 0] },
                        { "$eq": ["$subReason", 1] }
                      ]
                    },
                    "then": 2,
                    "else": {
                      "$cond": {
                        "if": {
                          "$and": [
                            { "$eq": ["$serviceType", 3] },
                            { "$eq": ["$reason", 0] },
                            { "$eq": ["$subReason", 4] }
                          ]
                        },
                        "then": 3,
                        "else": {
                          "$cond": {
                            "if": {
                              "$and": [
                                { "$eq": ["$serviceType", 3] },
                                { "$eq": ["$reason", 8] },
                                { "$eq": ["$subReason", 5] }
                              ]
                            },
                            "then": 4,
                            "else": {
                              "$cond": {
                                "if": {
                                  "$and": [
                                    { "$eq": ["$serviceType", 2] },
                                    { "$eq": ["$reason", 0] },
                                    { "$eq": ["$subReason", 15] }
                                  ]
                                },
                                "then": 5,
                                "else": 6
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        {
          "$group": {
            "_id": { "_id": "$callId", "serviceId": "$serviceId" },
            "type": { "$min": "$type" },
            "queueAnswer": { "$sum": { "$cond": [{ "$eq": ["$serviceType", 2] }, "$answerTime", 0] } },
            "agentAnswer": { "$sum": { "$cond": [{ "$eq": ["$serviceType", 3] }, "$answerTime", 0] } },
            "type_1_dur": { "$sum": { "$cond": [{ "$eq": ["$type", 1] }, "$waitDuration", 0] } },
            "type_2_dur": { "$sum": { "$cond": [{ "$eq": ["$type", 2] }, "$waitDuration", 0] } },
            "type_3_dur": { "$sum": { "$cond": [{ "$eq": ["$type", 3] }, "$waitDuration", 0] } },
            "type_4_dur": { "$sum": { "$cond": [{ "$eq": ["$type", 4] }, "$waitDuration", 0] } },
            "type_5_dur": { "$sum": { "$cond": [{ "$eq": ["$type", 5] }, "$waitDuration", 0] } },
            "totalDur": { "$sum": "$waitDuration" }
          }
        },
        { "$match": { "agentAnswer": { "$ne": null } } },
        {
          "$group": {
            "_id": "$_id.serviceId",
            "type_1": { "$sum": { "$cond": [{ "$eq": ["$type", 1] }, 1, 0] } },
            "type_2": { "$sum": { "$cond": [{ "$eq": ["$type", 2] }, 1, 0] } },
            "type_3": { "$sum": { "$cond": [{ "$eq": ["$type", 3] }, 1, 0] } },
            "type_4": { "$sum": { "$cond": [{ "$eq": ["$type", 4] }, 1, 0] } },
            "type_5": { "$sum": { "$cond": [{ "$eq": ["$type", 5] }, 1, 0] } },
            "type_1_dur": { "$sum": "$type_1_dur" },
            "type_2_dur": { "$sum": "$type_2_dur" },
            "type_3_dur": { "$sum": "$type_3_dur" },
            "type_4_dur": { "$sum": "$type_4_dur" },
            "type_5_dur": { "$sum": "$type_5_dur" },
            "total": {
              "$sum": {
                "$cond": [
                  {
                    "$or": [
                      { "$eq": ["$type", 1] },
                      { "$eq": ["$type", 2] },
                      { "$eq": ["$type", 3] },
                      { "$eq": ["$type", 4] },
                      { "$eq": ["$type", 5] }
                    ]
                  }, 1, 0
                ]
              }
            },
            "totalDur": { "$sum": "$totalDur" }, "avgDur": { "$avg": "$totalDur" }
          }
        }
      ];

      const [ticketsIn, pickedInCalls, missInCalls, inInfo] = await Promise.all([
        _Tickets.count(ticketQuery),
        _CdrTransInfo.aggregate(pickupConditions).exec(),
        _CdrTransInfo.aggregate(missCondition).exec(),
        getReportData(startDate, endDate, 0),
      ]);

      return resolve({
        ticketsIn,
        pickedInCalls,
        missInCalls,
        inInfo
      });
    } catch (error) {
      return reject(error);
    }
  });
}
