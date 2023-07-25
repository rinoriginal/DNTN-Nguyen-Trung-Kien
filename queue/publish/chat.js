
module.exports = {
    /**
     * Hàm gửi msg tới CORE
     * @param modalName - dùng để phân biệt dạng msg
     * @param publishObject - dữ liệu msg gửi kèm
     */
    publishData: function (modalName, publishObject) {
        publishObject.queueName = _config.activemq.queueName;
        _ActiveMQ.publish('/queue/chat-' + modalName, JSON.stringify(publishObject));
    }
};