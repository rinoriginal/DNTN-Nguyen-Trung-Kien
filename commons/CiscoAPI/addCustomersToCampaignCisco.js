var request = require('request');

module.exports = function (data, callback) {
  let campaignTelehub = data.campaign
  let cusctomers = data.customers
  let rowCustomer = ""
  let ternalId = _config.app._id
  for (let item of cusctomers) {
    let rowItem = `${item._id},${campaignTelehub._id.toString()},${ternalId},${item.field_so_dien_thoai},720,false \n`
    rowCustomer = rowCustomer + rowItem
  }

  let dataCustomer = `
  <import>
      <fileContent>
          <![CDATA[
          AccountNumber,FirstName,LastName,Phone01,TimeZoneBias,DstObserved
          ${rowCustomer}
          ]]>
      </fileContent>
      <delimiter>,</delimiter>
  </import>
  `
  var pathApiImportCustomerToCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + campaignTelehub.idCompaignCreatedByCisco + "/import"
  request.post({
    url: pathApiImportCustomerToCampaign,
    method: "POST",
    'auth': _config.cisco.auth,
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'application/xml',
      "Accept": "application/xml"
    },
    body: dataCustomer
  }, function (error, response, body) {
    if (response && response.statusCode == 200) {
      let dataNext = {
        customers: data.customers,
        campaign: data.campaign,
      }
      callback(null, dataNext)
    } else {
      callback(null, null)
    }
  });
}