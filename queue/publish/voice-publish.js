
module.exports = {
    sendMsg: function (queueName ,message) {
        _ActiveMQ.publish('/queue/' + queueName, JSON.stringify(message));
    },
    checkTrunk: function(message){
        _ActiveMQ.publish('/queue/CheckTrunkReq', JSON.stringify(message))
    }
};