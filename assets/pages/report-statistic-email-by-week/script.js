var DFT = function ($) {
  /**
  * Hiển thị tên trường/cột theo file config
  */
  var bindValueEmailByDay = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_EMAIL_BY_WEEK), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTIC_EMAIL_BY_WEEK[item]);
    });
  };

  var bindClickChat = function () {

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
    let total = '<tr class="text-center m-t-5 ">' +
      '<td class="bgm-bluegray c-white"><strong>TỔNG LUỒNG MAIL</strong></td>' +
      '<td class="c-black"><strong>{0}</strong></td>' +
      '<td class="bgm-bluegray c-white"><strong>TỔNG MAIL</strong></td>' +
      '<td class="c-black"><strong>{1}</strong></td>' +
      '<td class="bgm-bluegray c-white"><strong>HOÀN THÀNH</strong></td>' +
      '<td class="c-black"><strong>{2}</strong></td>' +
      '<td class="bgm-bluegray c-white"><strong>CHƯA HOÀN THÀNH </strong></td>' +
      '<td class="c-black"><strong>{3}</strong></td>' +
      '</tr>'
    let sumEmailFlow = 0;
    let sumMail = 0;
    let sumDone = 0;
    let sumUndone = 0;
    resp.sum.forEach(function (el) {
      sumEmailFlow += 0;
      sumMail += 0;
      sumDone += 0;
      sumUndone += 0;
    })
    sumRows += total.str(sumEmailFlow, sumMail, sumDone, sumUndone)
    $('#thead-table').html(sumRows);
    window.MainContent.loadTooltip();
  }

  var loadChart = function (resp) {
    let dataLabel = [];
    let dataDone = [];
    let dataUndone = [];
    _.each(resp.sum, function (el) {
      dataLabel.push(el.date);
      dataDone.push(el.emailDone);
      dataUndone.push(el.emailUndone);
    })

    var options = {
      series: [{
        name: 'Hoàn thành',
        type: 'column',
        data: dataDone
      }, {
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


  return {
    init: function () {
      $('.container').attr('class', 'container-fluid')

      bindValueEmailByDay();

      bindClickChat();

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

      // fake data chart
      let data = {
        sum: [
          { date: 1, emailDone: 10, emailUndone: 10 },
          { date: 2, emailDone: 10, emailUndone: 10 },
          { date: 3, emailDone: 10, emailUndone: 10 },
          { date: 4, emailDone: 10, emailUndone: 10 },
          { date: 5, emailDone: 10, emailUndone: 10 },
          { date: 6, emailDone: 10, emailUndone: 10 },
          { date: 7, emailDone: 10, emailUndone: 10 },
          { date: 8, emailDone: 10, emailUndone: 10 },
          { date: 9, emailDone: 10, emailUndone: 10 },
          { date: 10, emailDone: 10, emailUndone: 10 },
          { date: 11, emailDone: 10, emailUndone: 10 },
          { date: 12, emailDone: 10, emailUndone: 10 },
          { date: 13, emailDone: 10, emailUndone: 10 },
          { date: 14, emailDone: 10, emailUndone: 10 },
          { date: 15, emailDone: 10, emailUndone: 10 },
          { date: 16, emailDone: 10, emailUndone: 10 },
          { date: 17, emailDone: 10, emailUndone: 10 },
          { date: 18, emailDone: 10, emailUndone: 10 },
          { date: 19, emailDone: 10, emailUndone: 10 },
          { date: 20, emailDone: 10, emailUndone: 10 },
          { date: 21, emailDone: 10, emailUndone: 10 },
          { date: 22, emailDone: 10, emailUndone: 10 },
          { date: 23, emailDone: 10, emailUndone: 10 },
          { date: 24, emailDone: 10, emailUndone: 10 },
          { date: 25, emailDone: 10, emailUndone: 10 },
          { date: 26, emailDone: 10, emailUndone: 10 },
          { date: 27, emailDone: 10, emailUndone: 10 },
          { date: 28, emailDone: 10, emailUndone: 10 },
          { date: 29, emailDone: 10, emailUndone: 10 },
          { date: 30, emailDone: 10, emailUndone: 10 },
        ]
      }
      loadChart(data);

      loadSum({ sum: [] });
    },
    uncut: function () {
      $(document).off('click', '#btnExport')
    }
  };
}(jQuery);