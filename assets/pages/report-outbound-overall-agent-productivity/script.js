var templateDate = "DD/MM/YYYY HH:mm:ss";
var DFT = function ($) {
  // Lấy dữ liệu
  var getFilter = function (firstLoad, exportExcel) {
    var filter = {};
    $(".page-loader").show();

    var filter = _.chain($('.input')).reduce(function (memo, input) {
      if (!_.isEqual($(input).val(), '') && !_.isEqual($(input).val(), null)) {
        memo[input.name] = $(input).val();
      }
      return memo;
    }, {}).value();


    if (!exportExcel) {
      $('#body-table').empty();
      $('#thead-table').empty();
    } else {
      filter.exportExcel = true;
    }

    console.log(`------- filter ------- test`);
    console.log(filter);
    console.log(`------- filter ------- test`);

    $.ajax({
      url: '/report-outbound-overall-agent-productivity',
      type: "GET",
      dataType: "json",
      data: filter,
      success: function (resp) {
        $(".page-loader").fadeOut("slow")
        console.log(`------- response ------- `);
        console.log(resp);
        console.log(`------- response ------- `);
        if (resp && resp.code == 200) {
          if (!exportExcel) {
            loadData(resp.data);
            loadSum(resp.data);
            return;
          } else {
            return downloadFromUrl(resp.linkFile);
          }
        }

        if (!firstLoad) {
          return swal({ title: 'Cảnh báo!', text: resp.error });
        }
      },
    });
  };

  var loadData = function (data) {
    var rowHtml = '';
    data.forEach(function (el) {
      rowHtml += `
        <tr>
          <td class="text-center"><a href="javascript:void(0)">${el.displayName}</a></td>
          <td class="text-center">${el.totalCall}</td>
          <td class="text-center">${sToTime(el.totalCallTime)}</td>
          <td class="text-center">${sToTime(el.avgCallTime)}</td>
          <td class="text-center">${el.totalCallConnect}</td>
          <td class="text-center">${sToTime(el.totalWaitTime)}</td>
          <td class="text-center">${sToTime(el.totalTalkTime)}</td>
          <td class="text-center">${sToTime(el.totalCallConnect && el.totalCallConnect > 0 ? el.totalTalkTime / el.totalCallConnect : 0)}</td>
          <td class="text-center">${percentConvert(el.totalCallConnect, el.totalCall)}</td>
          <td class="text-center">${el.totalTicket}</td>
          <td class="text-center">${el.ticketDone}</td>
        </tr>
      `;
    });
    $('#body-table').html(rowHtml);
  }

  var loadSum = function (data) {
    let totalCall = 0;
    let totalCallTime = 0;
    let avgCallTime = 0;
    let totalCallConnect = 0;
    let totalWaitTime = 0;
    let totalTalkTime = 0;
    let avgTalkTime = 0;
    let totalTicket = 0;
    let ticketDone = 0;

    data.forEach(function (el) {
      totalCall += el.totalCall;
      totalCallTime += el.totalCallTime;
      avgCallTime += el.avgCallTime;
      totalCallConnect += el.totalCallConnect;
      totalWaitTime += el.totalWaitTime;
      totalTalkTime += el.totalTalkTime;
      avgTalkTime += el.totalCallConnect && el.totalCallConnect > 0 ? el.totalTalkTime / el.totalCallConnect : 0;
      totalTicket += el.totalTicket;
      ticketDone += el.ticketDone;
    });

    let totalHtml = `
      <tr>
        <td class="bgm-red c-white text-center"><strong>Tổng</strong></td>
        <td class="c-red text-center"><strong>${totalCall}</strong></td>
        <td class="c-red text-center"><strong>${sToTime(totalCallTime)}</strong></td>
        <td class="c-red text-center"><strong>${sToTime(avgCallTime)}</strong></td>
        <td class="c-red text-center"><strong>${totalCallConnect}</strong></td>
        <td class="c-red text-center"><strong>${sToTime(totalWaitTime)}</strong></td>
        <td class="c-red text-center"><strong>${sToTime(totalTalkTime)}</strong></td>
        <td class="c-red text-center"><strong>${sToTime(avgTalkTime)}</strong></td>
        <td class="c-red text-center"><strong>${percentConvert(totalCallConnect, totalCall)}</strong></td>
        <td class="c-red text-center"><strong>${totalTicket}</strong></td>
        <td class="c-red text-center"><strong>${ticketDone}</strong></td>
      </tr>
    `;

    $('#thead-table').html(totalHtml);
  }

  function percentConvert(num1, num2) {
    if (!num2 || num2 == 0) return '0%';
    const percent = (num1 / num2) * 100;

    if (Number.isInteger(percent)) {
      return `${percent}%`;
    }
    return `${percent.toFixed(2)}%`;
  }

  function sToTime(secs) {
    if (isNaN(secs) || !secs || secs == 0) return "0:00:00";
    var sec = Math.ceil(secs);
    var minutes = Math.floor(sec / 60);
    sec = sec % 60;
    var hours = Math.floor(minutes / 60)
    minutes = minutes % 60;
    return hours + ":" + pad(minutes) + ":" + pad(sec);
  }

  function pad(num) {
    return ("0" + num).slice(-2);
  }

  var bindClick = function () {
    // Tải lại trang
    $('.zmdi-refresh').on('click', function () {
      _.LoadPage(window.location.hash);
    });

    // Click tìm kiếm
    $('#searchData').on('click', function () {
      getFilter(false);
    });

    // Download excel
    $('#exportData').on('click', function () {
      getFilter(false, true);
    });

    $("#startDate").on("dp.change", function (e) {
      $('#endDate').data("DateTimePicker").minDate(e.date);
    });
    $("#endDate").on("dp.change", function (e) {
      $('#startDate').data("DateTimePicker").maxDate(e.date);
    });
  };

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_OVERALL_AGENT_PRODUCTIVITY), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_OVERALL_AGENT_PRODUCTIVITY[item]);
    });
  }

  return {
    init: function () {
      bindClick();
      bindTextValue();
      // getFilter(true);

      $('.selectpicker').selectpicker('refresh');

      _.each(_.keys(window.location.obj), function (key) {
        $('#' + key).val(window.location.obj[key]);
      });
    },
    uncut: function () {
      $(document).off('click', '.zpaging');
      $(document).off('click', '.zmdi-refresh');
      $(document).off('click', '#searchData');
      $(document).off('click', '#exportData');
    }
  };
}(jQuery);