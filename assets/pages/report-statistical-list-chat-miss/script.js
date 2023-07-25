// author : haivh - 24/12/2020
var DFT = function ($) {

  const body = document.querySelector("#container");
  // Load lại trang
  $('.zmdi-refresh').bind('click', function () {
    _.LoadPage(location.hash = "report-statistical-list-chat-miss");
  });

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTICAL_LIST_CHAT_MISS), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTICAL_LIST_CHAT_MISS[item]);
    });
  }
  //Lấy dữ liệu lọc và truy vấn lên server
  var queryFilter = function (isDownload, page) {

    var filter = _.chain($('.input'))
      .reduce(function (memo, el) {
        if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
        return memo;
      }, {}).value();

    if (isDownload) {
      filter.isDownload = true;
      filter.totalResult = +($('.total').text().split(':')[1])

    }
    if (page) {
      filter.page = page;
    }
    filter.scope = 'search-data'

    _Ajax("/report-statistical-list-chat-miss?" + $.param(filter), 'GET', {}, function (resp) {

      if (resp.code == 200) {
        if (filter.isDownload == true) {
          downloadFromUrl(window.location.origin + resp.data)
        } else {
          $('#tbBody').empty();
          if (resp.data.length) {
            $('#sum').remove();
            loadData(resp);
            $('#paging').html(createPaging(resp.paging));
          } else {
            $('#paging').html('')
            swal({
              title: "Thông báo",
              text: "Không tìm thấy các trường phù hợp",
              type: "warning",
              confirmButtonColor: "#DD6B55",
              confirmButtonText: "Xác nhận!",
              closeOnConfirm: true
            });
          }
        }
      } else {
        swal({ title: 'Cảnh báo !', text: resp.message });
      }
    })
  };

  let bindClick = function () {
    let _page = 1
    //tìm kiếm
    $('#searchTernal').click(function () {
      queryFilter(false);
      // total = document.querySelector('.total');
      // total.remove();
    });

    // Click sang trang khác
    $(document).on('click', '.pagination li a', function (e) {
      e.preventDefault();
      queryFilter(false, $(this).attr('data-link'));
    });

    // download Excel
    $(document).on('click', '#exportexcel', function (e) {
      e.preventDefault();
      queryFilter(_page, true);
    });

    // query lấy dữ liệu lịch sử chat
    $(document).on('click', '.btn-show', function (e) {
      let filter = {}
      filter.scope = 'search-history-chat'
      filter.idChat = $(this).attr('data-id')
      _Ajax("/report-statistical-list-chat-miss?" + $.param(filter), 'GET', {}, function (resp) {
        if (resp.code == 200) {
          loadHistory(resp)
        } else {
          swal({ title: 'Cảnh báo !', text: resp.message });
        }
      })

      // open modal
      $('#modal-form-box-chat').modal({
        backdrop: 'static',
        'keyboard': false
      });
      // close modal
      $('#modal-form-box-chat').on('hidden.bs.modal', function (e) {
        $('#first-tab').trigger('click')
        $('#pills-tabContent').empty()
      })
    })

  }

  // hiển thị lịch sử chat
  var loadHistory = function (resp) {

    $('#pills-tabContent').empty()

    let templateBoxChat =
      `<div role="tabpanel" class="tab-pane active" id="tab-list-chat">` +
      `   <div class="panel-body msg_container_base">` +
      showMessage(resp.data[0]) +
      `   </div>` +
      `</div>`
    let templateInfo =
      `<div role="tabpanel" class="tab-pane " id="tab-info-chat">` +
      `   <div class="panel-body p-0">` +
      `       <div class="title">` +
      `           <span class="m-4 m-l-16" style="font-size: 11px;">Thông tin hội thoại</span>` +
      `       </div>` +
      `       <div class="col-md-12 p-0">` +
      `           <div class="col-md-12 p-0 m-b-5 box-shadow">` +
      `               <div class="col-md-4 p-0 left-side" style="width:123px">` +
      `                   <div class="m-8">Kênh chat :</div>` +
      `                   <div class="m-8">Website :</div>` +
      `                   <div class="m-8">IP :</div>` +
      `                   <div class="m-8">Tổng số tin nhắn :</div>` +
      `               </div>` +
      showInfoConver(resp.data[0]) +
      `           </div>` +
      `       </div>` +
      `       <div class="title">` +
      `           <span class="m-4 m-l-16" style="font-size: 11px;">Thông tin khách hàng</span>` +
      `       </div>` +
      `       <div class="col-md-12 p-0" style="max-height: 413px;overflow-y: scroll;overflow-x: hidden;">` +
      `           <table class=" table table-borderless col-md-12 p-0 m-b-5 box-shadow">` +
      resp.str +
      `           </table>` +
      `       </div>` +
      `   </div>` +
      `</div>`

    let templateNote =
      `<div role="tabpanel" class="tab-pane " id="tab-detail-chat">` +
      `   <div class="panel-body p-0">` +
      `       <div class="title">` +
      `           <span class="m-4 m-l-16" style="font-size: 11px;">Nội dung ghi chú</span>` +
      `       </div>` +
      `       <div class="col-md-12" style="max-height: 546px;overflow-y: scroll;overflow-x: hidden;">` +
      `           <div class="m-t-15 m-b-15">` +
      showNote(resp.data[0]) +
      `           </div>` +
      `       </div>` +
      `   </div>` +
      `</div>`

    $('#pills-tabContent').append(templateBoxChat)
    $('#pills-tabContent').append(templateInfo)
    $('#pills-tabContent').append(templateNote)

    $('.selectpicker').selectpicker('refresh');

  }

  // hiển thị tin nhắn lịch sử chat
  var showMessage = function (data) {
    let listMessage = '';
    if (!data.messagesChat) return ``

    data.messagesChat.forEach(function (item) {

      if (item.type == 'agent') {
        listMessage +=
          `<div class="row msg_container base_sent" style="padding:0">` +
          `   <div class="col-md-12 col-xs-12">` +
          `       <div class="text-right m-b-3">` +
          `           <span datetime="2009-11-13T20:00">${item.name} • ${moment(item.createAt).format('DD/MM/YYYY HH:mm:ss')}</span>` +
          `       </div>` +
          `       <div class="flex-end">` +
          `           <p class="messages msg_sent">${item.content}</p>` +
          `       </div>` +
          `   </div>` +
          `</div>`
      }

      if (item.type == 'customer') {
        listMessage +=
          `<div class="row msg_container base_receive" style="padding:0">` +
          `   <div class="col-md-12 col-xs-12">` +
          `       <div class="text-left m-b-3">` +
          `           <span datetime="2009-11-13T20:00">${item.name} • ${moment(item.createAt).format('DD/MM/YYYY HH:mm:ss')}</span>` +
          `       </div>` +
          `       <div class="">` +
          `           <p class="messages msg_receive">${item.content}</p>` +
          `       </div>` +
          `   </div>` +
          `</div>`
      }
    })

    return listMessage;
  }
  var showNote = function (data) {
    if (!data.note) return ``
    return data.note;
  }
  var showInfoConver = function (data) {
    if (!data) return ``;
    return `` +
      `<div class="col-md-8 p-0 right-side" style="width:262px">` +
      `   <div class="m-8">${_.has(data, 'nameChannel') && data.nameChannel ? data.nameChannel : '-- '}</div>` +
      `   <div class="m-8">${_.has(data, 'website') && data.website ? data.website : '-- '}</div>` +
      `   <div class="m-8">${_.has(data, 'ip') && data.ip ? data.ip : ' --'}</div>` +
      `   <div class="m-8">${_.has(data, 'countMessage') && data.countMessage ? data.countMessage : 0}</div>` +
      `</div>`
  }

  //hiển thị dữ liệu lên giao diện
  var loadData = function (resp) {

    var template = '<tr>' +
      '<td class="text-center" style="width:50px" title="{0}">{0}</td>' +
      '<td class="text-center" style="width:140px" title="{1}">{1}</td>' +
      '<td class="text-center" style="width:140px" title="{2}">{2}</td>' +
      '<td class="text-center" style="width:140px" title="{3}">{3}</td>' +
      '<td class="text-center" style="width:140px" title="{4}">{4}</td>' +
      '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
      '<td class="text-center" title="{6}" style="width:140px">{6}</td>' +
      '<td class="text-center" style="width:140px" title="{7}">{7}</td>' +
      '<td class="text-center"><a role="button" data-id="{8}" data-form="complaint" href="javascript:void(0)" class="p-t-3 btn-flat-bg btn-show" data-toggle="tooltip" data-placement="top" data-original-title="Thông tin hội thoại"><i style="color:#3F8498" class="zmdi zmdi-comments  f-17"></i></a> </td>' +
      '</tr>';

    var rows = '';


    resp.data.forEach(function (el, i) {

      rows += template.str(
        i + 1,
        el.createDate ? moment(el.createDate).format('DD/MM/YYYY HH:mm:ss') : '',
        el.nameCustomer ? el.nameCustomer : "",
        el.phoneNumber ? el.phoneNumber : "",
        el.email ? el.email : "",
        el.agent ? el.agent : "",
        el.timeWait ? msToTime(el.timeWait) : 0,
        el.channel ? el.channel : "",
        el._id
      )
    })

    body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)

    $('#tbBody').html(rows);
  };

  function hms(secs) {
    if (isNaN(secs)) return "00:00:00"
    var sec = Math.ceil(secs / 1000);
    var minutes = Math.floor(sec / 60);
    sec = sec % 60;
    var hours = Math.floor(minutes / 60)
    minutes = minutes % 60;
    return hours + ":" + pad(minutes) + ":" + pad(sec);
  }
  var msToTime = function (s) {
    if (!s || s == 0) return '00:00:00';
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
    return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
}

  function pad(num) {
    return ("0" + num).slice(-2);
  }

  function createPaging(paging, classPaging) {

    if (!paging) return '';
    var firstPage = paging.first ? '<li><a class="' + classPaging + '" data-link="' + paging.first + '">&laquo;</a></li>' : '';
    var prePage = paging.previous ? '<li><a class="' + classPaging + '" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
    var pageNum = '';
    for (var i = 0; i < paging.range.length; i++) {
      if (paging.range[i] == paging.current) {
        pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
      } else {
        pageNum += '<li><a class="' + classPaging + '" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
      }
    }
    var pageNext = paging.next ? '<li><a class="' + classPaging + '" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
    var pageLast = paging.last ? '<li><a class="' + classPaging + '" data-link="' + paging.last + '">&raquo;</a></li>' : '';
    return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
  };



  return {
    init: function () {
      $('#main .container').attr('class', 'container-fluid')
      $('.selectpicker').selectpicker('refresh');
      window.onbeforeunload = null;
      $('.multi-date-picker').datepicker({
        multidate: 2,
        multidateSeparator: ' - ',
        format: 'dd/mm/yyyy',
      });
      bindClick();
      bindTextValue();
      queryFilter(false);
    },
    uncut: function () {
      $(document).off('change', '#selectInfo')
      $(document).off('click', '.zmdi-refresh')
      $(document).off('click', '#searchTernal')
      $(document).off('click', '.btn.bgm-blue.uppercase.c-white')
      $(document).off('click', '.pagination li a')
      $(document).off('click', '#exportexcel')
      $(document).off('click', '.btn-show'); 
    }
  }
}(jQuery);