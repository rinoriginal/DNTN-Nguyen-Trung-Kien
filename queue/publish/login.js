

var acdPublish = require(path.join(_rootPath, 'queue', 'publish', 'acd-publish.js'));

module.exports = {
    sendMsg: function (data) {
        acdPublish.sendLoginRequest(data.user, data.deviceID);
    }
};