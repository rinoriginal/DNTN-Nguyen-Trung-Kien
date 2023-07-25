

var DFT = function ($) {
  var loadData = function (data) {
    let table = ''
    if (data) {
      _.each(data, (item) => {
        table += '<tr>' +
          '<td class="text-center">' + (item.customerInfos ? (item.customerInfos.field_ho_ten ? item.customerInfos.field_ho_ten : "") : "") + '</td>' +
          '<td class="text-center">' + (item.ANI ? item.ANI : "") + '</td>' +
          '<td class="text-center">' + (moment(item.StartDateTimeUTC).format("DD/MM/YYYY HH:mm:ss")) + '</td>' +
          '<td class="text-center">' + (item.agentInfos ? item.agentInfos.displayName : "") + '</td>' +
          '<td class="text-center">' + (moment(item.TimePickUpCall).format("DD/MM/YYYY HH:mm:ss")) + '</td>' +
          '<td class="text-center">' + (toHHMMSS(item.TotalDuarationHandling)) + '</td>' +
          '<td class="text-center" title="' + (item.ticketReasons ? item.ticketReasons.name : "") + '">' + (item.ticketReasons ? item.ticketReasons.name : "") + '</td>' +
          '<td class="text-center" title="' + (item.note ? item.note : "") + '">' + (item.note ? item.note : "") + '</td>' +
          '<td class="text-center">' + (item.code == Type_Reviews.HaiLong.value ? Type_Reviews.HaiLong.name : (item.code == Type_Reviews.KhongHaiLong.value ? Type_Reviews.KhongHaiLong.name : "")) + '</td>' +
          '</tr>'
      })
    }
    $('#body-table').append(table);
  };
  var queryFilter = function (isDownload, page) {
    var filter = _.chain($('.input'))
      .reduce(function (memo, el) {
        if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
        return memo;
      }, {}).value();

    if (isDownload) {
      filter.isDownload = true;
      filter.totalResult = Number($('#totalpage').text().split(' ')[1]);
    }
    if (page) {
      filter.page = page;
    }
    _AjaxData('/report-handle-by-agent?' + $.param(filter), 'GET', {}, function (resp) {
      console.log(1111, resp);
      if (resp.code == 200 && resp.data.length == 0) {
        swal({ title: "THÔNG BÁO!", type: "warning", text: "Không tìm thấy dữ liệu !" });
      } else if (resp.code == 200 && resp.data.length > 0) {
        if (filter.isDownload == true) {
          downloadFromUrl(window.location.origin + resp.data);
        } else {
          $('#body-table').empty();
          loadData(resp.data);

          $('#totalpage').text("Tổng: " + resp.paging.totalResult);
          $('#paging').html(createPaging(resp.paging));
        }
      } else {
        swal({ title: "THÔNG BÁO!", type: "error", text: "Server error or disconnect !" });
      }
    })
  };

  var bindClick = function () {
    $('.multi-date-picker').datepicker({
      multidate: 2,
      multidateSeparator: '/',
      format: 'yyyy-mm-dd'
    });
    // Nút Lọc/Search
    $(document).on('click', '#btn-search', function (e) {
      e.preventDefault();
      queryFilter(false);
    });
    $(document).on('click', '#exportexcel', function (e) {
      e.preventDefault();
      queryFilter(true);
    });
    $(document).on('click', '.pagination li a', function (e) {
      e.preventDefault();
      queryFilter(false, $(this).attr('data-link'));
    });
  }

  var bindValue = function () {
    _.each(_.allKeys(_config.MESSAGE.REPORT_HANDLE_BY_AGENT), function (item) {
      $('.' + item).html(_config.MESSAGE.REPORT_HANDLE_BY_AGENT[item]);
    });
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
  var toHHMMSS = (secs) => {
    var sec_num = parseInt(secs, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
  }

  return {
    init: function () {
      bindClick();
      bindValue();
      //queryFilter();
    },
    uncut: function () {
      // xóa sự kiện khi rời trang
      $(document).off('click', '#btn-search');
      $(document).off('click', '.pagination li a');
      $(document).off('click', '#exportexcel');
    }
  };
}(jQuery);