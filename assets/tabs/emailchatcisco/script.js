(function ($) {
  var iframeContent;

  /**
   * Kiểm tra iframe và các tab đã load xong hay chưa
   */
  function checkTabButtonExist() {
    $('#inlineFrameExample').on('load', function () {
      let timerId = setInterval(() => {
        let iframeBody = $("#inlineFrameExample").contents().find("body");
        let tabButtonChat = iframeBody.find('#ext-element-5');
        let tabButtonMail = iframeBody.find('#ext-element-14');
        console.log('check button tab');
        if (tabButtonChat.length && tabButtonMail.length) {
          clearInterval(timerId);
          iframeContent = $(iframeBody);
          _handleTabButton();
          _handleCompleteButton();
          _handleClickItemList();
        }
      }, 200);
    });
  }

  /**
   * Đóng ticket khi Agent click vào button complete
   */
  function _handleCompleteButton() {
    // Button complete chat
    iframeContent.on('click', '#button-1486', function () {
      console.log(`------- click button complete chat ------- _handleCompleteButton()`);
      console.log('click button complete chat');
      console.log(`------- click button complete chat ------- _handleCompleteButton()`);
      $('#frm-update-ticket').empty();
    });

    // Button complete mail
    iframeContent.on('click', '#button-1261', function () {
      console.log(`------- click button complete mail ------- _handleCompleteButton()`);
      console.log('click button complete mail');
      console.log(`------- click button complete mail ------- _handleCompleteButton()`);
      $('#frm-update-ticket').empty();
    });
  }

  /**
   * Xử lý button
   */
  function _handleTabButton() {
    // Button tab chat
    iframeContent.on('click', '#ext-element-5', function () {
      console.log(`------- click tab chat ------- _handleTabButton()`);
      console.log('click tab chat');
      console.log(`------- click tab chat ------- _handleTabButton()`);
      $('#frm-update-ticket').empty();
    });

    // Button tab mail
    iframeContent.on('click', '#ext-element-14', function () {
      console.log(`------- click tab mail ------- _handleTabButton()`);
      console.log('click tab mail');
      console.log(`------- click tab mail ------- _handleTabButton()`);
      $('#frm-update-ticket').empty();
    });
  }

  /**
   * Lấy activityId khi nhấn vào các item trong danh sách
   */
  function _handleClickItemList() {
    // Item chat
    iframeContent.on('click', '#chat-grid-body .testtable1.x-grid-item .inboxlist-tall-item', function () {
      let activityId = $(this).find('.datawrap .tile-body .idwrapper .activity_id')
        .text()
        .split(' ')[1];
      console.log(`------- click item chat ------- _handleClickItemList()`);
      console.log('click item chat');
      console.log('activityId item chat: ', activityId);
      console.log(`------- click item chat ------- _handleClickItemList()`);
      _handleClickItemChat(activityId);
    });

    // Item email
    iframeContent.on('click', '#inboxlistMain-body .testtable1.x-grid-item .inboxlist-tall-item', function () {
      let activityId = $(this).find('.datawrap .tile-body .activity_id')
        .clone()
        .children()
        .remove()
        .end()
        .text();
      console.log(`------- click item mail ------- _handleClickItemList()`);
      console.log('click item mail');
      console.log('activityId item mail: ', activityId);
      console.log(`------- click item mail ------- _handleClickItemList()`);
      _handleClickItemMail(activityId);
    });
  }

  /**
   * Xử lý dữ liệu ticket chat
   */
  function _handleClickItemChat(activityId) {
    $.ajax({
      url: '/api/v1/chat/ticket-chat',
      method: 'POST',
      data: { activityId },
    }).done(function (resp) {
      console.log(`------- resp chat ------- _handleClickItemChat()`);
      console.log(resp);
      console.log(`------- resp chat ------- _handleClickItemChat()`);
      if (resp.code == 200) {
        loadFormTicket({
          type: 'chat',
          threadId: resp.data.threadId,
          idService: resp.data.idService,
          idCustomer: resp.data.idCustomer,
          ticketId: resp.data.ticketId,
          email: resp.data.email,
          idCallDialog: resp.data.idCallDialog,
          activityId: resp.data.activityId,
          contactPointData: resp.data.contactPointData
        });
      }
    });
  }

  /**
   * Xử lý dữ liệu ticket mail
   */
  function _handleClickItemMail(activityId) {
    $.ajax({
      url: '/api/v1/mail/create',
      method: 'POST',
      data: { activityId },
    }).done(function (resp) {
      console.log(`------- resp mail ------- _handleClickItemMail()`);
      console.log(resp);
      console.log(`------- resp mail ------- _handleClickItemMail()`);
      if (resp.code == 200) {
        loadFormTicket({
          type: 'mail',
          idCustomer: resp.data.idCustomer,
          ticketId: resp.data.ticketId,
          caseId: resp.data.caseId,
          idMailInboundChannel: resp.data.idMailInboundChannel,
          activityId: resp.data.activityId
        });
      } else {
        console.log(`------- resp.error ------- _handleClickItemMail()`);
        console.log(resp.error);
        console.log(`------- resp.error ------- _handleClickItemMail()`);
      }
    });
  }

  /**
   * Hiển thị ticket
   */
  function loadFormTicket(customer) {
    $('#frm-update-ticket').empty();

    var ticketId = customer && customer.ticketId;
    var type = customer && customer.type;
    var caseId = customer && customer.caseId
    var idMailInboundChannel = customer && customer.idMailInboundChannel
    var mailId = customer && customer.mailId ? customer.mailId : "";
    var ticketParam = (ticketId != null && ticketId != undefined) ? ('&ticketId=' + ticketId) : '';

    if (_.has(customer, 'idCustomer') && customer.idCustomer != null) {
      ticketParam = ticketParam + '&CustomerId=' + customer.idCustomer;
    } else {
      if (_.has(customer, 'field_so_dien_thoai') && customer['field_so_dien_thoai'].length) {
        ticketParam = ticketParam + '&field_so_dien_thoai=' + customer['field_so_dien_thoai'][0];
      }
      if (_.has(customer, 'field_e_mail') && customer['field_e_mail'].length) {
        ticketParam = ticketParam + '&field_e_mail=' + customer['field_e_mail'];
      }
    }

    var url = '';
    if (type == "mail") {
      url = `/ticket?activityId=${customer.activityId}&type=mail&caseId=${caseId}&idMailInboundChannel=${idMailInboundChannel + ticketParam}`;
    } else {
      url = `/ticket?contactPointData=${customer.contactPointData}&activityId=${customer.activityId}&type=chat&mailId=${mailId}&service=${customer.idService}&threadId=${customer.threadId}&dialogId=${ticketParam}&email=${customer.email}&idCallDialog=${customer.idCallDialog}`;
    }

    $('#frm-update-ticket').append(`<iframe id="frm-ticket" width="100%" height="100%" border="none" src="${url}"></iframe>`);
  }

  $(document).ready(function () {
    $('#crm-tab-nav-bar > li > a').click(function () {
      if ($(this).attr('href') == '#tab-email-and-chat') {
        checkTabButtonExist();
      }
    })
  });
})(jQuery);