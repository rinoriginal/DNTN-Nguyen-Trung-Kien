_.mixin(_.extend(require('underscore.string').exports(), require(path.join(_rootPath, 'libs', 'common'))));
_moment.locale("vi");

fsx.readdirSync(path.join(_rootPath, 'modals')).forEach(function (file) {
    if (path.extname(file) !== '.js') return;
    global['_' + _.classify(_.replaceAll(file.toLowerCase(), '.js', ''))] = require(path.join(_rootPath, 'modals', file));
    console.info('Modal : '.yellow + '_' + _.classify(_.replaceAll(file.toLowerCase(), '.js', '')));
});

global.hostname = 'http://' + _.chain(require('os').networkInterfaces()).values().flatten().filter(function (val) {
    return (val.family == 'IPv4' && val.internal == false)
}).pluck('address').first().value() + ':' + _config.app.port;

global._CCKFields = {};
global._rootMenu = {};

const _staticRole = {
    TechnicalManager: new mongodb.ObjectID('57032832296c50d9b723d12e'),
    CompanyLeader: new mongodb.ObjectID("56ccdf99031ce3e32a48f5db"),
    AgentGroupLeader: new mongodb.ObjectID("56ccdf99031ce3e32a48f5d8"),
    Agent: new mongodb.ObjectID("56ccdf99031ce3e32a48f5d9"),
};
Object.defineProperty(global, 'STATIC_ROLE', { value: _staticRole });

