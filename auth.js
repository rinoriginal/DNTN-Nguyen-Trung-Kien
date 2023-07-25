exports.auth = function (req, res, next) {
    //auth code here ...
    //req.xhr &&
    var _skip = (['assets', 'favicon'].indexOf(req.path.split('/')[1]) >= 0)
        || (req.xhr && _.isEqual(req.path, '/login'))
        || (req.xhr && _.isEqual(req.path, '/register'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/chat/offline/create'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/service/token/create'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/service/decode'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/chat/history'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/chat/async-recording'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/chat/ticket-chat'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/mail/create'))
        || (req.xhr && _.isEqual(req.path, '/api/v1/voice/get-survey-code'))
    if (_skip) return next();
    if (['html'].indexOf(req.path.split('/')[1]) >= 0) return _.render(req, res, 'login', { page: req.path.split('/')[2], demo: true }, true);
    if (!req.session.logged) return _.render(req, res, 'login', { title: 'Đăng nhập' }, true);
    next();
}
