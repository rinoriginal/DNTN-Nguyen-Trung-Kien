

const { getMailByActivityId } = require("../helpers/mailHelper");
class MailHandler {
  constructor() { }

  async create(req, res) {
    try {
      if (!req.body.activityId) {
        const error = new Error('Vui lòng truyền activityId');
        throw error;
      }

      let activityId = req.body.activityId;
      let idAgent = req.session.user._id;

      let customerId;
      let idMailInboundChannel;
      let caseId;
      let email;
      let queueNumber;
      let fieldEmail;
      let mailInbound;
      let ticketMail;

      /**
       * Tìm kiếm activityId trên cisco
       */
      const mailByActivityId = await getMailByActivityId(activityId);
      if (!mailByActivityId) {
        const error = new Error('Không tìm thấy activityId trên Cisco!');
        throw error;
      }

      email = mailByActivityId.CONTACT_POINT_DATA;
      queueNumber = mailByActivityId.QUEUE_ID;
      caseId = Number(mailByActivityId.CASE_ID);

      /**
       * Tìm kiếm email của khách hàng trên telehub
       */
      if (email) {
        const fieldEmailResult = await mongoose.model('field_e_mail').findOne({ value: email });
        if (fieldEmailResult) {
          fieldEmail = fieldEmailResult;
        }
      }

      /**
       * Nếu email trong bảng field_e_mail không tồn tại thì tạo mới khách hàng
       */
      if (!fieldEmail) {
        let dataInsert = {};

        const customerCreateResult = await _Customer.create({});

        customerId = customerCreateResult._id;
        dataInsert._id = customerCreateResult._id;
        if (email) {
          dataInsert.field_e_mail = email;
        }

        await mongoClient.collection('customerindex').insert(dataInsert);

        if (email) {
          await _CCKFields['field_e_mail'].db.create({ entityId: customerId, value: email });
        }
      }

      /**
       * Tìm user trong bảng customerIndex với email, nếu không có thì tạo mới
       */
      if (fieldEmail && email) {
        customerId = fieldEmail.entityId;
        const customerIndexResult = await mongoClient.collection('customerindex').findOne({ _id: customerId });

        if (!customerIndexResult) {
          await mongoClient.collection('customerindex').insert({
            _id: customerId,
            field_e_mail: email
          });
        }
      }

      /**
       * Tìm kiếm kênh chat theo queueNumber 
       */
      const mailInboundChannelResult = await _MailInboundChannel.findOne({ idQueue: queueNumber });
      if (mailInboundChannelResult) {
        idMailInboundChannel = mailInboundChannelResult._id
      } else {
        const error = new Error(`Kênh mail ${queueNumber} chưa được thiết lập trên ternal!`)
        throw error;
      }

      /**
       * Tìm kiếm mail inbound, nếu chưa có thì tạo mới
       */
      const mailInboundResult = await _MailInbound.findOne({ activityId: activityId });
      if (mailInboundResult) {
        mailInbound = mailInboundResult;
      } else {
        let dataCreateMailInbound = {
          activityId: activityId,
          idMailInboundChannel: idMailInboundChannel,
          idCustomer: customerId,
          idAgent: idAgent,
          caseId: caseId,
          subject: mailByActivityId.SUBJECT,
          content: mailByActivityId.CONTENT,
          textContent: mailByActivityId.TEXT_CONTENT,
          emailSize: mailByActivityId.EMAIL_SIZE,
          formEmailAddress: mailByActivityId.FROM_EMAIL_ADDRESS,
          recvEmailAddress: mailByActivityId.RECV_EMAIL_ADDRESS,
          contentType: mailByActivityId.CONTENT_TYPE,
          header: mailByActivityId.HEADER,
          activityMode: mailByActivityId.ACTIVITY_MODE,
          activityType: mailByActivityId.ACTIVITY_TYPE,
          activitySubType: mailByActivityId.ACTIVITY_SUB_TYPE,
          activityStatus: mailByActivityId.ACTIVITY_STATUS,
          activitySubStatus: mailByActivityId.ACTIVITY_SUB_STATUS,
          whenCreated: mailByActivityId.WHEN_CREATED,
          whenModified: mailByActivityId.WHEN_MODIFIED,
          aliasId: mailByActivityId.ALIAS_ID
        }

        const mailInboundCreate = await _MailInbound.create(dataCreateMailInbound);
        if (mailInboundCreate) {
          mailInbound = mailInboundCreate;
        } else {
          const error = new Error('Có lỗi khi tạo mail inbound!');
          throw error;
        }
      }
      /**
       * Tìm kiếm ticket, nếu không có thì tạo mới
       */
      const ticketMailResult = await _TicketsMail.findOne({ caseId: caseId });
      if (ticketMailResult) {
        if (!ticketMailResult.idAgent) {
          // Cập nhật lại idAgent nếu chưa tồn tại
          ticketMail = await _TicketsMail.findOneAndUpdate({ caseId: caseId }, {
            $set: {
              idAgent: idAgent,
            }
          }, { new: true })
        } else {
          ticketMail = ticketMailResult
        }
      } else {
        const dataInsertTicketsMail = {
          note: "",
          caseId: mailInbound.caseId,
          idAgent: mailInbound.idAgent,
          idCustomer: mailInbound.idCustomer,
          idMailInboundChannel: mailInbound.idMailInboundChannel,
          idMailInbound: mailInbound._id,
          created: new Date(),
          channelType: "Mail",
          typeMail: 1,
          aliasId: mailByActivityId.ALIAS_ID
        }

        const ticketMailCreate = await _TicketsMail.create(dataInsertTicketsMail);
        if (ticketMailCreate) {
          ticketMail = ticketMailCreate;
        } else {
          const error = new Error('Có lỗi khi tạo ticket mail!');
          throw error;
        }
      }

      if (!mailInbound || !ticketMail) {
        const error = new Error('Không có dữ liệu!');
        throw error;
      }

      return res.json({
        code: 200,
        data: {
          idCustomer: mailInbound.idCustomer,
          ticketId: ticketMail._id,
          caseId: ticketMail.caseId,
          idMailInboundChannel: mailInbound.idMailInboundChannel,
          activityId: req.body.activityId
        }
      });
    } catch (error) {
      console.log(`------- error ------- `);
      console.log(error);
      console.log(`------- error ------- `);
      return res.json({
        code: 500,
        error: error.message
      });
    }
  }

}

module.exports = MailHandler;
