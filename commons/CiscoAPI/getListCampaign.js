var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function (data, callBack) {
  let pathApiGetListCompaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign"
  let option = {
    'auth': _config.cisco.auth,
    rejectUnauthorized: false
  }
  request.get(pathApiGetListCompaign, option, function (err, response, body) {
    if (!err) {
      // parse xml to object
      parseString(body, function (err, resultParse) {
        if (resultParse) {
          var listCampaignJson = JSON.stringify(resultParse);
          var listCompaignObject = JSON.parse(listCampaignJson);
          if (listCompaignObject && listCompaignObject.results.campaigns && listCompaignObject.results.campaigns[0]) {
            let campaignsFromCisco = listCompaignObject.results.campaigns[0].campaign
            let dataNext = {
              skillGroupsFromCisco: data,
              campaignsFromCisco: campaignsFromCisco
            }
            callBack(null, dataNext)
          }
        }
      });
    }
  });
}