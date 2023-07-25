
var DFT = function ($) {
  var lastPagingData = {};
  var sources = {};
  var currPage = 1;

  function statusName(status) {
    switch (status) {
      case 0:
        return 'Chờ xử lý';
      case 1:
        return 'Đang xử lý';
      case 2:
        return 'Hoàn thành';
    }
  }

  function showLoadingPage(status) {
    if (status) return $(".page-loader").show();
    return $(".page-loader").fadeOut("slow");
  }

  // Lấy dữ liệu lọc và truy vấn server
  function queryFilter(downloadExcel) {
    showLoadingPage(true);
    let filter = _.chain($('#frm-report-campaign-ticket .searchColumn'))
      .reduce(function (memo, el) {
        if ($(el).val() != '') {
          memo[el.name] = $(el).val();
        }
        return memo;
      }, {}).value();

    if (!downloadExcel) {
      $('#ticket-body').empty();
      $('#ticket-total').empty();
      $('#ticket-paging').empty();
    } else {
      filter.exportExcel = true;
    }

    filter.currPage = currPage;

    let sort = _.chain($('#frm-report-campaign-ticket thead tr th').not('[data-sort="none"]'))
      .reduce(function (memo, el) {
        if ($(el).attr('sortName')) {
          memo[$(el).attr('sortName')] = $(el).attr('data-sort');
        }
        return memo;
      }, {}).value();

    $.ajax({
      url: '/report-outbound-tickets',
      type: "GET",
      dataType: "json",
      data: { ...filter, sort: sort },
      success: function (resp) {
        showLoadingPage(false);
        console.log(`------- response ------- `);
        console.log(resp);
        console.log(`------- response ------- `);

        if (resp.code == 500) {
          return swal({ title: 'Cảnh báo!', text: resp.error });
        }

        if (resp.code == 200 && !downloadExcel) {
          loadData(resp.data);
          $('#ticket-total').html(totalTicket(resp.paging.totalResult));
          $('#ticket-paging').html(createPaging(resp.paging));
          return;
        }

        return downloadFromUrl(resp.linkFile);
      },
    });
  };

  function bindClick() {
    // Tải lại trang
    $(document).on('click', '.zmdi-refresh', function () {
      _.LoadPage(window.location.hash);
    });

    // Thay đổi hiển thị các cột trên giao diện
    $(document).on('change', '.column-display', function (e) {
      var dataIndex = $(this).attr('data-index');
      var checked = $(this).is(":checked");

      _.each($('th'), function (el) {
        var index = $(el).index();

        if (index == dataIndex) {
          if (checked) {
            $(el).show();
          } else {
            $(el).hide();
          }
        }
      });

      _.each($('td'), function (el) {
        var index = $(el).index();
        if (index == dataIndex) {
          if (checked) {
            $(el).show();
          } else {
            $(el).hide();
          }
        }
      })
    });

    // Sắp xếp dữ liệu
    $(document).on('click', '.sort', function () {
      var $this = $(this);
      switch ($this.attr('data-sort')) {
        case 'none':
          $this.toggleAttr('data-sort', 'asc');
          break;
        case 'asc':
          $this.toggleAttr('data-sort', 'desc');
          break;
        case 'desc':
          $this.toggleAttr('data-sort', 'none');
          break;
      }
      $this.siblings().toggleAttr('data-sort', 'none');
      queryFilter();
    });

    // Tải file báo cáo
    $(document).on('click', '#download-excel', function () {
      queryFilter(true);
    });

    // Click tìm kiếm
    $(document).on('click', '#btn-search', function () {
      queryFilter();
    });

    // Chuyển trang
    $(document).on('click', '.zpaging', function () {
      currPage = $(this).attr('data-link');
      queryFilter();
    });

    // Nhấn phím enter
    $(document).on('keyup', '.filter', function (e) {
      if (e.keyCode == 13) {
        queryFilter();
      }
    });

    // Chạy file ghi âm
    $(document).on('click', '.playAudio', function () {
      var $this = $(this);
      var audio = $this.closest('td').find('audio')[0];

      audio.onended = function () {
        $(this).closest('td').find('.zmdi-play').show();
        $(this).closest('td').find('.zmdi-pause').hide();
      };

      _.each($('audio'), function (el) {
        var __audio = $(el)[0];
        if (__audio != audio && !__audio.paused) {
          __audio.pause();
          $(el).closest('td').find('.zmdi-play').show();
          $(el).closest('td').find('.zmdi-pause').hide();
        }
      });

      if (audio.paused) {
        audio.play();
        $this.find('.zmdi-play').hide();
        $this.find('.zmdi-pause').show();
      } else {
        audio.pause();
        $this.find('.zmdi-play').show();
        $this.find('.zmdi-pause').hide();
      }
    });
  };

  function totalTicket(totalTicket) {
    return `
      <b>
        <span class="TXT_TOTAL">Tổng</span>:
        <span class="bold c-red" id="ticket-total">${totalTicket}</span>
      </b>
    `;
  }

  // Hiển thị dữ liệu phân trang
  function createPaging(paging) {
    if (!paging) return '';

    let firstPage = '';
    let prePage = '';
    let pageNum = '';
    let pageNext = '';
    let pageLast = '';

    if (paging.first) firstPage = `<li><a href="javascript:void(0)" class="zpaging" data-link="${paging.first}">&laquo;</a></li>`;
    if (paging.previous) prePage = `<li><a href="javascript:void(0)" class="zpaging" data-link="${paging.previous}">&lsaquo;</a></li>`;

    paging.range.forEach((page) => {
      if (page == paging.current) {
        pageNum += `<li class="active"><span>${page}</span></li>`;
      } else {
        pageNum += `<li><a href="javascript:void(0)" class="zpaging" data-link="${page}">${page}</a></li>`;
      }
    });

    if (paging.next) pageNext = `<li><a href="javascript:void(0)" class="zpaging" data-link="${paging.next}">&rsaquo;</a></li>`;
    if (paging.last) pageLast = `<li><a href="javascript:void(0)" class="zpaging" data-link="${paging.last}">&raquo;</a></li>`;

    return `
      <div class="paginate text-center">
        <ul class="pagination">
          ${firstPage}
          ${prePage}
          ${pageNum}
          ${pageNext}
          ${pageLast}
        </ul>
      </div>
    `;
  };

  // Hiển thị dữ liệu truy vấn được lên giao diện
  var loadData = function (data) {
    let html = '';
    data.forEach((el) => {
      let btnAction = `
        <audio id="myAudio"
          <source src="${recordPath + el.recordPath}" type="audio/mp4">
          Your user agent does not support the HTML5 Audio element.
        </audio>
        <button class="btn btn-default playAudio" type="button">
          <i class="zmdi zmdi-play f-25"></i>
          <i class="zmdi zmdi-pause f-25" style="display: none;"></i>
        </button>
        <button class="btn btn-default m-l-10" type="button">
          <a href="${recordPath + el.recordPath}" download>
            <i class="zmdi zmdi-download zmdi-hc-fw download-audio f-25" data-url="${recordPath + el.recordPath}"></i>
          </a>
        </button>;
      `;

      let btnTicket = `
        <button class="btn btn-default" type="button">
          <a href="/#ticket-edit?ticketID=${el._id}">
            <i class="zmdi zmdi-square-right f-25"></i>
          </a>
        </button>
      `;

      let updated = moment.utc(el.updated).format('HH:mm:ss DD/MM/YYYY');
      let agentName = el.nameUpdateBy && el.nameUpdateBy != '' ? `( ${el.nameUpdateBy} )` : '';

      html += `
        <tr>
          <td class="text-center" title="${el.nameCampain}">${el.nameCampain}</td>
          <td class="text-center" title="${el.numberPhone}">${el.numberPhone}</td>
          <td class="text-center" title="${el.nameSources.join(',\n')}">${el.nameSources.join(', ')}</td>
          <td class="text-center" title="${statusName(el.status)}">${statusName(el.status)}</td>
          <td class="text-center" title="${el.nameTicketReasonCategory}">${el.nameTicketReasonCategory}</td>
          <td class="text-center" title="${el.nameTicketReason}">${el.nameTicketReason}</td>
          <td class="text-center" title="${el.nameTicketSubreason}">${el.nameTicketSubreason}</td>
          <td class="text-center" title="${el.callIdLength}">${el.callIdLength}</td>
          <td class="text-center" title="${el.note}">${el.note}</td>
          <td class="text-center" title="${updated}">${updated}</td>
          <td class="text-center" title="${el.displayNameUpdateBy} ${agentName}">${el.displayNameUpdateBy} ${agentName}</td>
          <td class="text-center f-10">${el.recordPath ? btnAction : btnTicket}</td>
        </tr>
      `;
    });
    $('#frm-report-campaign-ticket #ticket-body').html(html);
  };

  var updateView = function () {
    $('.multi-date-picker').datepicker({
      multidate: 2,
      multidateSeparator: ' - ',
      format: 'dd/mm/yyyy'
    });

    // resize chosen picker
    $(".chosen-container").each(function () {
      $(this).attr('style', 'width: 100%');
    });

    // Setup date range picker
    $('.daterangepicker').daterangepicker({
      autoUpdateInput: false,
      opens: "left",
      locale: {
        format: 'DD/MM/YYYY',
        cancelLabel: 'Clear'
      }
    }).on('apply.daterangepicker', function (ev, picker) {
      $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
    }).on('cancel.daterangepicker', function (ev, picker) {
      $(this).val('');
    });

    $('select[name="customersources"]').find('option').each(function (index, opt) {
      if (index === 0) return;

      sources[$(opt).val()] = $(opt).text();
    });
  };

  // Hiển thị tên cột theo file config
  var bindTextValue = function () {
    var temp = [];
    _.each(_.allKeys(_config.MESSAGE.REPORT_OUTBOUND_TICKETS), function (item) {
      var obj = $('.' + item);
      if (obj.prop('tagName')) {
        obj.html(_config.MESSAGE.REPORT_OUTBOUND_TICKETS[item]);
        var index = obj.closest('th').index();
        temp[index] = `
          <li class="p-l-15 p-r-20">
            <div class="checkbox">
              <label>
                <input type="checkbox" class="select-box column-display" data-index="${index}" checked>
                <i class="input-helper"></i>
                <a class="p-l-5 text-capitalize text-nowrap">${_config.MESSAGE.REPORT_OUTBOUND_TICKETS[item]}</a>
              </label>
            </div>
          </li>
        `;
      }
    });
    $('#showHideFields').append(temp.join(''));
  };

  return {
    init: function () {
      bindTextValue();
      updateView();
      bindClick();
    },
    uncut: function () {
      lastSearch = {};
      pagingObject = {};
      lastPagingData = {};
      $(document).off('change', 'select[name="company"]');
      $(document).off('click', '.sort');
      $(document).off('click', '#btn-search');
      $(document).off('click', '.zpaging');
      $(document).off('keyup', '.filter');
      $(document).off('change', '.column-display');
      $(document).off('click', '#download-excel');
      $(document).off('click', '.zmdi-refresh');
      delete _socket.off('responseReportOutboundTicketPagingData');
    }
  };
}(jQuery);