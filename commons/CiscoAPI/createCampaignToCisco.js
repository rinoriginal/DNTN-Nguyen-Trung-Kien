var request = require('request');

module.exports = function (data, callback) {
  let campaignTelehub = data.campaignTelehub
  let skillGroupSelected = data.skillGroup;
  let startDate = ""
  let endDate = ""
  if (campaignTelehub.startDate) {
    startDate = _moment(campaignTelehub.startDate).format('YYYY-MM-DD')
  }
  if (campaignTelehub.endDate) {
    endDate = _moment(campaignTelehub.endDate).format('YYYY-MM-DD')
  }
  let status = false
  if (campaignTelehub.status) {
    status = true
  }
  if (skillGroupSelected) {
    var dataCampaign = `
  <campaign>
      <name>${campaignTelehub._id}</name>
      <description>test</description>
      <startDate>${startDate}</startDate>
      <endDate>${endDate}</endDate>
      <startTime>${campaignTelehub.startTime}</startTime>
      <endTime>${campaignTelehub.endTime}</endTime>
      <enabled>${status}</enabled>
      <campaignPrefix>0${campaignTelehub.campaignPrefix}</campaignPrefix>
      <dialingMode>${campaignTelehub.autoDialingMode}</dialingMode>
      <linesPerAgent>1.0</linesPerAgent>
      <maxAttempts>3</maxAttempts>
      <maximumLinesPerAgent>1.0</maximumLinesPerAgent>
      <noAnswerRingLimit>4</noAnswerRingLimit>
      <retries>
          <answeringMachineDelay>1</answeringMachineDelay>
          <busySignalDelay>1</busySignalDelay>
          <customerAbandonedDelay>1</customerAbandonedDelay>
          <customerNotHomeDelay>1</customerNotHomeDelay>
          <dialerAbandonedDelay>1</dialerAbandonedDelay>
          <noAnswerDelay>1</noAnswerDelay>
      </retries>
      <skillGroupInfos>
          <skillGroupInfo>
              <ivrPorts>0</ivrPorts>
              <overflowAgents>0</overflowAgents>
              <recordsToCache>10</recordsToCache>
              <dialedNumber>${campaignTelehub.dialedNumber}</dialedNumber>
              <skillGroup>
                  <refURL>${skillGroupSelected.refURL[0]}</refURL>
                  <name>${skillGroupSelected.name[0]}</name>
              </skillGroup>
          </skillGroupInfo>
      </skillGroupInfos>
      <timeZone>
          <refURL>/unifiedconfig/config/timezone/SE%20Asia%20Standard%20Time</refURL>
          <name>SE Asia Standard Time</name>
          <displayName>(UTC+07:00) Bangkok, Hanoi, Jakarta</displayName>
          <stdName>SE Asia Standard Time</stdName>
          <dstName>SE Asia Daylight Time</dstName>
          <bias>-420</bias>
          <dstObserved>false</dstObserved>
      </timeZone>
      <callProgressAnalysis>
          <enabled>false</enabled>
          <record>false</record>
          <minSilencePeriod>608</minSilencePeriod>
          <analysisPeriod>2500</analysisPeriod>
          <minimumValidSpeech>112</minimumValidSpeech>
          <maxTimeAnalysis>3000</maxTimeAnalysis>
          <maxTermToneAnalysis>30000</maxTermToneAnalysis>
      </callProgressAnalysis>
  </campaign>`
    var pathApiCreateCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign"
    request.post({
      url: pathApiCreateCampaign,
      method: "POST",
      'auth': _config.cisco.auth,
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/xml',
        "Accept": "application/xml"
      },
      body: dataCampaign
    }, function (error, response, body) {
      if (!error) {
        let dataNext = {
          campaignTelehub: data.campaignTelehub,
          skillGroup: data.skillGroup
        }
        callback(null, dataNext)
      }
    });
  }
}