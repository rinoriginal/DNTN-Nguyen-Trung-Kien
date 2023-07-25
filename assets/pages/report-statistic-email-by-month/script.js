var DFT = function ($) {
  /**
   * Lấy dữ liệu lọc và truy vấn server
   */
  var getFilterChat = function (firstLoad, exportExcel, page) {
    var filter = _.chain($('.input')).reduce(function (memo, el) {
      if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) {
        memo[el.name] = $(el).val();
      }
      return memo;
    }, {}).value();

    if (page) {
      filter['page'] = page;
    }

    if (exportExcel) {
      filter['exportExcel'] = exportExcel;
    }

    const apiURL = '/report-statistic-email-by-month?' + $.param(filter);

    _Ajax(apiURL, 'GET', {}, function (resp) {
      $('#body-table').empty();
      $('#thead-table').empty();
      $('#pagingReportEmail').empty();

      if (exportExcel && resp.code == 500) {
        swal({
          title: "Thông báo",
          text: "Không tìm thấy các trường phù hợp",
          type: "warning",
          confirmButtonColor: "#DD6B55",
          confirmButtonText: "Xác nhận!",
          closeOnConfirm: true
        });
        return;
      }

      if (resp.code == 500) {
        swal({ title: 'Cảnh báo!', text: resp.message });
        return;
      }

      if (!resp.data.length && firstLoad) {
        return;
      }

      if (!resp.data.length) {
        swal({
          title: "Thông báo",
          text: "Không tìm thấy các trường phù hợp",
          type: "warning",
          confirmButtonColor: "#DD6B55",
          confirmButtonText: "Xác nhận!",
          closeOnConfirm: true
        });
        return;
      }

      if (exportExcel) {
        downloadFromUrl(resp.linkFile);
      }

      loadData(resp);
      loadSum(resp);
      loadChart(resp);
      $('#pagingReportEmail').append(_.paging('#report-statistic-email-by-month', resp.paging));
      return;
    })
  };

  /**
   * Hiển thị dữ liệu lên giao diện
   */
  var loadData = function (resp) {
    var html = '';
    resp.data.forEach(function (el, index) {
      var rowspan = 0;
      rowspan = el.data.length;

      el.data.forEach(function (inner_el, index_child) {
        html += '<tr class="text-center">'
        if (index_child === 0) {
          html += '<td rowspan="' + rowspan + '">' + (index + 1 + (resp.paging.current * 10 - 10)) + '</td>';
          html += '<td rowspan="' + rowspan + '">' + el._id + '</td>';
        }
        html += '  <td>' + (inner_el.nameSource ? inner_el.nameSource : '') + '</td>';
        html += '  <td>' + inner_el.totalSource + '</td>';
        html += '  <td>' + inner_el.totalMail + '</td>';
        html += '  <td>' + inner_el.unDone + '</td>';
        html += '  <td>' + inner_el.done + '</td>';
        html += '</tr>';
      });
    });
    $('#body-table').html(html);
    window.MainContent.loadTooltip();
  };

  /**
   * Hiển thị tổng dữ liệu lên giao diện
   */
  var loadSum = function (resp) {
    var sumHTML = '';
    let sumEmailSource = 0;
    let sumMail = 0;
    let sumDone = 0;
    let sumUndone = 0;

    resp.sum.forEach(function (el) {
      el.data.forEach(function (child_el) {
        sumEmailSource += child_el.totalSource;
        sumMail += child_el.totalMail;
        sumDone += child_el.done;
        sumUndone += child_el.unDone;
      })
    })

    sumHTML += '<tr class="text-center m-t-5 ">'
    sumHTML += '  <td class="bgm-bluegray c-white"><strong>TỔNG LUỒNG MAIL</strong></td>'
    sumHTML += '  <td class="c-black"><strong>' + sumEmailSource + '</strong></td>'
    sumHTML += '  <td class="bgm-bluegray c-white"><strong>TỔNG MAIL</strong></td>'
    sumHTML += '  <td class="c-black"><strong>' + sumMail + '</strong></td>'
    sumHTML += '  <td class="bgm-bluegray c-white"><strong>CHƯA HOÀN THÀNH </strong></td>'
    sumHTML += '  <td class="c-black"><strong>' + sumUndone + '</strong></td>'
    sumHTML += '  <td class="bgm-bluegray c-white"><strong>HOÀN THÀNH</strong></td>'
    sumHTML += '  <td class="c-black"><strong>' + sumDone + '</strong></td>'
    sumHTML += '</tr>'

    $('#thead-table').html(sumHTML);
    window.MainContent.loadTooltip();
  }

  /**
   * Hiển thị biểu đồ
   */
  var loadChart = function (resp) {
    let dataLabel = [];
    let dataDone = [];
    let dataUndone = [];
    _.each(resp.sum, function (el) {
      dataLabel.push(el._id);
      let totalUndone = 0;
      let totalDone = 0;

      el.data.forEach(function (child_el) {
        totalUndone += child_el.unDone;
        totalDone += child_el.done;
      })

      dataDone.push(totalDone);
      dataUndone.push(totalUndone);
    })

    var options = {
      series: [{
        name: 'Hoàn thành',
        type: 'column',
        data: dataDone
      },
      {
        name: 'Chưa hoàn thành',
        type: 'column',
        data: dataUndone
      }],
      chart: {
        height: 500,
        type: 'line',
        stacked: true,
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false | '<img src="/static/icons/reset.png" width="20">'
          }
        }
      },
      //set color cột
      fill: {
        colors: ['#F98C0E', '#93D5DF']
      },
      //màu border column
      colors: ['#F98C0E', '#93D5DF'],
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
          fillColors: ['#F98C0E', '#93D5DF']
        }
      }
    };

    $("#chart").empty()
    let chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
    console.log('ahiiiiiiiiii', $(".apexcharts-zoomable").attr('class'));
    $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
  }

  /**
  * Hiển thị tên trường/cột theo file config
  */
  var bindValueEmailByDay = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_EMAIL_BY_MONTH), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTIC_EMAIL_BY_MONTH[item]);
    });
  };

  var bindClick = function () {
    // Click chuyển trang
    $(document).on('click', '#pagingReportEmail .pagination li a', function (e) {
      e.preventDefault();
      let url = e.target.getAttribute('href')
      let i = url.indexOf("?page=");
      let page = i === -1 ? 1 : url.substring(i + 6);
      _page = page;
      getFilterChat(false, false, page);
    });

    // Click tìm kiếm
    $('#btn_search_email_by_day').click(function () {
      getFilterChat(false, false, false);
    });

    // Click download Excel
    $(document).on('click', '#btn_export_email_by_day', function (e) {
      getFilterChat(false, true, false);
    });

    // Click làm mới trang
    $(document).on('click', '.zmdi-refresh', function () {
      _.LoadPage(window.location.hash);
    });

    // Export biểu đồ
    $("#showHideFields .menuChart").click(function () {
      let x = $(this).attr('data-id')
      switch (x) {
        case 'PNG':
          $('.exportPNG').click();
          break;
        case 'SVG':
          $('.exportSVG').click();
          break;
        case 'CSV':
          $('.exportCSV').click();
          break;
      }
    });

    //chọn nhóm tình trạng show tình trạng
    $('#reasonCategories').on('change', function () {
      let filter = {}
      filter.category = $(this).val()
      filter.scope = 'searchReason'
      _Ajax("/report-statistical-conversation-by-month?" + $.param(filter), 'GET', {}, function (resp) {
        console.log({ resp });
        $('#ticketreasons').val('')
        $('#ticketreasons').empty()
        $('#ticketreasons').selectpicker('refresh');
        if (resp.code == 200 && resp.data.length) {
          loadOptionReason(resp.data)
        }
      })
    })
  };

  var loadOptionReason = function (data) {
    $('#ticketreasons').val('')
    $('#ticketreasons').empty()
    $('#ticketreasons').append('<option value="" >---- Chọn ----</option>')
    data.forEach(function (item) {
      item.tReason.forEach(function (el) {
        $('#ticketreasons').append('<option value="' + el.trId + '">' + el.name + '</option>');
      })
    })
    $('#ticketreasons').selectpicker('refresh');
  }

  return {
    init: function () {
      $('.container').attr('class', 'container-fluid');

      bindValueEmailByDay();

      bindClick();

      window.onbeforeunload = null;

      $('.multi-date-picker').datepicker({
        multidate: 2,
        multidateSeparator: ' - ',
        format: 'dd/mm/yyyy'
      });

      $('.date-picker').datepicker({
        format: 'dd/mm/yyyy'
      });

      $('.selectpicker').selectpicker('refresh');

      getFilterChat(true, false, false);

    },
    uncut: function () {
      $(document).off('click', '#btn_export_email_by_day')
    }
  };
}(jQuery);