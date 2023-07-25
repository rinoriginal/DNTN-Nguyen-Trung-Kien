const request = require("request");
var { getRequestPromise } = require(path.join(
  _rootPath,
  "commons",
  "functions",
  "api.report"
));

module.exports = {
  getAgentTeamInfo,
  getAgentTeamMemberInfo,
  getAgentDetailInfo,
  getDataTCDOutboundbyAgent,
  getDataOutboundOverall,
  getDataRecoding
};
/**
 * query lên cisco lấy thông tin của agent team theo prefix
 */
function getAgentTeamInfo(config) {
  return new Promise((resolve, reject) => {
    let options = {
      prefix: config.prefix,
    };

    getRequestPromise(config, `agent/agentTeam`, options)
      .then((data, totalData) => {
        resolve(data, totalData);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
}
/**
 * query lên cisco lấy thông tin của agent team theo prefix
 */
function getAgentTeamMemberInfo(config) {
  return new Promise((resolve, reject) => {
    let options = {
      Agent_Team: config.Agent_Team,
    };

    getRequestPromise(config, `agent/AgentMemberTeam`, options)
      .then((data, totalData) => {
        resolve(data, totalData);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
}

/**
 * Hàm này sẽ dùng cho những trang báo cáo có filter agent
 * query lên cisco lấy thông tin của agent team theo prefix
 * sau đó mapping dữ liệu với telehub để lấy tên và tên hiển thị, ...
 *
 */
function getAgentDetailInfo() {
  return new Promise(async (resolve, reject) => {
      try {
          let config = await _Config.findOne({});
          let agentInfos = await getAgentTeamMemberInfo(config);
          let idsAgent = agentInfos.map(i => Number(i.PeripheralNumber));
          let agentInfoTelehub = await _Users.find({ idAgentCisco: { $in: idsAgent } });

          agentInfos.forEach(i => {
              let agentFound = agentInfoTelehub.find(j => j.idAgentCisco == i.PeripheralNumber);

              if (agentFound) {
                  i._id = i.PeripheralNumber;
                  i.name = agentFound.name;
                  i.displayName = agentFound.displayName;
              } else {
                  i._id = i.PeripheralNumber;
                  i.name = i.PeripheralNumber;
                  i.displayName = i.EnterpriseName;
              }
          });

          return resolve(agentInfos);
      } catch (err) {
          return reject(err);
      }
  })
}

async function getDataTCDOutboundbyAgent(config, query) {
  return new Promise((resolve, reject) => {
    try {
      let pathApi = config.ipCiscoReport + `/api/v1/${config.pathURL}?`;
      let opts = {
        headers: {
          "x-access-token": config.tokenDefault,
        },
        json: true,
      };

      if(query.agentTeamId) pathApi += `agentTeamId=${query.agentTeamId}&`;
      if(query.startDate) pathApi += `startDate=${query.startDate}&`;
      if(query.endDate) pathApi += `endDate=${query.endDate}&`;
      if(query.agentId) pathApi += `agentId=${query.agentId}&`;

      request.get(pathApi, opts, (err, response, body) => {
        if (!err && response && response.statusCode == 200) {
          return resolve(body.data);
        } else {
          return reject(
            err && err.message
              ? err.message
              : body && body.message
              ? body.message
              : "Có lỗi xảy ra"
          );
        }
      });
    } catch (error) {
      console.log(`------- error ------- `);
      console.log(error);
      console.log(`------- error ------- `);
      return reject(error);
    }
  });
}

async function getDataOutboundOverall(config, query) {
  return new Promise((resolve, reject) => {
      try {
          let pathApi = config.ipCiscoReport + `/api/v1/${config.pathURL}?`;
          let opts = {
              headers: {
                  'x-access-token': config.tokenDefault,
              },
              json: true
          }

          if (query.agentTeamId) pathApi += `agentTeamId=${query.agentTeamId}&`;
          if (query.startDate) pathApi += `startDate=${query.startDate}&`;
          if (query.endDate) pathApi += `endDate=${query.endDate}&`;
          if (query.agentId) pathApi += `agentId=${query.agentId}&`;
          if (query.page) pathApi += `page=${query.page}&`;

          request.get(pathApi, opts, (err, response, body) => {
              if (!err && (response && response.statusCode == 200)) {
                  return resolve(body);
              } else {
                  return reject(err && err.message ? err.message : (body && body.message ? body.message : "Có lỗi xảy ra"));
              }
          });
      } catch (error) {
          console.log(`------- error ------- `);
          console.log(error);
          console.log(`------- error ------- `);
          return reject(error);
      }
  })
}

function getDataRecoding(opts, download = false) {
  return new Promise((resolve, reject) => {
      try {
          let { startDate, endDate, pages, limit, config, agentInfoTelehub, filter } = opts
          let pathAPI = config.ipRecording + "/api/v1/cdr/byprefix";
          let query = [];
          let option = {
              headers: {
                  "x-access-token": config.tokenDefault,
              },
              json: true
          }

          query.push(`startDate=${startDate}`);
          query.push(`endDate=${endDate}`);
          query.push(`prefix=${config.prefix}`);
          query.push(`pages=${pages}`);
          query.push(`limit=${limit}`);
          query.push(`download=${download ? 1 : 0}`);

          if (filter) {
              let { agentId, direction, phone, extension } = filter;

              if (agentId) query.push(`agentId=${agentId.join(',')}`);
              if (direction) query.push(`direction=${direction}`);
              if (phone) query.push(`phone=${phone}`);
              if (extension) query.push(`extension=${extension}`);
          }

          request.get(pathAPI + "?" + query.join("&"), option, function (err, response, body) {
              if (!err && (response && response.statusCode == 200) && body.data) {
                  return resolve(body.data.results);
              } else {
                  return reject(err ? err.message : (body && body.message ? body.message : "Có lỗi xảy ra"));
              }
          });
      } catch (error) {
          return reject(error);
      }
  })
}