module.exports = function routers(app) {
    app.locals._moment = _moment;
    app.locals._switch = _.switch;
    app.locals._equal = _.isEqual;
    app.locals._where = _.findWhere;
    app.locals._parseMenu = _.htmlMenu;
    app.locals._Tags = _.htmlTags;
    app.locals._breadCrumbs = _.breadCrumbs;
    app.locals._hostname = hostname;
    app.locals._dInputFilter = _.dynamicInputFilter;
    app.locals._dInputFilter2 = _.dynamicInputFilter2;
    app.locals._dInputField = _.dynamicInputField;
    app.locals._fieldValue = function (obj, name, type) {
        if (!_.has(obj, name)) return '';
        if (!obj[name].length) return '';
        switch (Number(type)) {
            case 4:
            case 5:
                return _.without(obj[name][0].value, '0', '', null).join(', ');
            case 6:
                return _moment(obj[name][0].value).format('DD/MM/YYYY');
            default:
                return obj[name][0].value;
        }
    };

    fsx.readdirSync(path.join(_rootPath, 'controllers')).forEach(function (file) {
        if (path.extname(file) !== '.js') return;
        app.resource(_.trim(_.dasherize(_.replaceAll(file.toLowerCase(), '.js', ''))).toString(), require(path.join(_rootPath, 'controllers', file.toString())));
    });

    app.get('/', function (req, res) {
        _.render(req, res, 'home', { page: 'home', plugins: ['jquery-tmpl', 'knockout'] }, true);
    });
    app.get('/template', function (req, res) {
        let { page } = req.query;
        res.render('template', { page: page || "button" });
    });

    app.get('/logout', function (req, res) {
        var agentId = req.session.user ? req.session.user._id : null;

        if (req.session.user && _socketUsers[agentId] && _.isEqual(_socketUsers[agentId].sessionID, req.sessionID)) {
            var acdPublish = require(path.join(_rootPath, 'queue', 'publish', 'acd-publish.js'));
            acdPublish.sendLogOutRequest(agentId, '');
            var monitor = _socketUsers[agentId] ? _socketUsers[agentId].monitor : null;
            if (monitor) monitor.destroy();
            delete _socketUsers[agentId];

            _.each(sio.sockets.sockets, function (s, k) {
                s.emit("agentOffline", agentId);
            });
        }

        req.session.user = null;
        req.session.auth = null;
        req.session.logged = false;
        res.redirect('/');
    });

    app.get('/change-status', function (req, res) {
        let user = req.session['user'];
        console.log('change-status', {user});
        _socketUsers[user._id].monitor.setStatus(23);
        res.status(200);
    });

    app.post('/login', function (req, res) {
        var _body = _.pick(req.body, 'name', 'email', 'password', 'deviceId');
        if (!((_.has(_body, 'name') || _.has(_body, 'email')) && _.has(_body, 'password'))) return res.status(200).send({
            code: 406,
            message: 'Một số trường bắt buộc'
        });

        _Users.findOne({ $and: [{ $or: [{ name: _body.name }, { email: _body.name }] }, { password: _body.password }] }, function (error, user) {
            if (_.isNull(user) || _.isUndefined(user))
                return req.xhr ? res.status(200).send({ code: 404, message: 'Sai tên đăng nhập hoặc mật khẩu' }) : res.redirect('/');//mrC
            if (_.isEqual(user.status, 0)) {
                return res.status(200).send({ code: 406, message: 'Tài khoản đã bị khoá' });
            }

            log.debug('login success');
            if (!_.has(_socketUsers, user._id)) _socketUsers[user._id] = { sid: [] };
            _socketUsers[user._id].monitor = require(path.join(_rootPath, 'monitor', 'user-monitor.js'))();
            user.deviceID = _body.deviceId;
            _socketUsers[user._id].monitor.setData(user);
            _socketUsers[user._id].monitor.setDeviceID(_body.deviceId);
            _socketUsers[user._id].sessionID = req.sessionID;

            _socketUsers[user._id].emailStatus = {
                status: 1, // 0 : offline, 1 : online
                statusChange: _moment().unix()
            };

            _socketUsers[user._id].chatStatus = {
                status: 0, // 0 : offline, 1 : online
                statusChange: _moment().unix()
            };

            // var agentStatus = message.transID.split('|')[3];
            // if (agentStatus) _socketUsers[user._id].monitor.setStatus(Number(agentStatus), 'login');
            _socketUsers[user._id].monitor.setStatus(2, 'login');
            req.session['logged'] = true;
            req.session['user'] = _.omit(user.toObject(), 'password', 'created');
            req.session['menuAccess'] = {};
            var dataResponse = {
                code: 200,
                agentId: user.idAgentCisco,
                extension: user.accountCode,
                isLoginMobile: user.isLoginMobile,
                extensionMobile: user.extensionMobile,
                dialNumber: user.dialNumber,

            }
            req.xhr ? res.status(200).send(dataResponse) : res.redirect('/');
            //res.status(200).send({code: 200});
        });
    });

    app.get('/customer-excel', function (req, res) {
        var fileName = 'customer-schema-all-' + _moment().format('DD-MM-YYYY') + '.xls';
        if (req.session.auth && req.session.auth.company && req.session.auth.company.name) {
            fileName = 'customer-schema-' + req.session.auth.company.name + '-' + _moment().format('DD-MM-YYYY') + '.xls';
        }
        var options = {
            filename: path.join(_rootPath, 'assets', 'export', fileName),
            useStyles: true, // Default
            useSharedStrings: true,
            dateFormat: 'DD/MM/YYYY HH:mm:ss'
        };

        var workbook = new _Excel.stream.xlsx.WorkbookWriter(options);
        workbook.addWorksheet("My Sheet");
        var worksheet = workbook.getWorksheet("My Sheet");
        var _cl = [];

        _async.waterfall([
            function (next) {
                var cond = {};
                if (req.session.auth && req.session.auth.company && req.session.auth.company._id) {
                    cond = {
                        '_id': req.session.auth.company._id
                    }
                }
                _Company.distinct('companyProfile', cond, next);
            },
            function (ids, next) {
                _CompanyProfile.find({
                    _id: {
                        $in: ids
                    }
                }, function (err, profiles) {
                    var fieldsId = [];
                    _.each(profiles, function (el) {
                        fieldsId = _.union(fieldsId, el.fieldId);
                    });
                    next(err, fieldsId);
                });
            },
            function (ids, next) {
                _CustomerFields.find({
                    _id: {
                        $in: ids
                    },
                    status: 1
                }).sort({
                    weight: 1,
                    displayName: 1
                }).exec(next);
            }
        ], function (error, fields) {
            if (error) return res.status(500).send('Error');
            _async.eachSeries(fields, function (feld, cb) {
                var _style = {
                    alignment: {
                        vertical: "middle",
                        horizontal: "center"
                    },
                    font: {
                        size: 14,
                        bold: true
                    },
                    border: {
                        top: {
                            style: "thin",
                            color: {
                                argb: "000000"
                            }
                        },
                        left: {
                            style: "thin",
                            color: {
                                argb: "000000"
                            }
                        },
                        bottom: {
                            style: "thin",
                            color: {
                                argb: "000000"
                            }
                        },
                        right: {
                            style: "thin",
                            color: {
                                argb: "000000"
                            }
                        }
                    }
                };
                if (feld.isRequired) _style.font['color'] = {
                    argb: "FF0000"
                };
                _cl.push({
                    header: feld.displayName.toUpperCase(),
                    style: _style,
                    key: feld.modalName,
                    width: feld.displayName.length * 2
                });
                cb();
            }, function () {
                worksheet.columns = _cl;
                worksheet.commit();
                workbook.commit().then(function () {
                    res.download(options.filename);
                });
            });
        });
    });

    _Router.findById(String(new mongodb.ObjectID('-dft-hoasao-')), function (error, r) {
        if (!_.isNull(r)) {
            _rootMenu = r;
        } else {
            //_Router.create({
            //    _id: String(new mongodb.ObjectID('-dft-hoasao-')),
            //    name: 'Main menu',
            //    link: '/',
            //    status: 1,
            //    hidden: 0,
            //    crud: 0,
            //    role: []
            //}, function (error, r) {
            //    if (error) return log.error(error);
            //    _rootMenu = r;
            //});
        }
    });

    _CustomerFields.find({}, 'modalName fieldType').sort({ weight: 1 }).exec(function (error, fields) {
        _async.each(fields, function (field, callback) {
            _CCKFields[field.modalName] = {
                db: mongoose.model(field.modalName, mongoose.Schema(_.defaultSchema(Number(field.fieldType))), field.modalName),
                type: field.fieldType
            };
            callback();
        }, function (error) {
            if (error) return log.error(error);
        });
    });

    var monitorManager = require(path.join(_rootPath, 'monitor', 'manager.js'));
    monitorManager.init();

    _Role.findById(_staticRole.TechnicalManager, function (error, r) {
        if (!_.isNull(r)) return false;
        _Role.create({ _id: _staticRole.TechnicalManager, name: "Quản Lý Kỹ Thuật", status: 1, modify: 0, weight: 1, roleGroup: 1 });
    });

    _Role.findById(_staticRole.CompanyLeader, function (error, r) {
        if (!_.isNull(r)) return false;
        _Role.create({ _id: _staticRole.CompanyLeader, name: "Quản Lý Công Ty", status: 1, modify: 0, weight: 3, roleGroup: 3 });
    });

    _Role.findById(_staticRole.AgentGroupLeader, function (error, r) {
        if (!_.isNull(r)) return false;
        _Role.create({ _id: _staticRole.AgentGroupLeader, name: "Trưởng Nhóm", status: 1, modify: 0, weight: 4, roleGroup: 4 });
    });

    _Role.findById(_staticRole.Agent, function (error, r) {
        if (!_.isNull(r)) return false;
        _Role.create({ _id: _staticRole.Agent, name: "Điện Thoại Viên", status: 1, modify: 0, weight: 5, roleGroup: 5 });
    });

}