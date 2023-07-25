// author : haivh - 24/12/2020
var DFT = function ($) {

  const body = document.querySelector("#container");
  // Load lại trang
  $('.zmdi-refresh').bind('click', function () {
    _.LoadPage(location.hash = "report-statistical-conversation-chat");
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

    _Ajax("/report-statistical-conversation-chat?" + $.param(filter), 'GET', {}, function (resp) {
      console.log({ resp });

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
    $(document).on('click','.btn-edit',function(e){
      $('#box_chat').attr('style','display:block')
      // renderContentChat();
    })

  }

  let chatBox = function () {
    $(document).on('click', '.panel-heading span.icon_minim', function (e) {
      var $this = $(this);
      if (!$this.hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideUp();
        $this.parents('.panel').find('.panel-footer').slideUp();
        $this.addClass('panel-collapsed');
        $this.removeClass('glyphicon-minus').addClass('glyphicon-plus');
      } else {
        $this.parents('.panel').find('.panel-body').slideDown();
        $this.parents('.panel').find('.panel-footer').slideDown();
        $this.removeClass('panel-collapsed');
        $this.removeClass('glyphicon-plus').addClass('glyphicon-minus');
      }
    });
    $(document).on('focus', '.panel-footer input.chat_input', function (e) {
      var $this = $(this);
      if ($('#minim_chat_window').hasClass('panel-collapsed')) {
        $this.parents('.panel').find('.panel-body').slideDown();
        $('#minim_chat_window').removeClass('panel-collapsed');
        $('#minim_chat_window').removeClass('glyphicon-plus').addClass('glyphicon-minus');
      }
    });
    $(document).on('click', '#new_chat', function (e) {
      var size = $(".chat-window:last-child").css("margin-left");
      size_total = parseInt(size) + 400;
      alert(size_total);
      var clone = $("#chat_window_1").clone().appendTo(".container");
      clone.css("margin-left", size_total);
    });
    $(document).on('click', '.icon_close', function (e) {
      //$(this).parent().parent().parent().parent().remove();
      // $("#chat_window_1").remove();
      $('#box_chat').attr('style','display:none')
    });
  }

  var renderContentChat = function(){
    let templeInfo = `<div role="tabpanel" class="tab-pane " id="tab-info-chat">`+
                    `<div class="panel-body p-0">`+
                        `<div class="title">`+
                            `<span class="m-4 m-l-16" style="font-size: 11px;">Thông tin hội thoại</span>`+
                        `</div>`+
                        `<div class="col-md-12 p-0 m-b-5 box-shadow">`+
                            `<div class="col-md-4 p-0 left-side">`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                            `</div>`+
                            `<div class="col-md-8 p-0 right-side">`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                            `</div>`+
                        `</div>`+
                        `<div class="title">`+
                            `<span class="m-4 m-l-16" style="font-size: 11px;">Thông tin khách hàng</span>`+
                        `</div>`+
                        `<div class="col-md-12 p-0 m-b-5 box-shadow"`+
                            `style="max-height: 300px;overflow-y: scroll;overflow-x: hidden;">`+
                            `<div class="col-md-4 p-0 left-side">`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                                `<div class="m-8">Kênh chat</div>`+
                            `</div>`+
                            `<div class="col-md-8 p-0 right-side">`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                                `<div class="m-8">Fanpage Telehub T1</div>`+
                            `</div>`+
                        `</div>`+

                    `</div>`+
                `</div>`

                $('#pills-tabContent').html(temple)
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
      '<td class="text-center"><a role="button" data-id="{10}" data-form="complaint" href="javascript:void(0)" class="p-t-3 btn-flat-bg btn-edit" data-toggle="tooltip" data-placement="top" data-original-title="Sửa"><i class="zmdi zmdi-eye c-green f-17"></i></a> </td>' +
      '</tr>';

    var rows = '';


    resp.data.forEach(function (el, i) {

      rows += template.str(
        i + 1,
        el.createDate ? moment(el.createDate).format('DD/MM/YYYY HH:ss') : '',
        el.nameCustomer ? el.nameCustomer : "",
        el.phoneNumber ? el.phoneNumber : "",
        el.email ? el.email : "",
        el.agent ? el.agent : "",
        0,
        el.channel ? el.channel : "",

      )
    })

    body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)


    $('#tbBody').html(rows);
  };

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
      window.onbeforeunload = null;
      $('.multi-date-picker').datepicker({
        multidate: 2,
        multidateSeparator: ' - ',
        format: 'dd/mm/yyyy',
      });
      bindClick();
      bindTextValue();
      queryFilter(false);
      chatBox();
    },
    uncut: function () {
      $(document).off('change', '#selectInfo')
      $(document).off('click', '.zmdi-refresh')
      $(document).off('click', '#searchTernal')
      $(document).off('click', '.btn.bgm-blue.uppercase.c-white')
      $(document).off('click', '.pagination li a')
      $(document).off('click', '#exportexcel')
    }
  }
}(jQuery);