const jwt = require("jsonwebtoken");

const getMailByActivityId = (activityId) => new Promise((resolve, reject) => {
  try {
    let queryString = `
      SELECT [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
        ,[CASE_ID]
        ,[eGActiveDB].[dbo].[EGML_EMAIL].[SUBJECT]
        ,[eGActiveDB].[dbo].[EGML_EMAIL].[EMAIL_SIZE]
        ,[eGActiveDB].[dbo].[EGML_EMAIL].[FROM_EMAIL_ADDRESS]
        ,[eGActiveDB].[dbo].[EGML_EMAIL].[RECV_EMAIL_ADDRESS]
        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].[CONTENT]
        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].CONTENT_TYPE
        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].HEADER
        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT].[TEXT_CONTENT]
        ,[eGActiveDB].[dbo].[EGPL_USER].[USER_NAME]
        ,[ACTIVITY_MODE]
        ,[ACTIVITY_TYPE]
        ,[ACTIVITY_SUB_TYPE]
        ,[ACTIVITY_STATUS]
        ,[ACTIVITY_SUB_STATUS]
        ,[ACTIVITY_PRIORITY]
        ,[eGActiveDB].[dbo].[EGML_EMAIL].[ALIAS_ID]
        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_CREATED]
        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHO_CREATED]
        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_MODIFIED]
        ,[DUE_DATE]
        ,[USER_LAST_WORKED]
        ,[ASSIGNED_TO]
        ,[DESCRIPTION]
        ,[LANGUAGE_ID]
        ,[CUSTOMER_ID]
        ,[CONTACT_PERSON_ID]
        ,[QUEUE_ID]
        ,[CONTACT_POINT_ID]
        ,[CONTACT_POINT_DATA]
        ,[LAST_ACTION_REASON]
        ,[PINNED]
        ,[LOCKED]
        ,[ACTIVITY_ACCESS]
        ,[FOLDER_ID]
        ,[LAST_DEPARTMENT_ID]
        ,[SAVE_DRAFT_FLAG]
        ,[LEAVE_OPEN_FLAG]
        ,[NUM_NOTES]
        ,[CASE_TYPE]
        ,[CONFERENCE_FLAG]
        ,[IS_ESCALATED]
        ,[EGPL_CASEMGMT_ACTIVITY].[CREATE_DATE]
        ,[EGPL_CASEMGMT_ACTIVITY].[UPDATE_VERSION]
        ,[OUTBOUND_FAILED]
        ,[VISITOR_SESSION_ID]
        ,[VISITOR_USER_ID]
        ,[CUST_ACCOUNT_ID]
        ,[DELAY_TIME_IN_MIN]
        ,[ISSUE_TYPE_ID]
        ,[IS_AUTHENTICATED]
      FROM [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY]
      INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL]
      ON [eGActiveDB].[dbo].[EGML_EMAIL].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
      INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL_DATA]
      ON [eGActiveDB].[dbo].[EGML_EMAIL_DATA].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
      INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT]
      ON [eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT].[ACTIVITY_ID] =  [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
      LEFT JOIN [eGActiveDB].[dbo].[EGPL_USER]
      ON [eGActiveDB].[dbo].[EGPL_USER].[USER_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHO_CREATED]
      WHERE [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID] >= '${activityId}'
    `;

    _requestMssql.query(queryString, function (err, recordset) {
      if (err) {
        return reject(false);
      }

      let mailInboundCisco = (recordset && recordset.recordset);

      if (mailInboundCisco.length > 0) {
        return resolve(mailInboundCisco[0]);
      } else {
        return reject(false);
      }
    });

  } catch (error) {
    console.log(`------- error ------- `);
    console.log(error);
    console.log(`------- error ------- `);
    return reject(error);
  }
});

const getFlowMailByActivityId = (activityId, callback) => {
  let queryString = `
                    SELECT [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                        ,[CASE_ID]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL].[SUBJECT]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL].[EMAIL_SIZE]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL].[FROM_EMAIL_ADDRESS]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL].[RECV_EMAIL_ADDRESS]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].[CONTENT]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].CONTENT_TYPE
                        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA].HEADER
                        ,[eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT].[TEXT_CONTENT]
                        ,[eGActiveDB].[dbo].[EGPL_USER].[USER_NAME]
                        ,[ACTIVITY_MODE]
                        ,[ACTIVITY_TYPE]
                        ,[ACTIVITY_SUB_TYPE]
                        ,[ACTIVITY_STATUS]
                        ,[ACTIVITY_SUB_STATUS]
                        ,[ACTIVITY_PRIORITY]
                        ,[eGActiveDB].[dbo].[EGML_EMAIL].[ALIAS_ID]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_CREATED]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHO_CREATED]
                        ,[eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHEN_MODIFIED]
                        ,[DUE_DATE]
                        ,[USER_LAST_WORKED]
                        ,[ASSIGNED_TO]
                        ,[DESCRIPTION]
                        ,[LANGUAGE_ID]
                        ,[CUSTOMER_ID]
                        ,[CONTACT_PERSON_ID]
                        ,[QUEUE_ID]
                        ,[CONTACT_POINT_ID]
                        ,[CONTACT_POINT_DATA]
                        ,[LAST_ACTION_REASON]
                        ,[PINNED]
                        ,[LOCKED]
                        ,[ACTIVITY_ACCESS]
                        ,[FOLDER_ID]
                        ,[LAST_DEPARTMENT_ID]
                        ,[SAVE_DRAFT_FLAG]
                        ,[LEAVE_OPEN_FLAG]
                        ,[NUM_NOTES]
                        ,[CASE_TYPE]
                        ,[CONFERENCE_FLAG]
                        ,[IS_ESCALATED]
                        ,[EGPL_CASEMGMT_ACTIVITY].[CREATE_DATE]
                        ,[EGPL_CASEMGMT_ACTIVITY].[UPDATE_VERSION]
                        ,[OUTBOUND_FAILED]
                        ,[VISITOR_SESSION_ID]
                        ,[VISITOR_USER_ID]
                        ,[CUST_ACCOUNT_ID]
                        ,[DELAY_TIME_IN_MIN]
                        ,[ISSUE_TYPE_ID]
                        ,[IS_AUTHENTICATED]
                    FROM [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY]
                    INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL]
                    ON [eGActiveDB].[dbo].[EGML_EMAIL].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                    INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL_DATA]
                    ON [eGActiveDB].[dbo].[EGML_EMAIL_DATA].[ACTIVITY_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                    INNER JOIN [eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT]
                    ON [eGActiveDB].[dbo].[EGML_EMAIL_DATA_ALT].[ACTIVITY_ID] =  [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID]
                    LEFT JOIN [eGActiveDB].[dbo].[EGPL_USER]
                    ON [eGActiveDB].[dbo].[EGPL_USER].[USER_ID] = [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[WHO_CREATED]
                    WHERE [eGActiveDB].[dbo].[EGPL_CASEMGMT_ACTIVITY].[ACTIVITY_ID] >= '${activityId}'
                    `;
  _requestMssql.query(queryString, function (err, recordset) {
    if (err) {
      callback(false)
    }
    let mailInboundCisco = (recordset && recordset.recordset)
    if (mailInboundCisco.length > 0) {
      callback(mailInboundCisco[0])
    } else {
      callback(false)
    }

  });
}
module.exports = {
  getFlowMailByActivityId: getFlowMailByActivityId,
  getMailByActivityId,
};
