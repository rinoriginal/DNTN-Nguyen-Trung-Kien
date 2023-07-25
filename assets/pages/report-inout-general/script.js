
var DFT = function ($) {
  // Lọc và lấy dữ liệu
  var getFilter = function () {
    var filter = _.chain($('.input'))
      .reduce(function (memo, element) {
        if ($(element).val() != '' && $(element).val() != null)
          memo[element.name] = $(element).val();
        return memo;
      }, {}).value();

    _Ajax("/report-inout-general?" + $.param(filter), 'GET', {}, function (resp) {
      if (resp.code == 500) {
        $('#exportexcel').addClass('disabled');
        return swal({
          title: 'Có lỗi xảy ra',
          text: resp.message
        });
      }

      if (resp.code == 200 && !$.isEmptyObject(resp.data)) {
        $('#exportexcel').removeClass('disabled');
        return initTable(resp.data);
      }

      swal({
        title: _config.MESSAGE.TICKETREASON_TXT.SEARCH_NOT_FOUND_TITLE,
        text: _config.MESSAGE.TICKETREASON_TXT.SEARCH_NOT_FOUND_TEXT,
        type: "warning",
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Xác nhận!",
        closeOnConfirm: true
      });
      return $('#exportexcel').addClass('disabled');
    })
  };

  var bindClick = function () {
    // Tải lại trang
    $(document).on('click', '.zmdi-refresh', function () {
      _.LoadPage(window.location.hash);
    });

    // Click tìm kiếm
    $('a.btn.bgm-blue.uppercase.c-white').click(function () {
      getFilter();
    });

    // Xuất file báo cáo
    $('#exportexcel').on('click', function (event) {
      var todaysDate = moment().format('DD-MM-YYYY');
      var exportexcel = tableToExcel('exceldata', 'My Worksheet');
      $(this).attr('download', todaysDate + '_Báo cáo gọi vào - Cuộc gọi nhỡ.xls')
      $(this).attr('href', exportexcel);
    })

    $("#startDate").on("dp.change", function (e) {
      $('#endDate').data("DateTimePicker").minDate(e.date);
    });

    $("#endDate").on("dp.change", function (e) {
      $('#startDate').data("DateTimePicker").maxDate(e.date);
    });
  };

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT[item]);
    });
  }

  // Hiển thị dữ liệu lên giao diện
  var initTable = function (data) {
    $("#tbBody").empty();

    const {
      total: totalIn,
      missed: missedIn,
      connect: connectIn
    } = data.inInfo;

    var tag = _.Tags([
      {
        tag: 'tr', childs: [
          { tag: 'td', attr: { class: 'text-center' }, content: "" + data.totalCallOutbound },
          { tag: 'td', attr: { class: 'text-center' }, content: "" + data.totalCallOutboundConnected },
          { tag: 'td', attr: { class: 'text-center' }, content: "" + data.totalTicketOutbound },
          { tag: 'td', attr: { class: 'text-center' }, content: "" + totalIn },
          { tag: 'td', attr: { class: 'text-center' }, content: "" + connectIn },
          { tag: 'td', attr: { class: 'text-center' }, content: "" + missedIn },
          { tag: 'td', attr: { class: 'text-center' }, content: "" + data.ticketsIn }
        ]
      }
    ]);
    $("#tbBody").append(tag);
  }
  
  return {
    init: function () {
      bindClick();
      
      bindTextValue();
    },
    uncut: function () {
      // Disable sự kiện khi đóng trang
      $(document).off('click', 'a.btn.bgm-blue.uppercase.c-white');
      $(document).off('click', '#exportexcel');
      $(document).off('click', '.zmdi-refresh');
    }
  };
}(jQuery);