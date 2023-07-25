
var zipFolder = require('zip-folder');

const { createExcelFile } = require('../commons/handleExcel')
const {
  getDataTCDOutboundbyAgent,
  getAgentDetailInfo,
} = require('../commons/functions');


var titlePage = 'Báo cáo năng suất điện thoại viên';
exports.index = {
  json: async function (req, res) {
    try {
      let page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
      let rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

      let userQuery = {};
      let queryApi = {};
      let queryAgentFromTicket = {};
      let ticketQuery = { idService: null, created: {} };

      // Nếu không find dữ liệu theo thời gian thì lấy mốc này hôm nay để truy vấn
      if (!_.has(req.query, 'startDate') && !_.has(req.query, 'endDate')) {
        queryApi.startDate = _moment(Date.now()).startOf('day').format('YYYY-MM-DD HH:mm:ss');
        queryApi.endDate = _moment(Date.now()).endOf('day').format('YYYY-MM-DD HH:mm:ss');

        ticketQuery.created.$gte = _moment(Date.now()).startOf('day')._d;
        ticketQuery.created.$lte = _moment(Date.now()).endOf('day')._d;
      }

      // Truy vấn dữ liệu theo ngày
      if (_.has(req.query, 'startDate')) {
        queryApi.startDate = _moment(req.query.startDate, "DD/MM/YYYY").startOf('day').format('YYYY-MM-DD HH:mm:ss');
        ticketQuery.created.$gte = _moment(req.query.startDate, "DD/MM/YYYY").startOf('day')._d;
      };

      if (_.has(req.query, 'endDate')) {
        queryApi.endDate = _moment(req.query.endDate, "DD/MM/YYYY").endOf('day').format('YYYY-MM-DD HH:mm:ss');
        ticketQuery.created.$lte = _moment(req.query.endDate, "DD/MM/YYYY").endOf('day')._d;
      }

      if (_.has(req.query, 'agentId')) {
        queryApi.agentId = req.query.agentId;
        const agentsIdNumber = req.query.agentId.map(Number)
        queryAgentFromTicket.idAgentCisco = { $in: agentsIdNumber };
      }

      if (_.has(req.query, 'idCampain')) {
        ticketQuery.idCampain = { $in: _.arrayObjectId(req.query.idCampain) };
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
      console.log(`------- dataCallOutboundResult ------- `);
      console.log(dataCallOutboundResult);
      console.log(`------- dataCallOutboundResult ------- `);

      // Lấy danh sách agent trên telehub
      const agentsInfoResult = await getAgentDetailInfo();
      console.log(`------- agentsInfoResult ------- `);
      console.log(agentsInfoResult);
      console.log(`------- agentsInfoResult ------- `);

      // Lọc và lấy tên các user
      let newAgentsList = dataCallOutboundResult.map((record) => {
        let isAgent = agentsInfoResult.find((agent) => record.agentID == agent._id);
        if (isAgent) {
          return {
            ...record,
            displayName: isAgent.displayName,
          }
        }
        return {
          ...record,
          displayName: record.agentID,
        };
      });

      console.log(`------- newAgentsList ------- `);
      console.log(newAgentsList);
      console.log(`------- newAgentsList ------- `);

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
        { $match: queryAgentFromTicket },
      ]);

      console.log(`------- ticketResult ------- `);
      console.log(ticketResult);
      console.log(`------- ticketResult ------- `);

      let newAgentsWithTicket = [];
      if (_.has(req.query, 'idCampain') && req.query.idCampain != '') {
        ticketResult.map((ticket) => {
          let isAgent = newAgentsList.find((agent) => ticket.idAgentCisco == agent.agentID);
          if (isAgent) {
            return newAgentsWithTicket.push({
              ...isAgent,
              totalTicket: ticket.totalTicket,
              ticketDone: ticket.ticketDone,
            });
          }
        });
      } else {
        // Map ticket vào agent 
        newAgentsWithTicket = newAgentsList.map((agent) => {
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
      }

      console.log(`------- newAgentsWithTicket ------- `);
      console.log(newAgentsWithTicket);
      console.log(`------- newAgentsWithTicket ------- `);

      if (!newAgentsWithTicket || newAgentsWithTicket.length <= 0) {
        throw new Error('Không tìm thấy các trường phù hợp!');
      }

      // Export excel
      if (_.has(req.query, 'exportExcel') && req.query.exportExcel) {
        const createExcelResult = await exportExcel(req, newAgentsWithTicket);
        return res.json({ code: 200, linkFile: createExcelResult });
      }

      return res.json({ code: 200, data: newAgentsWithTicket });
    } catch (error) {
      console.log(`------- error ------- report-outbound-overall-agent-productivity`);
      console.log(error);
      console.log(`------- error ------- report-outbound-overall-agent-productivity`);
      return res.json({ code: 500, error: error.message ? error.message : error });
    }
  },
  html: async function (req, res) {
    try {
      // Kiểm tra quyền truy cập
      if (!req.session.auth.company || !req.session.auth.company.leader) {
        throw new Error('Không đủ quyền truy cập!');
      }

      let campaignQuery = {};
      let companyQuery = {};
      let groupQuery = {};
      let userQuery = {};

      campaignQuery.idCompany = req.session.auth.company._id;
      companyQuery._id = _.convertObjectId(req.session.auth.company._id);
      groupQuery.idParent = req.session.auth.company._id;

      const campainResult = await _Campains.find(campaignQuery);

      const companyDistinctResult = await _Company.distinct("_id", companyQuery)

      // Lấy danh sách agent
      const agentsInfoResult = await getAgentDetailInfo();
      console.log(`------- agentsInfoResult ------- `);
      console.log(agentsInfoResult);
      console.log(`------- agentsInfoResult ------- `);

      const companyResult = await _Company.find(companyQuery);

      return _.render(req, res, 'report-outbound-overall-agent-productivity', {
        title: 'Báo cáo gọi ra - Báo tổng quát năng suất điện thoại viên',
        result: [],
        company: companyResult,
        campaign: campainResult,
        agent: agentsInfoResult,
        plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel']
      }, true, null)
    } catch (error) {
      console.log(`------- error ------- report-outbound-overall-agent-productivity`);
      console.log(error);
      console.log(`------- error ------- report-outbound-overall-agent-productivity`);

      return _.render(req, res, 'report-outbound-overall-agent-productivity', {
        title: 'Báo cáo gọi ra - Báo tổng quát năng suất điện thoại viên',
        result: [],
        company: [],
        campaign: [],
        agent: [],
        plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel']
      }, true, error);
    }
  }
}

function exportExcel(req, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let currentDate = new Date();
      let folderName = req.session.user._id + "-" + currentDate.getTime();
      let fileName = titlePage + ' ' + _moment(currentDate).format('DD-MM-YYYY');

      let dataHeader = {
        TXT_AGENT: "displayName",
        TXT_TOTAL_CALL: "totalCall",
        TXT_TOTAL_DURATION: "totalCallTime",
        TXT_AVG_DURATION: "avgCallTime",
        TXT_TOTAL_CONNECTED: "totalCallConnect",
        TXT_WAIT_DURATION: "totalWaitTime",
        TXT_CALL_DURATION: "totalTalkTime",
        TXT_AVG_CALL_DURATION: "avgTalkTime",
        TXT_AVG_PRODUCTIVITY: "avgProductivity",
        TXT_TOTAL_TICKET: "totalTicket",
        TXT_PROCESSED_TICKET: "ticketDone",
      }

      let newData = data.map((item) => {
        return {
          displayName: item.displayName,
          totalCall: item.totalCall,
          totalCallTime: hms(item.totalCallTime),
          avgCallTime: hms(item.avgCallTime),
          totalCallConnect: item.totalCallConnect,
          totalWaitTime: hms(item.totalWaitTime),
          totalTalkTime: hms(item.totalTalkTime),
          avgTalkTime: hms(
            item.totalCallConnect && item.totalCallConnect > 0
              ? item.totalTalkTime / item.totalCallConnect
              : 0
          ),
          avgProductivity: percentConvert(item.totalCallConnect, item.totalCall),
          totalTicket: item.totalTicket,
          ticketDone: item.ticketDone,
        }
      });

      let totalCall = 0;
      let totalCallTime = 0;
      let avgCallTime = 0;
      let totalCallConnect = 0;
      let totalWaitTime = 0;
      let totalTalkTime = 0;
      let avgTalkTime = 0;
      let avgProductivity = '';
      let totalTicket = 0;
      let ticketDone = 0;

      data.forEach((item) => {
        totalCall += item.totalCall;
        totalCallTime += item.totalCallTime;
        avgCallTime += item.avgCallTime;
        totalCallConnect += item.totalCallConnect;
        totalWaitTime += item.totalWaitTime;
        totalTalkTime += item.totalTalkTime;
        avgTalkTime += item.totalCallConnect && item.totalCallConnect > 0
          ? item.totalTalkTime / item.totalCallConnect
          : 0;
        totalTicket += item.totalTicket;
        ticketDone += item.ticketDone;
      });

      let sumRows = [
        ('TỔNG'),
        totalCall,
        hms(totalCallTime),
        hms(avgCallTime),
        totalCallConnect,
        hms(totalWaitTime),
        hms(totalTalkTime),
        hms(avgTalkTime),
        percentConvert(totalCallConnect, totalCall),
        totalTicket,
        ticketDone,
      ]

      await createExcel(
        req,
        req.query.startDate,
        req.query.endDate,
        titlePage,
        dataHeader,
        'REPORT_OVERALL_AGENT_PRODUCTIVITY',
        folderName,
        null,
        fileName,
        newData,
        sumRows,
        { valueWidthColumn: [20, 20, 20, 20, 20, 20, 20, 20, 20, 15, 15, 15] },
      );


      await fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'));

      await fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'));

      let folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
      let folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
      await createFile(folderPath, folderZip);
      const zipFolderResult = folderZip.replace(_rootPath, '');

      return resolve(zipFolderResult);
    } catch (error) {
      return reject(error);
    }
  })
}

