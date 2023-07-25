var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function (data, callBack) {
  let campaignCreatedTelehub = data.campaignTelehub
  let campaignCreated = null;
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
          let listCampaignJson = JSON.stringify(resultParse);
          let listCompaignObject = JSON.parse(listCampaignJson);
          if (listCompaignObject && listCompaignObject.results.campaigns && listCompaignObject.results.campaigns[0]) {
            let campaignsFromCisco = listCompaignObject.results.campaigns[0].campaign
            if (campaignsFromCisco.length > 0) {
              for (let item of campaignsFromCisco) {
                if (item.name[0] === campaignCreatedTelehub._id.toString()) {
                  campaignCreated = item
                  break;
                }
              }
              // get id campain from cisco
              if (campaignCreated) {
                let refURL = campaignCreated.refURL[0]
                let idCompaignCisco = refURL.replace("/unifiedconfig/config/campaign/", '')
                // insert idCompaignCreatedByCisco
                _Campains.findByIdAndUpdate(
                  campaignCreatedTelehub._id.toString(), {
                  $set: {
                    idCompaignCreatedByCisco: Number(idCompaignCisco.trim()),
                  }
                }, { new: true },
                  function (err, result) {
                    let dataNext = {
                      campaignTelehub: data.campaignTelehub,
                      skillGroup: data.skillGroup
                    }
                    callBack(null, dataNext)
                  });
              }
            }
          }
        }
      });
    }
  });
}