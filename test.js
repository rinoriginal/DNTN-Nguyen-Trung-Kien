var nodemailer = require("nodemailer");
var fs = require('fs'),
  path = require('path'),
  Handlebars = require('handlebars');
// Open template file
var source = fs.readFileSync(path.join(__dirname, "assets", "email-template", "email-demo", "email-demo.html.handlebars"), 'utf8');
// Create email generator
var template = Handlebars.compile(source);

// var transporter = nodemailer.createTransport('smtps://ozkazz@gmail.com:ok110000@smtp.gmail.com');
// return;
let portMail = 465
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: portMail,
  secure:  portMail == 465 ? true : false, // true for 465, false for other ports (587)
  auth: { user: "ozkazz@gmail.com", pass: "lightangel1" },
});
var mailOptions = {
  from: "ozkazz@gmail.com", // sender address
  to: ["mail@gmail.com"], // list of receivers
  subject: "V/v thông báo gửi mail", // subject
  text: "Dear mr.DevMail, rất hân hạnh được làm quen với bạn!", // body
  html: template(
    {
      emailTitle: "emailTitle",
      emailContent: "emailContent",
      restaurant: {
        name: "GoGi",
        brand: "GoGi brand",
        province: "Hà Nội",
      }
    }
  ), // Process template with locals - {passwordResetAddress},
  attachments: [
    {
      filename: "customer-schema-GOLDEN GATE GROUP-25-09-2020.xls",
      path: "./assets/export/customer-schema-GOLDEN GATE GROUP-25-09-2020.xls", // stream this file
    },
  ],
  // auth: {
  //     user: "ozkazz@gmail.com",
  //     pass: "ok110000"
  // }
};

transporter.sendMail(mailOptions, function (error, info) {
  if (error) {
    return console.log(error);
  }
  console.log('Message sent: ' + info.response);
});

// const sendPwdReminder = transporter.templateSender(
//   {
//     subject: "Password reminder for {{username}}!",
//     text: "Hello, {{username}}, Your password is: {{ password }}",
//     html:
//       "<b>Hello, <strong>{{username}}</strong>, Your password is:\n<b>{{ password }}</b></p>",
//   },
//   {
//     from: mailOptions.from,
//   }
// );

// return sendPwdReminder(
//   {
//     to: mailOptions.to,
//     subject: mailOptions.subject,
//     attachments: mailOptions.attachments,

//   },
//   {
//     username: "Node Mailer",
//     password: "password",
//   },
//   function (err, info) {
//     if (err) {
//       console.log("Error", err);
//     } else {
//       console.log("Password reminder sent");
//     }
//   }
// );
