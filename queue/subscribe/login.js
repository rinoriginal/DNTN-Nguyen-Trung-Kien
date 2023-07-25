

module.exports = function (client, sessionId) {

    client.subscribe('/queue/' + _config.app._id + '/LoginResMsg', function (body, header) {
        var result = JSON.parse(body);
        log.debug('LoginResMsg - ', result);
        sio.sockets.emit('loginRespone', body);
    });
}