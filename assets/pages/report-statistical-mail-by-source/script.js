// author : haivh - 24/12/2020
var DFT = function ($) {

  const body = document.querySelector("#container");
  // Load lại trang
  $('.zmdi-refresh').bind('click', function () {
    _.LoadPage(location.hash = "report-statistical-mail-by-source");
  });

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTICAL_MAIL_BY_SOURCE), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTICAL_MAIL_BY_SOURCE[item]);
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

    _Ajax("/report-statistical-mail-by-source?" + $.param(filter), 'GET', {}, function (resp) {

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


  }

  //hiển thị dữ liệu lên giao diện
  var loadData = function (resp) {

    var template = '<tr>' +
      '<td class="text-center" style="width:140px" title="{0}">{0}</td>' +
      '<td class="text-center" style="width:140px" title="{1}">{1}</td>' +
      '<td class="text-center" style="width:140px" title="{2}">{2}</td>' +
      '<td class="text-center" style="width:140px" title="{3}">{3}</td>' +
      '<td class="text-center" style="width:140px" title="{4}">{4}</td>' +
      '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
      '</tr>';

    var rows = '';
    var sumSource = 0;
    var sumMail = 0;
    var sumDone = 0;
    var sumUnDone = 0;

    resp.data.forEach(function (el, i) {

      rows += template.str(
        (i + 1),
        el.name ? el.name : '',
        el.ticket ? el.ticket.length : 0,
        el.sumMail ? el.sumMail : 0,
        el.undone ? el.undone.length : 0,
        el.done ? el.done.length : 0
      )
    })

    // tính tổng 
    resp.sum.forEach(function (item) {
      sumMail += item.sumMail
      sumDone += item.done.length
      sumUnDone += item.undone.length
      sumSource += item.ticket.length
    })

    body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng luồng mail</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)

    // truyền kết quả tính tổng sang để xuất excel
    let querySumMail = document.getElementById('sumMail')
    querySumMail.value = sumMail
    let querySumSource = document.getElementById('sumSource')
    querySumSource.value = sumSource
    let querySumDone = document.getElementById('sumDone')
    querySumDone.value = sumDone
    let querySumUnDone = document.getElementById('sumUnDone')
    querySumUnDone.value = sumUnDone

    $('#tbBody').html(rows);

    let totalRowHtml = `
      <table id="sumRow" class="table table-hover table-condensed table-bordered table-fix" style="table-layout: fixed;">
        <tr>
          <td class="text-center c-white" style="background-color:#386470">TỔNG LUỒNG MAIL</td>
          <td class="text-center" >${sumSource}</td>
          <td class="text-center c-white" style="background-color:#386470">TỔNG MAIL</td>
          <td class="text-center" >${sumMail}</td>
          <td class="text-center c-white" style="background-color:#386470">HOÀN THÀNH</td>
          <td class="text-center" >${sumDone}</td>
          <td class="text-center c-white" style="background-color:#386470">CHƯA HOÀN THÀNH</td>
          <td class="text-center" >${sumUnDone}</td>
        </tr>
      </table>
    `;
    $('#totalRow').html(totalRowHtml);
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

    $("#chart").attr('style', 'display:block')
    $("#title_chart").attr('style', 'display:block')
    let dataLabel = [];
    let dataDone = [];
    let dataUnDone = [];

    for (let i = 0; i < resp.sum.length; i++) {

      dataLabel.push(resp.sum[i].name)
      dataDone.push(resp.sum[i].done.length)
      dataUnDone.push(resp.sum[i].undone.length)

    }

    var options = {
      series: [{
        name: 'Hoàn thành',
        type: 'column',
        data: dataDone
      }, {
        name: 'Chưa hoàn thành',
        type: 'column',
        data: dataUnDone
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
          columnWidth: '5%',
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