function percentConvert(num1, num2) {
  if (!num2 || num2 == 0) return '0%';
  const percent = (num1 / num2) * 100;

  if (Number.isInteger(percent)) {
    return `${percent}%`;
  }
  return `${percent.toFixed(2)}%`;
}

function hms(secs) {
  if (isNaN(secs) || !secs || secs == 0) return "0:00:00";
  var sec = Math.ceil(secs);
  var minutes = Math.floor(sec / 60);
  sec = sec % 60;
  var hours = Math.floor(minutes / 60)
  minutes = minutes % 60;
  return hours + ":" + pad(minutes) + ":" + pad(sec);
}

function pad(num) {
  return ("0" + num).slice(-2);
}

// Chuyển callback thành promise
function createFile(folderPath, folderZip) {
  return new Promise((resolve, reject) => {
    zipFolder(folderPath, folderZip, function (error, result) {
      if (error) {
        return reject(error);
      }
      return resolve(result);
    });
  })
}

// Chuyển callback thành promise
function createExcel(
  req,
  startTime,
  endTime,
  titleTable,
  excelHeader,
  configHeader,
  folderName,
  lastFolderName,
  fileName,
  data,
  sumRows,
  opts,
) {
  return new Promise((resolve, reject) => {
    createExcelFile(
      req,
      startTime,
      endTime,
      titleTable,
      excelHeader,
      configHeader,
      folderName,
      lastFolderName,
      fileName,
      data,
      sumRows,
      opts,
      function (error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      }
    );
  })
}