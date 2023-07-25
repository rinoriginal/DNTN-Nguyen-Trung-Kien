const request = require('request');
const MOMENT = require('moment');

function getInfoSkillGroup(configCisco, callback) {

    let pathApi = configCisco.ip + "/api/v1/skillGroup/byIds";
    let opts = {
        headers: {
            "x-access-token": configCisco.token,
        },
        json: true
    }
    let query = [];
    let ids = [];

    Object.keys(configCisco.skillGroup).forEach(item => {
        let element = configCisco.skillGroup[item];
        ids.push(element);
    });

    query.push(`ids=${ids}`);

    request.get(pathApi + "?" + query.join("&"), opts, function (err, response, body) {
        if (!err && (response && response.statusCode == 200)) {
            let data = body.data.recordset;
            callback(null, data);
        } else {
            callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
        }
    })
}

/**
 * 
 * @param {object} callTypes callType của cuộc gọi: tạo theo từng dự án, tương ứng với các nhóm agent, a TuấnPA tạo từ cisco
 * @param {object} skillGroups skillGroup của nhóm agent: mỗi skillGroup có callType toAgent và toQueue tương ứng, a TuấnPA tạo từ cisco
 */

function queryCallTypeDefault(callTypes, skillGroups, callTypeTranfer) {
    let query = [];
    let objMapper = { ...callTypes, ...skillGroups };

    Object.keys(objMapper).forEach(item => {
        let element = objMapper[item];
        if (item.includes("CT") || item.includes("SG_Voice")) query.push(`${item}=${element}`);
    });

    if (callTypeTranfer) query.push(`CT_Tranfer=${callTypeTranfer}`);

    return query;
}

/**
 * 
 * Do dùng chung cho dự án node v6 (GGG) và node 10 (kplus) nên ko được async/await --> dùng callback
 * @param {string} configCisco config cisco trong file conf.json | conf.dev.json
 * @param {string} pathURL sub url đến API telehub-cisco
 * @param {object} options các giá trị truyền thêm vào query
 * @param {function} callback callback truyền kết quả ra bên ngoài
 */
function getRequestDefault(configCisco, pathURL = `skillGroup/byIds`, options, callback) {
    let {
        status,
        queue,
        download,
        pages,
        rows,
        startDate,
        endDate,
        callType,
        skillGroup,
        skillGroups, // filter
        paging,
        duration_g,
        wait_g,
        groupBy,
        Agent_Team,
    } = options;
    let call_type_tranfer_voice = '';
    if (configCisco.callTypeTranfer && configCisco.callTypeTranfer.voice) call_type_tranfer_voice = configCisco.callTypeTranfer.voice;

    // dùng cho báo cáo cần realTime data
    let startDateByDay = MOMENT(startDate, 'YYYY-MM-DD HH:mm:ss').startOf('day').format('YYYY-MM-DD HH:mm:ss');
    let endDateByDay = MOMENT(endDate, 'YYYY-MM-DD HH:mm:ss').endOf('day').format('YYYY-MM-DD HH:mm:ss');

    let pathApi = configCisco.ip + `/api/v1/${pathURL}`;
    let opts = {
        headers: {
            "x-access-token": configCisco.token || configCisco.tokenDefault,
        },
        json: true
    }
    let query = queryCallTypeDefault(callType, skillGroup, call_type_tranfer_voice) || [];

    query.push(`startDate=${startDateByDay}`);
    query.push(`endDate=${endDateByDay}`);

    query.push(`startDateFilter=${startDate}`);
    query.push(`endDateFilter=${endDate}`);
    query.push(`queue=${queue}`);
    query.push(`status=${status}`);

    if (download === "1") {
        query.push(`download=1`);
    } else {
        if (pages) query.push(`pages=${pages}`);
        if (rows) query.push(`rows=${rows}`);
    }

    if (skillGroups) query.push(skillGroups);

    if (paging) query.push(paging);
    if (duration_g) query.push(duration_g);
    if (wait_g) query.push(wait_g);
    if (groupBy) query.push(groupBy);
    if (Agent_Team) query.push(`Agent_Team=${Agent_Team}`);

    // console.log(pathURL, startDateByDay, endDateByDay,  startDate, endDate);
    // console.log(pathApi + "?" + query.join("&"), opts);
    request.get(pathApi + "?" + query.join("&"), opts, function (err, response, body) {
        if (!err && (response && response.statusCode == 200)) {
            let data = body.data.recordset;
            let rowTotal = body.data.rowTotal;
            let page = body.pages ? parseInt(body.pages) : 1;
            let query = body.query;
            let raw = body.data;
            // let data = mappingData(result);
            callback(null, data, rowTotal, page, query, raw);

        } else {
            callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
        }
    });
}


