var request = require('request');
var parseString = require('xml2js').parseString;

var _config = require(path.join(_rootPath, 'config', 'conf.json'));

module.exports = function (prefix, callback) {
  let pathApiSkillGroup = _config.cisco.ipApi + `/unifiedconfig/config/skillgroup?selectedAgentCount=60001&q=${prefix}`
  let codeCompany = _config.app.codeCompany
  let option = {
    'auth': _config.cisco.auth,
    rejectUnauthorized: false
  }
  request.get(pathApiSkillGroup, option, function (err, response, body) {
    // select a skillgroup and update on the campaign table
    var listSkillGroupXml = body
    if (!err) {
      // parse xml to object
      parseString(listSkillGroupXml, function (errParse, resultParse) {
        if (resultParse) {
          listSkillGroupXml = resultParse;
          var listSkillGroupsJson = JSON.stringify(listSkillGroupXml);
          var listSkillGroupsObject = JSON.parse(listSkillGroupsJson);
          if (listSkillGroupsObject && listSkillGroupsObject.results.skillGroups && listSkillGroupsObject.results.skillGroups[0]) {
            let typeSkillGroup = _config.skillGroupFor;
            let skillGroupsFromCisco = listSkillGroupsObject.results.skillGroups[0].skillGroup;

            // skillGroupsFromCisco = skillGroupsFromCisco.filter(item => {
            //   if (typeSkillGroup.DEV) {
            //     if (item.name[0] && item.name[0].search("DEV") > -1) {
            //       if (item.peripheralNumber[0] && item.peripheralNumber[0].slice(0, 6) == typeSkillGroup.DEV) {
            //         return item
            //       }
            //     }
            //   }
            //   if (typeSkillGroup.UAT) {
            //     if (item.peripheralNumber[0] && item.peripheralNumber[0].slice(0, 6) == typeSkillGroup.UAT) {
            //       return item
            //     }
            //     // if (item.name[0] && item.name[0].search("UAT") > -1) {
            //     //   if (item.peripheralNumber[0] && item.peripheralNumber[0].slice(0, 6) == typeSkillGroup.DEV) {
            //     //     return item
            //     //   }
            //     // }
            //   }
            //   if (typeSkillGroup.PRO) {
            //     if (item.peripheralNumber[0] && item.peripheralNumber[0].slice(0, 6) == codeCompany.slice(0, 6)) {
            //       return item
            //     }
            //   } 
  

            // })
            callback(null, skillGroupsFromCisco)
          }
        }
      });
    }
  })
}