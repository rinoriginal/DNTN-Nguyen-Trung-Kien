var request = require('request');

module.exports = function (data, callback) {
  let campaignTelehub = data.campaign
  var pathApiDeleteCustomerToCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + campaignTelehub.idCompaignCreatedByCisco + "/import"
  request.delete({
    url: pathApiDeleteCustomerToCampaign,
    method: "DELETE",
    'auth': _config.cisco.auth,
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'text/plain',
      "Accept": "application/xml"
    },
  }, function (error, response, body) {
    if (response && response.statusCode == 200) {
      callback(null, data.cusctomers)
    } else {
      callback(null, null)
    }
  });
}