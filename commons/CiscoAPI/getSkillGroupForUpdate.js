var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function (data, callback) {
  let pathApiGetSkillGroup = _config.cisco.ipApi + data.idSkillGroup
  var option = {
    'auth': _config.cisco.auth,
    rejectUnauthorized: false
  }
  request.get(pathApiGetSkillGroup, option, function (err, response, body) {
    if (!err) {
      // parse xml to object
      parseString(body, function (err, resultParse) {
        if (resultParse) {
          var skillGroupJson = JSON.stringify(resultParse);
          var skillGroupObject = JSON.parse(skillGroupJson);
          if (skillGroupObject && skillGroupObject.skillGroup) {
            let skillGroupToCreate = skillGroupObject.skillGroup
            let dataNext = {
              listAgentForSkillGroup: data.listAgentForSkillGroup,
              skillGroup: skillGroupToCreate
            }
            callback(null, dataNext)
          }
        }
      });
    } else {
      console.log(`------- err ------- `);
      console.log(err);
      console.log(`------- err ------- `);
    }
  });
}