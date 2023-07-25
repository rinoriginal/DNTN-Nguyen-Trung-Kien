var DFT = function ($) {
  /**
  * Hiển thị tên trường/cột theo file config
  */

  var bindValueTernal = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT_BY_TIME), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTIC_CHAT_BY_TIME[item]);
    });
  };

  var bindClickTernal = function () {
    // Chuyển trang
    $(document).on('click', '#pagingChat .pagination li a', function (e) {
      e.preventDefault();
      let url = e.target.getAttribute('href')
      let i = url.indexOf("?page=");
      let page = i === -1 ? 1 : url.substring(i + 6);
      _page = page;
      getFilterChat(false, false, page);
    });

    // Click tìm kiếm
    $('#searchChat').click(function () {
      console.log(1111111111);

      getFilterChat(true, false);
    });

    // download Excel
    $(document).on('click', '#btnExport', function (e) {
      // e.preventDefault();
      getFilterChat(true, true);
    });

    // Làm mới trang
    $(document).on('click', '.zmdi-refresh', function () {
      _.LoadPage(window.location.hash);
    });

    // chọn biểu đồ
    $("#showHideFields .menuChart").click(function () {
      let x = $(this).attr('data-id')
      switch (x) {
        case 'PNG':
          $('.exportPNG').click();
          break;
      }
    });

  };

  // Lấy dữ liệu lọc và truy vấn server
  var getFilterChat = function (load, exportExcel, page) {
    var filter = _.chain($('.input'))
      .reduce(function (memo, el) {
        if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
        return memo;
      }, {}).value();

    if (page) filter['page'] = page;
    if (exportExcel == true) filter['exportExcel'] = exportExcel
    console.log('filter', filter);

    if (load) {
      _Ajax("/report-statistic-chat-by-time?" + $.param(filter), 'GET', {}, function (resp) {
        console.log('ahihi', resp);

        if (resp.code == 200) {
          $('#body-table').empty();
          if (resp.data.length) {
            console.log(resp.data.length);
            let total = document.querySelector('.totalChat');
            if (total) {
              total.remove();
            }
            $('#pagingChat').empty();
            loadData(resp);
            loadSum(resp);
            loadChart(resp);
            $('#pagingChat').append(_.paging('#report-statistic-chat-by-time', resp.paging));
            if (exportExcel == true) {
              downloadFromUrl(resp.linkFile);
            }
          } else {
            $('#totalChat').html('');
            swal({
              title: "Thông báo",
              text: "Không tìm thấy các trường phù hợp",
              type: "warning",
              confirmButtonColor: "#DD6B55",
              confirmButtonText: "Xác nhận!",
              closeOnConfirm: true
            });

          }
        } else {
          swal({ title: 'Cảnh báo!', text: resp.message });
        }
      })
    } else {
      _Ajax("/report-statistic-chat-by-time?" + $.param(filter), 'GET', {}, function (resp) {
        console.log('ehehe');
        if (resp.code == 200) {
          $('#body-table').empty();
          if (resp.data.length) {
            console.log(resp.data.length);
            let total = document.querySelector('.totalChat');
            if (total) {
              total.remove();
            }
            $('#pagingChat').empty();
            loadData(resp);
            loadSum(resp);
            loadChart(resp);
            $('#pagingChat').append(_.paging('#report-statistic-chat-by-time', resp.paging));
          }
        } else {
          swal({ title: 'Cảnh báo!', text: resp.message });
        }
      })
    }

  };

  var loadSum = function (resp) {
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

    var sumRows = '';
    let total = '<table id="sumRow" class="table table-hover table-condensed table-bordered table-fix" style="table-layout: fixed;">' +
      '<tr>' +
        '<td class="bgm-red c-white"><strong>TỔNG</strong></td>' +
        '<td class="c-red"><strong>{0}</strong></td>' +
        '<td class="c-red"><strong>{1}</strong></td>' +
        '<td class="c-red"><strong>{2}</strong></td>' +
        '<td class="c-red"><strong>{3}</strong></td>' +
        '<td class="c-red"><strong>{4}</strong></td>' +
        '<td class="c-red"><strong>{5}</strong></td>' +
        '<td class="c-red"><strong>{6}</strong></td>' +
        '<td class="c-red"><strong>{7}</strong></td>' +
        '<td class="c-red"><strong>{8}</strong></td>' +
      '</tr>'
    '</table>'

    let sumChat = 0;
    let sumChatReceive = 0;
    let sumChatTime = 0;
    let sumChatTimeAvg = 0;
    let sumTotalMessage = 0;
    let sumChatMiss = 0;
    let sumOffline = 0;
    let sumWaitTimeBiggerSLA = 0;
    let sumWaitTimeAvg = 0;

    resp.sum.forEach(function (el) {
      sumChat += el.count;
      sumChatReceive += el.chatReceive;
      sumChatTime += el.chatTime;
      sumChatTimeAvg += (el.chatReceive + el.chatMiss) != 0
        ? el.chatTime / (el.chatReceive + el.chatMiss)
        : 0;
      sumTotalMessage += el.totalMessage;
      sumChatMiss += el.chatMiss;
      sumOffline += el.chatOffline;
      sumWaitTimeAvg += (el.chatReceive + el.chatMiss) != 0
        ? el.chatWaitTime / (el.chatReceive + el.chatMiss)
        : 0;
      sumWaitTimeBiggerSLA += el.chatWaitTimeBiggerSLA;
    })
    sumRows += total.str(
      sumChat,
      sumChatReceive,
      msToTime(sumChatTime),
      msToTime(sumChatTimeAvg),
      sumTotalMessage,
      sumChatMiss,
      sumOffline,
      msToTime(sumWaitTimeAvg),
      sumWaitTimeBiggerSLA,
    )
    $('#totalChat').html(sumRows);
    window.MainContent.loadTooltip();
  }

  // Hiển thị dữ liệu lên giao diện
  var loadData = function (resp) {
    console.log(1111, resp);
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

    var template = '<tr class="text-center">' +
      '<td>{0}</td>' +
      '<td>{1}</td>' +
      '<td>{2}</td>' +
      '<td>{3}</td>' +
      '<td>{4}</td>' +
      '<td>{5}</td>' +
      '<td>{6}</td>' +
      '<td>{7}</td>' +
      '<td>{8}</td>' +
      '<td>{9}</td>' +
      '</tr>';
    var rows = '';
    resp.data.forEach(function (el) {
      if (_.isEmpty(el)) return;

      rows += template.str(
        el._id,
        el.count,
        el.chatReceive,
        msToTime(el.chatTime),
        msToTime((el.chatReceive + el.chatMiss) != 0 ? el.chatTime / (el.chatReceive + el.chatMiss) : 0),
        el.totalMessage,
        el.chatMiss,
        el.chatOffline,
        msToTime((el.chatReceive + el.chatMiss) != 0 ? el.chatWaitTime / (el.chatReceive + el.chatMiss) : 0),
        el.chatWaitTimeBiggerSLA,
      );
    });
    $('#body-table').html(rows);
    window.MainContent.loadTooltip();
  };

  var loadChart = function (resp) {

    let hoursList = [];
    for (let i = 0; i < 24; i++) {
      hoursList.push(i);
    }

    hoursList.forEach((item) => {
      let dataFound = resp.sum.find((i) => Number(item) == Number(i._id));
      if (!dataFound) {
        let element = {};
        element._id = item,
          element.count = 0,
          element.chatReceive = 0,
          element.chatTime = 0,
          element.totalMessage = 0,
          element.chatMiss = 0,
          element.chatOffline = 0,

          resp.sum.push(element);
      }
    });

    resp.sum.sort(function (a, b) {
      return a._id - b._id;
    });

    let dataTotalMessage = [];
    let dataLabel = [];
    resp.sum.forEach(function (el) {
      dataTotalMessage.push(Number(el.count))
    })

    for (let i = 0; i < 24; i++) {
      dataLabel.push(i < 10 ? '0' + i : i)
    }

    var options = {
      series: [{
        name: 'Số lượng hội thoại',
        data: dataTotalMessage
      }],
      chart: {
        type: 'bar',
        height: 500,
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
        colors: ['#3E8416']
      },
      //màu border column
      colors: ['#3E8416'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '20%',
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        width: [1, 1, 1],
        curve: 'smooth',
      },
      xaxis: {
        categories: dataLabel,
      },
      yaxis: {
        title: {
          text: 'Tổng số lượng hội thoại'
        }
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return val + ' cuộc hội thoại'
          }
        }
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
    console.log('ahiiiiiiiiii', $(".apexcharts-zoomable").attr('class'));
    $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
  }

  // Lấy dữ liệu lần đầu tiên
  var fetchData = function () {
    var filter = _.chain($('.input'))
      .reduce(function (memo, el) {
        if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
        return memo;
      }, {}).value();

    _Ajax("/report-statistic-chat-by-time?" + $.param(filter), 'GET', {}, function (resp) {
      if (resp.code == 200) {
        $('#body-table').empty();
        if (resp.data.length) {
          let total = document.querySelector('.totalChat');
          if (total) {
            total.remove();
          }
          $('#pagingChat').empty();
          loadData(resp);
          loadSum(resp);
          loadChart(resp);
          $('#pagingChat').append(_.paging('#report-statistic-chat-by-time', resp.paging));
        }
      }
    })
  };

  return {
    init: function () {
      $('.container').attr('class', 'container-fluid')
      bindValueTernal();
      bindClickTernal();
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

      // lấy dữ liệu lần đầu tiên
      fetchData();
    },
    uncut: function () {
      $(document).off('click', '#btnExport')
      $(document).off('click', '#pagingChat .pagination li a')
    }
  };
}(jQuery);