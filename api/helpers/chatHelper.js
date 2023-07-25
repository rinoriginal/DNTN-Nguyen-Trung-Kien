
const getDataChatWait = (query, callback) => {
  let queryString = `
                    SELECT EGPL_CASEMGMT_ACTIVITY.ACTIVITY_ID
                    ,[ACTIVITY_STATUS]
                    ,[ACTIVITY_SUB_STATUS]
                    ,[WHEN_CREATED]
                    ,[QUEUE_ID]
                    ,[CONTACT_POINT_DATA]
                    ,EGLV_SESSION.CHAT_STATUS
                FROM [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY] EGPL_CASEMGMT_ACTIVITY
                INNER join [eGActiveDB].[dbo].[EGLV_SESSION] EGLV_SESSION on EGPL_CASEMGMT_ACTIVITY.ACTIVITY_ID = EGLV_SESSION.ACTIVITY_ID
                where WHEN_CREATED >= '${query.startDate}'
                and WHEN_CREATED <= '${query.endDate}'
                and QUEUE_ID = ${query.QUEUE_ID} 
                and CHAT_STATUS = 1 and ACTIVITY_STATUS in( 5000,4000)
                and ACTIVITY_SUB_STATUS in (5100,4100)
                    `;
  _requestMssql.query(queryString, function (err, recordset) {
    if (err) {
      callback(err, null)
    } else {
      callback(null, recordset.recordset)
    }

  });
}
const getFlowChatByActivityId = (activityId) => new Promise((resolve, reject) => {
  let queryString = `
    SELECT
      [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID],
      [eGActiveDB].[dbo].[EGLV_SESSION].[ENTRY_POINT_ID],
      [eGActiveDB].[dbo].[EGLV_SESSION].[CUST_DISPLAY_NAME],
      [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_POINT_DATA],
      [eGActiveDB].[dbo].[EGPL_CASEMGMT_CPOINT_PHONE].[PHONE_NUMBER]
    FROM
      [eGActiveDB].[dbo].[EGLV_SESSION]
      LEFT JOIN [eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT] 
        ON [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT].[ACTIVITY_ID]
      LEFT JOIN [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY] 
        ON [eGActiveDB].[dbo].[EGLV_SESSION].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
      LEFT JOIN [eGActiveDB].[dbo].[EGPL_CASEMGMT_CONTACT_POINT] 
        ON [eGActiveDB].[dbo].[EGPL_CASEMGMT_CONTACT_POINT].[CONTACT_PERSON_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[CONTACT_PERSON_ID]
      LEFT JOIN [eGActiveDB].[dbo].[EGPL_CASEMGMT_CPOINT_PHONE] 
        ON [eGActiveDB].[dbo].[EGPL_CASEMGMT_CPOINT_PHONE].[CONTACT_POINT_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_CONTACT_POINT].[CONTACT_POINT_ID] 
    WHERE
      [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID] = ${activityId}
    ORDER BY
      [eGActiveDB].[dbo].[EGPL_CASEMGMT_CPOINT_PHONE].[WHEN_MODIFIED] DESC
  `;

  _requestMssql.query(queryString, function (err, recordset) {
    if (err) return reject(err);

    if (!recordset || !recordset.recordset || recordset.recordset.length <= 0) {
      const error = new Error('Không tìm thấy hội thoại với activityId!');
      return reject(error);
    }

    return resolve(recordset.recordset[0]);
  });
});

module.exports = {
  getFlowChatByActivityId,
  getDataChatWait: getDataChatWait
};

