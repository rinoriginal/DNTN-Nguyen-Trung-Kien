var request = require('request');

module.exports = function (data, callback) {
  var pathApiUpdateSkillGroupCampaign = _config.cisco.ipApi + data.skillGroup.urlSkillGroup;
  let listAgentMap = data.listAgentForSkillGroup;
  let stringListAgentXml = ''
  if (listAgentMap.length > 0) {
    for (let item of listAgentMap) {
      let agentXml = `
          <agent>
              <refURL>${item.refURL[0]}</refURL>
              <agentId>${item.agentId[0]}</agentId>
              <firstName>${item.person[0].firstName[0]}</firstName>
              <lastName>${item.person[0].lastName[0]}</lastName>
              <userName>${item.person[0].userName[0]}</userName>
              <agentTeam>
                  <refURL>${item.agentTeam[0].refURL[0]}</refURL>
                  <name>${item.agentTeam[0].name[0]}</name>
              </agentTeam>
              <canRemove>false</canRemove>
          </agent>
          `
      stringListAgentXml = stringListAgentXml + agentXml;
    }
  }
  let dataSkillGroupUpdate = `
  <skillGroup>
      <changeStamp>${data.skillGroup.changeStamp}</changeStamp>
      <agents>
          ${stringListAgentXml}
      </agents>
  </skillGroup>
  `
  request.put({
    url: pathApiUpdateSkillGroupCampaign,
    method: "PUT",
    'auth': _config.cisco.auth,
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'application/xml',
      "Accept": "application/xml"
    },
    body: dataSkillGroupUpdate
  }, function (error, response, body) {
    if (!error) {
      callback(null, data)
    }
  })
}