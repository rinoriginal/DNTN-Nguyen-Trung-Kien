const jwt = require("jsonwebtoken");

const  ischeckEmail = (params) => {
    var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (params.match(mailformat)) {
        return true;
    }
    return false;
}
const  decodeMessageChat = (content) => {
    // decode content 
    let message = decodeURI(content)
    message = decodeURIComponent(message)
    // loại bỏ ký tự 
    message = message.replace(/\+/g, " ");
    // Chuyển string về mạng dựa theo key "O{"
    let stringArray = message.split("O{");
    // Xóa phần tử đầu tiền 
    stringArray.shift();
    let conversations = [];
    for (let item of stringArray) {
        // Chuyển mỗi phần tử về 1 mảng và xóa các phần tử không cần thiết
        item = item.split("|");
        let conversation = [];
        let isCheckMessageAgent = 0
        let isCheckMessageSystemEnd = 0
        let isCheckMessageSystem = 0
        let isCheckMessageCustomer = 0
        let itemContent = {}
        for (let el of item) {
            if ((el.search("}bUid") != -1)
                || (el.search("}fAct") != -1)
                || (el.search("}bPvtMsg") != -1)
                || (el.search("}mMid") != -1)
                || (el.search("}bUsr") != -1)
                || (el.search("}sCmd") != -1)
                || (el.search("}bXTyp") != -1)
                || (el.search("}mTsp") != -1)
                || (el.search("}}") != -1)
                || (el.search("}mDeptId") != -1)) {
                if (el.search("system}bUid") != -1) {
                    isCheckMessageSystem++
                }
                if (el.search("sCmd") != -1) {
                    let checkAgentOrCustomer = el.replace("S{", "").replace("}sCmd", "").trim();
                    if (!isNaN(checkAgentOrCustomer)) {
                        isCheckMessageSystem++
                        isCheckMessageAgent++
                    } else {
                        isCheckMessageCustomer++
                    }
                }
                if (el.search("SYSTEM}bXTyp") != -1) {
                    isCheckMessageSystemEnd++
                }
                // XỬ LÝ NAME
                if (el.search("}bUid") != -1) {
                    itemContent = {
                        ...itemContent,
                        name: el.replace("S{", "").replace("}bUid", "").trim()
                    }
                }
                // XỬ LÝ CONTENT
                if (el.search("}fAct") != -1) {
                    itemContent = {
                        ...itemContent,
                        content: el.replace("S{", "").replace("}fAct", "").trim()
                    }
                }
                if (el.search("}mDeptId") != -1) {
                    itemContent = {
                        ...itemContent,
                        contentSystem: el.replace("S{", "").replace("}mDeptId", "").trim()
                    }
                }
                if (el.search("}mTsp") != -1) {
                    let checkContent = el.replace("S{", "").replace("}mTsp", "").trim()
                    if (isNaN(checkContent)) {
                        itemContent = {
                            ...itemContent,
                            contentSystem: el.replace("S{", "").replace("}mTsp", "").trim()
                        }
                    }
                }
                // XỬ LÝ  THOI GIAN MESSAGE
                if (el.search("}bPvtMsg") != -1) {
                    if (_moment(el.replace("S{", "").replace("}bPvtMsg", "").trim(), _moment.ISO_8601, true).isValid()) {
                        itemContent = {
                            ...itemContent,
                            createAt: el.replace("S{", "").replace("}bPvtMsg", "").trim()
                        }
                    }

                }
                if (el.search("}mDeptId") != -1) {
                    if (_moment(el.replace("S{", "").replace("}mDeptId", "").trim(), _moment.ISO_8601, true).isValid()) {
                        itemContent = {
                            ...itemContent,
                            createAt: el.replace("S{", "").replace("}mDeptId", "").trim()
                        }
                    }

                }
                if (el.search("}mMid") != -1) {
                    if (_moment(el.replace("S{", "").replace("}mMid", "").trim(), _moment.ISO_8601, true).isValid()) {
                        itemContent = {
                            ...itemContent,
                            createAt: el.replace("S{", "").replace("}mMid", "").trim()
                        }
                    }

                }
                if (el.search("}}") != -1) {
                    if (_moment(el.replace("S{", "").replace("}}", "").trim(), _moment.ISO_8601, true).isValid()) {
                        itemContent = {
                            ...itemContent,
                            createAt: el.replace("S{", "").replace("}}", "").trim()
                        }
                    }
                }

            }
        }
        if (isCheckMessageSystem == 2) {
            conversation = {
                ...itemContent,
                type: "system"
            }
        } else if (isCheckMessageAgent == 1) {
            conversation = {
                ...itemContent,
                type: "agent"
            }
        } else {
            if (isCheckMessageCustomer == 1) {
                conversation = {
                    ...itemContent,
                    type: "customer"
                }
            } else {
                if (isCheckMessageSystemEnd == 1) {
                    conversation = {
                        ...itemContent,
                        type: "system end"
                    }
                }
            }
        }
        conversations.push(conversation)
    }
    return conversations
}
module.exports = {
    ischeckEmail: ischeckEmail,
    decodeMessageChat: decodeMessageChat,
};
