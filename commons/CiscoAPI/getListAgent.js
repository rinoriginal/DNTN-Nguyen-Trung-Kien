var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function (callback) {
  var pathApiGetListAgent = _config.cisco.ipApi + "/unifiedconfig/config/agent"
  var option = {
    'auth': _config.cisco.auth,
    rejectUnauthorized: false
  }
  request.get(pathApiGetListAgent, option, function (err, response, body) {
    if (!err) {
      // parse xml to object
      parseString(body, function (err, resultParse) {
        if (resultParse) {
          var listAgentJson = JSON.stringify(resultParse);
          var listAgentObject = JSON.parse(listAgentJson);
          if (listAgentObject && listAgentObject.results.agents && listAgentObject.results.agents[0]) {
            let listAgentFromCisco = listAgentObject.results.agents[0].agent
            let dataNext = {
              listAgentFromCisco: listAgentFromCisco,
            }
            callback(null, dataNext)
          }
        }
      });
    }
  });
}