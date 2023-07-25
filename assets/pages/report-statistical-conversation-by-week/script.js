// author : haivh - 24/12/2020
var DFT = function ($) {

  const body = document.querySelector("#container");
  // Load lại trang
  $('.zmdi-refresh').bind('click', function () {
    _.LoadPage(location.hash = "report-statistical-conversation-by-week");
  });

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTICAL_CONVERTSATION_BY_WEEK), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTICAL_CONVERTSATION_BY_WEEK[item]);
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

    _Ajax("/report-statistical-conversation-by-week?" + $.param(filter), 'GET', {}, function (resp) {

      if (resp.code == 200) {
        if (filter.isDownload == true) {
          downloadFromUrl(window.location.origin + resp.data)
        } else {
          $('#sum').remove();
          $('#sumRow').remove();
          $('#tbBody').empty();
          if (resp.data.length) {
            loadData(resp);
            loadChart(resp);
            $('#paging').html(createPaging(resp.paging));
          } else {
            $("#chart").attr('style', 'display:none')
            $("#title_chart").attr('style', 'display:none')
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

    $('#reasonCategories').on('change', function () {
      let filter = {}
      filter.category = $(this).val()
      filter.scope = 'searchReason'
      _Ajax("/report-statistical-conversation-by-month?" + $.param(filter), 'GET', {}, function (resp) {
        console.log({ resp });
        $('#reason').val('')
        $('#reason').empty()
        $('#reason').selectpicker('refresh');
        if (resp.code == 200 && resp.data.length) {
          loadOptionReason(resp.data)
        }
      })
    })
  }



  var loadOptionReason = function (data) {
    $('#reason').val('')
    $('#reason').empty()
    $('#reason').append('<option value="" >---- Chọn ----</option>')
    data.forEach(function (item) {
      item.tReason.forEach(function (el) {
        $('#reason').append('<option value="' + el.trId + '">' + el.name + '</option>');
      })
    })
    $('#reason').selectpicker('refresh');
  }


  //hiển thị dữ liệu lên giao diện
  var loadData = function (resp) {
    console.log({ resp });

    var template = '<tr>' +
      '<td class="text-center" style="width:140px" title="{0}">{0}</td>' +
      '<td class="text-center" style="width:140px" title="{1}">{1}</td>' +
      '<td class="text-center" style="width:140px" title="{2}">{2}</td>' +
      '<td class="text-center" style="width:140px" title="{3}">{3}</td>' +
      '<td class="text-center" style="width:140px" title="{4}">{4}</td>' +
      '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
      '<td class="text-center" title="{6}" style="width:140px">{6}</td>' +
      '<td class="text-center" style="width:140px" title="{7}">{7}</td>' +
      '</tr>';

    var rows = '';
    let countConverChat = 0;
    let countConverChatHasTime = 0;
    let sumConverReceive = 0;
    let sumConverMiss = 0;
    let sumOffline = 0;
    let sumTimeConver = 0;
    let sumTimeWait = 0;


    resp.data.forEach(function (el) {
      let converOffline = el.converOffline ? _.compact(el.converOffline).length : 0
      let converMiss = el.converMiss ? _.compact(el.converMiss).length : 0
      let converReceive = el.converReceive ? _.compact(el.converReceive).length : 0

      let timeConvertAvg = el.timeConver / (converMiss + converReceive)

      let timveWaitAvg = el.timeWait / (converMiss + converReceive)

      rows += template.str(
        el.week ? el.week : '',
        converOffline + converMiss + converReceive,
        converReceive,
        converMiss,
        converOffline,
        hms(el.timeConver),
        hms(timeConvertAvg),
        hms(timveWaitAvg)

      )
    })

    // tính tổng 
    resp.sum.forEach(function (item) {
      let converOffline = item.converOffline ? _.compact(item.converOffline).length : 0
      let converMiss = item.converMiss ? _.compact(item.converMiss).length : 0
      let converReceive = item.converReceive ? _.compact(item.converReceive).length : 0

      let sumConvertNotOffline = (converMiss + converReceive) // các cuộc chat có thời gian chat
      let sumConvert = (converOffline + converMiss + converReceive) // tất cả các cuộc chat

      countConverChatHasTime += sumConvertNotOffline // đếm những cuộc gọi có thời gian hoạt động ( receive & miss)
      countConverChat += sumConvert //đếm tất cả các cuộc gọi

      sumConverReceive += converReceive
      sumConverMiss += converMiss
      sumOffline += converOffline

      sumTimeConver += item.timeConver //tổng thời gian tiếp nhận và nhỡ
      sumTimeWait += item.timeWait //tổng thời gian chờ
    })


    let timeConvertAvg = sumTimeConver / countConverChatHasTime
    let timeWaitAvg = sumTimeWait / countConverChatHasTime

    body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)

    // truyền kết quả tính tổng sang để xuất excel
    let queryConverChat = document.getElementById('countConverChat')
    queryConverChat.value = countConverChat
    let queryConverReceive = document.getElementById('sumConverReceive')
    queryConverReceive.value = sumConverReceive
    let queryConverMiss = document.getElementById('sumConverMiss')
    queryConverMiss.value = sumConverMiss
    let querySumOffline = document.getElementById('sumOffline')
    querySumOffline.value = sumOffline
    let queryTimeCover = document.getElementById('timeConver')
    queryTimeCover.value = sumTimeConver
    let queryTimeCoverAvg = document.getElementById('timeConverAvg')
    queryTimeCoverAvg.value = timeConvertAvg
    let queryTimeWaitAvg = document.getElementById('timeWaitAvg')
    queryTimeWaitAvg.value = timeWaitAvg

    $('#tbBody').html(rows);

    let totalRowHtml = `
      <table id="sumRow" class="table table-hover table-condensed table-bordered table-fix" style="table-layout: fixed;">
        <tr>
          <td class="text-center c-white" style="background-color:#F33535">TỔNG</td>
          <td class="text-center" >${countConverChat}</td>
          <td class="text-center" >${sumConverReceive}</td>
          <td class="text-center" >${sumConverMiss}</td>
          <td class="text-center" >${sumOffline}</td>
          <td class="text-center" >${hms(sumTimeConver)}</td>
          <td class="text-center" >${hms(timeConvertAvg)}</td>
          <td class="text-center" >${hms(timeWaitAvg)}</td>
        </tr>
      </table>
    `;
    $('#totalRow').html(totalRowHtml);
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
    if (!!pageNum) {
      $('#paging').attr('style', 'display:block')
    }
    else {
      $('#paging').attr('style', 'display:none')
    }
    return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
  };

  // biểu đồ thống kê
  var loadChart = function (resp) {
    console.log({ resp });

    $("#chart").attr('style', 'display:block')
    $("#title_chart").attr('style', 'display:block')
    let dataLabel = [];
    let dataConnect = [];
    let dataMiss = [];
    let dataOffline = [];

    for (let i = 0; i < resp.sum.length; i++) {

      dataLabel.push(resp.sum[i]._id)
      dataConnect.push(_.compact(resp.sum[i].converReceive).length)
      dataMiss.push(_.compact(resp.sum[i].converMiss).length)
      dataOffline.push(_.compact(resp.sum[i].converOffline).length)

    }

    var options = {
      series: [{
        name: 'Tiếp nhận',
        type: 'column',
        data: dataConnect
      }, {
        name: 'Nhỡ',
        type: 'column',
        data: dataMiss
      }, {
        name: 'Offline',
        type: 'column',
        data: dataOffline
      }],
      chart: {
        height: 500,
        type: 'line',
        stacked: true,
        toolbar: {
          show: true
        }
      },
      // title: {
      //   text: 'Báo cáo thống kê hội thoại chat theo tháng',
      //   align: 'center',
      //   margin: 10,
      //   offsetX: 0,
      //   offsetY: 475,
      //   floating: false,
      //   style: {
      //     fontSize: '14px',
      //     fontWeight: 'bold',
      //     fontFamily: undefined,
      //     color: '#263238'
      //   },
      // },
      //set color cột
      fill: {
        colors: ['#F98C0E', '#93D5DF', '#989898']

      },
      //màu border column
      colors: ['#F98C0E', '#93D5DF', '#989898'],
      //set width column
      plotOptions: {
        bar: {
          columnWidth: '1%',
        }
      },
      stroke: {
        width: [1, 1, 1],
        curve: 'smooth',
      },
      xaxis: {
        categories: dataLabel,
      },
      tooltip: {
        enabledOnSeries: [0, 1, 2],
        fixed: {
          enabled: true,
          position: 'topLeft', // topRight, topLeft, bottomRight, bottomLeft
          offsetY: 30,
          offsetX: 60
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'center',
        offsetX: 40,
        //set color radio chú thích
        markers: {
          radius: 0,
          fillColors: ['#F98C0E', '#93D5DF', '#989898']
        }
      }
    };
    $("#chart").empty()
    let chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
    $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')

  }


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
      $(document).off('change', '#reasonCategories')
      $(document).off('click', '.zmdi-refresh')
      $(document).off('click', '#searchTernal')
      $(document).off('click', '.btn.bgm-blue.uppercase.c-white')
      $(document).off('click', '.pagination li a')
      $(document).off('click', '#exportexcel')
    }
  }
}(jQuery);