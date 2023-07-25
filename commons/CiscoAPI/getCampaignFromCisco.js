var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function (data, callback) {
  let idCampaign = data.campaignTelehub.idCompaignCreatedByCisco
  var pathApiGetListCompaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + idCampaign
  var option = {
    'auth': _config.cisco.auth,
    rejectUnauthorized: false
  }
  request.get(pathApiGetListCompaign, option, function (err, response, body) {
    if (!err) {
      parseString(body, function (err, result) {
        if (result) {
          let campaignCiscoJson = JSON.stringify(result);
          let campaignObject = JSON.parse(campaignCiscoJson);
          if (campaignObject && campaignObject.campaign) {
            campaignObject = campaignObject.campaign
            let dataNext = {
              campaignFromCisco: campaignObject,
              campaignTelehub: data.campaignTelehub,
              skillGroup: data.skillGroup
            }
            callback(null, dataNext)
          }
        }
      });
    }
  });
}