/**
 * 
 * Do dùng chung cho dự án node v6 (GGG) và node 10 (kplus) nên ko được async/await --> dùng callback
 * @param {string} configCisco config cisco trong file conf.json | conf.dev.json
 * @param {string} pathURL sub url đến API telehub-cisco
 * @param {object} options các giá trị truyền thêm vào query
 * @param {function} callback callback truyền kết quả ra bên ngoài
 */
function getRequestPromise(configCisco, pathURL = `skillGroup/byIds`, options) {
    return new Promise((resolve, reject) => {
        let {
            download,
            pages,
            rows,
            startDate,
            endDate,
            callType,
            skillGroup,
            skillGroups, // filter
            paging,
            duration_g,
            wait_g,
            groupBy,
            prefix,
            Agent_Team,
        } = options;
        let call_type_tranfer_voice = '';
        if (configCisco.callTypeTranfer && configCisco.callTypeTranfer.voice) call_type_tranfer_voice = configCisco.callTypeTranfer.voice;

        // dùng cho báo cáo cần realTime data
        let startDateByDay = MOMENT(startDate, 'YYYY-MM-DD HH:mm:ss').startOf('day').format('YYYY-MM-DD HH:mm:ss');
        let endDateByDay = MOMENT(endDate, 'YYYY-MM-DD HH:mm:ss').endOf('day').format('YYYY-MM-DD HH:mm:ss');

        let pathApi = configCisco.ipCiscoReport + `/api/v1/${pathURL}`;
        let opts = {
            headers: {
                "x-access-token": configCisco.tokenDefault,
            },
            json: true
        }
        let query = queryCallTypeDefault(callType, skillGroup, call_type_tranfer_voice) || [];

        query.push(`startDate=${startDateByDay}`);
        query.push(`endDate=${endDateByDay}`);

        query.push(`startDateFilter=${startDate}`);
        query.push(`endDateFilter=${endDate}`);

        if (download === "1") {
            query.push(`download=1`);
        } else {
            if (pages) query.push(`pages=${pages}`);
            if (rows) query.push(`rows=${rows}`);
        }

        if (skillGroups) query.push(skillGroups);

        if (paging) query.push(paging);
        if (duration_g) query.push(duration_g);
        if (wait_g) query.push(wait_g);
        if (groupBy) query.push(groupBy);
        if (prefix) query.push(`prefix=${prefix}`);
        if (Agent_Team) query.push(`Agent_Team=${Agent_Team}`);

        // console.log(pathURL, startDateByDay, endDateByDay,  startDate, endDate);
        // console.log(pathApi + "?" + query.join("&"), opts);
        request.get(pathApi + "?" + query.join("&"), opts, function (err, response, body) {
            if (!err && (response && response.statusCode == 200)) {
                let data = body.data.recordset;
                let rowTotal = body.data.rowTotal;
                // let data = mappingData(result);
                resolve(data, rowTotal);

            } else {
                reject(err && err.message ? err.message : (body && body.message ? body.message : "Có lỗi xảy ra"));
            }
        });
    });
}

module.exports = {
    getInfoSkillGroup,
    getRequestDefault,
    queryCallTypeDefault,
    getRequestPromise,
}