var DFT = function ($) {

  var bindClick = function () {
    $(document).on('click', '#formStatus', function (e) {
      //Ẩn hoặc hiện các yêu cầu nhập thông tin vào form chat
      if ($(this).is(":checked")) $('.hiddenField').removeClass('hidden');
      else {
        $('.hiddenField').addClass('hidden');
      }
    });

    // // Thay đổi công ty
    // $(document).on('change', '#idCompany', function () {
    //   changeCompany();
    // });
  };

  var bindSubmit = function () {
    $('#update-channel').validationEngine('attach', {
      validateNonVisibleFields: true,
      autoPositionUpdate: true,
      validationEventTrigger: 'keyup',
      onValidationComplete: function (form, status) {
        $('.formError').remove(); //Xóa các form cảnh báo cũ
        async.parallel({
          one: function (cb) {
            //validate tên kênh
            $.get('/company-channel/validate?company=' + $('#idCompany').val() + '&name=' + $('#name').val() + '&currName=' + $('.submit-edit').attr('currName'), function (resp) {
              if (!resp.code) {
                $('#name').validationEngine('showPrompt', 'Đã tồn tại channel này', 'error', 'topRight', true);
              }
              cb(null, resp.code);
            });
          }
        }, function (err, resp) {
          if (resp.one) {
            //Đã pass qua các validate rule
            //Gửi request update
            _AjaxObject(window.location.hash.replace('/edit', '').replace('#', ''), 'PUT', $('#update-channel').getData(), function (resp) {
              if (_.isEqual(resp.code, 200)) {
                window.location.hash = '/company-channel';
              } else {
                swal({ title: 'Thông báo !', text: resp.message });
              }
            });
          }
        });
      }
    });

  };

  // Thay đổi công ty
  var changeCompany = function () {
    var params = {};
    params.status = 1;
    params.idCompany = $('#idCompany').find(":selected").val();

    $('#agents').empty();

    _Ajax('/company-channel' + '?type=getAgent&idCompany=' + params.idCompany, 'GET', {}, function (resp) {
      console.log(`------- resp.message ------- `);
      console.log(resp.message);
      console.log(`------- resp.message ------- `);
      _.each(resp.message, function (g, i) {
        $('#agents').append('<option class="duallist-option" value=' + g._id + '>' + g.displayName + '</option>').bootstrapDualListbox('refresh');
      });
      $('#agents').bootstrapDualListbox().val(idAgentsInChannel);
      $('#agents').bootstrapDualListbox('refresh');
    });
  };

  return {
    init: function () {
      bindClick();
      bindSubmit();

      // Cấu hình DualListBox 
      $('select[name="agents[]"]').bootstrapDualListbox({
        filterTextClear: 'Filter',
        infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
        infoText: "<a class='c-blue' ><b>Số lượng agent: {0}</b></a>"
      });
      $(".bootstrap-duallistbox-container").find(".moveall").parent().remove();
      $(".bootstrap-duallistbox-container").find(".removeall").parent().remove();
      $('.selectpicker').selectpicker('refresh'); //refresh 1 lần duy nhất khi load trang
    },
    uncut: function () {
      $(document).off('click', '#formStatus');
      $(document).off('click', '#update-channel');
      $(document).off('change', '#idCompany');
      $('#update-channel').validationEngine('detach')
      idAgentsInChannel = [];
    }
  };
}(jQuery);