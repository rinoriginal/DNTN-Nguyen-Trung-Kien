let request = require('request');

module.exports = function (data, callback) {
  try {
    let pathApiUpdateSkillGroupCampaign = _config.cisco.ipApi + '/unifiedconfig/config/skillgroup/' + data.skillGroup.skillGroupId;

    let listAgentMap = data.listAgentForSkillGroup;
    let stringListAgentXml = ''
    if (listAgentMap.length > 0) {
      for (let item of listAgentMap) {
        let agentXml = `
          <agent> 
            <refURL>/unifiedconfig/config/agent/${item.agentSkillTargetId}</refURL>
            <agentId>${item.agentId}</agentId>
            <firstName>${item.firstName}</firstName>
            <lastName>${item.lastName}</lastName>
            <userName>${item.loginName}</userName>
            <agentTeam>
              <refURL>/unifiedconfig/config/agentteam/${item.agentTeamId}</refURL>
              <name>${item.agentTeamName}</name>
            </agentTeam>
            <canRemove>false</canRemove>
          </agent>
        `;
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
    `;

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
      if (error) {
        console.log(`------- error ------- `);
        console.log(error);
        console.log(`------- error ------- `);
        return callback(new Error('Cập nhật skill group thất bại!'));
      }
      if (response.statusCode == 200) {
        return callback(null, data);
      }
      console.log(`------- body ------- `);
      console.log(body);
      console.log(`------- body ------- `);
      return callback(new Error('Cập nhật skill group thất bại!'));
    })
  } catch (error) {
    return callback(error);
  }
}