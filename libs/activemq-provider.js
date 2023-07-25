const stompit = require('stompit');

class ActivemqProvider {
    constructor(client) {
        this.client = client
    }


    subscribe(queueName, callback) {
        this.client.subscribe({
            destination: queueName
        }, (err, msg) => {
            if (err) return log.error('Subscribe ', queueName, err);
            msg.readString('UTF-8', (err, body) => {
                log.info('msg', queueName, body)
                if (err) return log.error('Read String ', msg, err);
                callback(body);
            })
        });
    }

    publish(queueName, message) {
        /*      
        Thêm content - length vào header với bản acd verion 2019
        Ko có content - length phía acd phát sinh lỗi
        Cannot realize message type: Message isn 't ActiveMQBytesMessage
        Với activemq bản tin có content - length thì coi message có type binary
        Nếu không có content - length thì là text
        Than khảo: http: //gdaws.github.io/node-stomp/api/client 
        */
        try {
            let sendHeaders = {
                'destination': queueName,
                // 'content-type': 'text/plain'
            };
            if (typeof message === "string") {
                sendHeaders['content-length'] = lengthInUtf8Bytes(message);
            }
            log.info('Publish', sendHeaders, message)
            const frame = this.client.send(sendHeaders);
            frame.write(message);
            frame.end();
        } catch (err) {
            return log.error('Publish', queueName, err);
        }
    }

    publishSafe(queueName, message, callback) {
        if (this.client._disconnecting) {
            callback('System time out');
        } else {
            this.publish(queueName, message);
        }
    }
    disconnect(callback) {
        log.info('Disconnect activemq');
        this.client.disconnect();
        callback(null, null);
    }
}

/**
 * Get byte length in string
 * @param {*} str 
 */
function lengthInUtf8Bytes(str) {
    // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
    var m = encodeURIComponent(str).match(/%[89ABab]/g);
    return str.length + (m ? m.length : 0);
}

module.exports = ActivemqProvider;