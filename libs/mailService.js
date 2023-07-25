//API đồng bộ dữ liệu với hệ thống tiếp nhận sự vụ
const nodemailer = require("nodemailer");
var _ServiceMail = require('../modals/services-mail')
var _Log = require('../modals/log')
var _MailService = {
    send: function (to, cc, subject, body, attachments, callback) {
        _async.waterfall([
            function (next) {
                _ServiceMail.findOne({}, next);
            },
            function (mailSetting, next) {
                // console.log('mailSetting: ', mailSetting);
                if (!_.isEmpty(mailSetting)) {
                    var mailAccount = mailSetting;
                    var transporter = nodemailer.createTransport({
                        host: mailAccount.send_host,
                        port: mailAccount.send_port,
                        secure: true,
                        auth: {
                            user: mailAccount.send_user,
                            pass: mailAccount.send_pass
                        }
                    });
                    console.log('mailSetting: ', mailAccount);
                    var mailData = {
                        // from: mailAccount.from, // sender address
                        from: '[CRM] Golden Gate' + '<' + mailAccount.send_user + '>', // sender address
                        to: to, // list of receivers
                        subject: subject, // Subject line
                        attachments: attachments,
                        html: body // html body
                    }
                    if (!_.isEmpty(cc)) mailData['cc'] = cc;

                    transporter.sendMail(mailData, function (error, info) {
                        console.log('error, info: ', error, info);
                        if (error) {
                            _Log.create({ status: 0, data: mailData, result: info, type: 'mail' });
                            callback(error);
                        } else {
                            _Log.create({ status: 1, data: mailData, result: info, type: 'mail' });
                            callback(null, { status: true, msg: "Gửi mail thành công", data: info })
                        }
                    })
                } else {
                    callback("Không có tài khoản Email nào được cấu hình!");
                }

            }
        ])
    }
}

module.exports = _MailService;