var DFT = function ($) {
  // Tạo thẻ option cho thẻ selectpicker
  var addSkill = function (comId) {
    $('#idSkill option').each(function (i, e) {
      if (!_.isEqual($(e).val(), '')) e.remove();
    });
    $('#idSkill').append(_.Tags(
      _.chain(_.find(companies, function (com) {
        return _.isEqual(com._id.toString(), comId);
      }).skills)
        .reduce(function (memo, skill) {

          memo.push(
            { tag: 'option', attr: { value: skill._id }, content: skill.skillName }
          );
          return memo;
        }, [])
        .value()
    ));

    if (currentService.idSkill) $('#idSkill').val(currentService.idSkill._id);
    $('#idSkill').selectpicker('refresh');
  };

  var bindClick = function () {
    // Cập nhật lại kỹ năng khi thay đổi công ty
    $(document).on('change', '#idCompany', function () {
      addSkill($(this).val());
    });

    // Thay đổi công ty
    $(document).on('change', '#idCompany', function () {
      changeCompany();
    });
  };

  var bindSubmit = function () {
    // Xác nhận cập nhật service
    $('#update-service').validationEngine('attach', {
      validateNonVisibleFields: true, 
      autoPositionUpdate: true, 
      validationEventTrigger: 'keyup',
      onValidationComplete: function (form, status) {
        if (status) {
          if (_.isEqual($('#queueNumber').attr('current'), $('#queueNumber').val())) {
            _AjaxData(window.location.hash.replace('#', '').replace('/edit', ''), 'PUT', $('#update-service').getData(), function (resp) {
              if (_.isEqual(resp.code, 200)) {
                window.location.hash = 'services';
              } else {
                swal({ title: 'Thông báo !', text: resp.message });
              }
            });
          } else {
            _socket.emit('CheckQueueNumberReq', { _id: user, sid: _socket.id, number: $('#queueNumber').val() });
          }
        }
      }
    });
  };

  var bindSocket = function (client) {
    // Nhận dữ liệu đầu số có thể tạo service
    client.on('getQueueNumberRes', function (data) {
      var currQueue = $('#queueNumber').val();
      $('#queueNumber option').each(function (i, e) {
        if (!_.isEqual($(e).val(), '') && !_.isEqual($(e).val(), currQueue)) e.remove();
      });

      _.each(data, function (number, i) {
        $('#queueNumber').append(_.Tags([{
          tag: 'option', attr: { value: number }, content: number
        }]));
      });
      $('#queueNumber').selectpicker('refresh');
    });
    // Kiểm tra đầu số có hợp lệ để tạo hay không
    client.on('CheckQueueNumberRes', function (data) {
      if (data) {
        _AjaxData(window.location.hash.replace('#', '').replace('/edit', ''), 'PUT', $('#update-service').getData(), function (resp) {
          if (_.isEqual(resp.code, 200)) {
            window.location.hash = 'services';
          } else {
            swal({ title: 'Thông báo !', text: resp.message });
          }
        });
      }
    });
  }

  // Thay đổi công ty
  var changeCompany = function () {
    var params = {};
    params.status = 1;
    params.idCompany = $('#idCompany').find(":selected").val();

    // $('#agents').empty();

    // _Ajax('/services' + '?type=getAgent&idCompany=' + params.idCompany, 'GET', {}, function (resp) {
    //   _.each(resp.message, function (g, i) {
    //     $('#agents').append('<option class="duallist-option" value=' + g._id + '>' + g.displayName + '</option>').bootstrapDualListbox('refresh');
    //   });
    //   $('#agents').bootstrapDualListbox().val(idAgentsInChannel);
    //   $('#agents').bootstrapDualListbox('refresh');
    // });
  };

  return {
    init: function () {
      // Cấu hình validation
      $.validationEngineLanguage.allRules['ServiceCheck'] = {
        "url": "/services/validate",
        "extraData": "",
        "extraDataDynamic": ['#name', '#idCompany', '#updateId'],
        "alertText": "* Chiến dịch đã tồn tại",
        "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
      };
      bindClick();
      bindSubmit();

      changeCompany();

      // Cấu hình DualListBox 
      // $('select[name="agents[]"]').bootstrapDualListbox({
      //   filterTextClear: 'Filter',
      //   infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
      //   infoText: "<a class='c-blue' ><b>Số lượng agent: {0}</b></a>"
      // });
      $(".bootstrap-duallistbox-container").find(".moveall").parent().remove();
      $(".bootstrap-duallistbox-container").find(".removeall").parent().remove();


      _socket.emit('getQueueNumberReq', { _id: user, sid: _socket.id });
      bindSocket(_socket);
      addSkill($('#idCompany').val());
    },
    uncut: function () {
      // Disable sự kiện khi đóng trang
      delete _socket.off('getQueueNumberRes');
      delete _socket.off('CheckQueueNumberRes');
      $(document).off('change', '#idCompany');
      $('#update-service').validationEngine('detach');
      idAgentsInChannel = [];
    }
  };
}(jQuery);