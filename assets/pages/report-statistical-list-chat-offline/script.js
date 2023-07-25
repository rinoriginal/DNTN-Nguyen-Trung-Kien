var DFT = function ($) {

  console.log('load');
  console.log($('#sum'));

  const body = document.querySelector("#container");
  // const body = document.querySelector(".table-responsive");
  // Load lại trang
  $('.zmdi-refresh').bind('click', function () {
    _.LoadPage(location.hash = "report-statistical-list-chat-offline");

  });

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTICAL_LIST_CHAT_OFFLINE), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_STATISTICAL_LIST_CHAT_OFFLINE[item]);
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

    _Ajax("/report-statistical-list-chat-offline?" + $.param(filter), 'GET', {}, function (resp) {

      if (resp.code == 200) {
        if (filter.isDownload == true) {
          downloadFromUrl(window.location.origin + resp.data)
        } else {
          $('#tbBody').empty();
          if (resp.data.length) {
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
    $('a.btn.bgm-blue.uppercase.c-white').click(function () {
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
      '<td title="{6}" style="width:140px">{6}</td>' +
      '<td class="text-center" style="width:140px" title="{7}">{7}</td>' +
      '<td class="text-center" style="width:140px" title="{8}">{8}</td>' +
      '</tr>';
    var rows = '';
    var tongThu = 0;
    var tongChi = 0;
    var sum = 0;
   

    // body.insertAdjacentHTML('afterend', `<table id="sumMoney" class="table table-hover table-condensed table-bordered table-fix" style="table-layout: fixed;"><tr style="background-color:#ccebff"><td class="text-center" colspan="7">TỔNG</td><td class="text-center" >${numeral(sum).format('0,0 ')}</td><td class="text-center" ></td></tr></table>`)
    // body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)


    $('#tbBody').html(rows);
  };

  function createPaging(paging, classPaging) {
    console.log(paging);

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
          format: 'dd/mm/yyyy'
      });
      bindClick();
      bindTextValue();
      queryFilter(false);
    },
    uncut: function () {
      $(document).off('change', '#selectInfo')
      $(document).off('click', '.btn.bgm-blue.uppercase.c-white')
      $(document).off('click', '.pagination li a')
      $(document).off('click', '#exportexcel')
    }
  }
}(jQuery);