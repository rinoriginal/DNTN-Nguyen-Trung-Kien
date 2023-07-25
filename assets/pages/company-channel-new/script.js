var DFT = function ($) {
  // Tạo thẻo option cho thẻ selectpicker
  var newOption = function (obj) {
    return _.Tags([
      { tag: 'option', attr: { class: 'option-s', value: obj._id }, content: obj.name }
    ]);
  };

  var bindClick = function () {
    //Ẩn hoặc hiện các yêu cầu nhập thông tin vào form chat
    $(document).on('click', '#formStatus', function (e) {
      if ($(this).is(":checked")) $('.hiddenField').removeClass('hidden');
      else {
        $('.hiddenField').addClass('hidden');
      }
    });

    // Thay đổi công ty
    // $(document).on('change', '#idCompany', function () {
    //   var params = {};
    //   params.status = 1;
    //   params.idCompany = $('#idCompany').find(":selected").val();

    //   $('#agents').empty();

    //   console.log(`------- da vao day ------- `);
    //   console.log('da vao day');
    //   console.log(`------- da vao day ------- `);
    //   _Ajax('/company-channel' + '?type=getAgent&idCompany=' + params.idCompany, 'GET', {}, function (resp) {

    //     console.log(`-------  ------- `);
    //     console.log(resp.message);
    //     console.log(`-------  ------- `);

    //     _.each(resp.message, function (g, i) {
    //       $('#agents').append('<option class="duallist-option" value=' + g._id + '>' + g.displayName + '</option>').bootstrapDualListbox('refresh');
    //     });
    //     $('#agents').bootstrapDualListbox('refresh');
    //   });
    // });
  };

  var bindSubmit = function () {
    $(document).on('submit', '#add-new-channel', function (e) {
      //Tạo kênh mới
      e.preventDefault();
      $('#add-new-channel').validationEngine('attach', {
        validateNonVisibleFields: true,
        autoPositionUpdate: true,
        validationEventTrigger: 'keyup',
        onValidationComplete: function (form, status) {
          if (status) {
            async.parallel({
              one: function (cb) {
                //validate tên kênh
                $.get('/company-channel/validate?company=' + $('#idCompany').val() + '&name=' + $('#name').val(), function (resp) {
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
                _AjaxObject('/company-channel', 'POST', $('#add-new-channel').getData(), function (resp) {
                  if (_.isEqual(resp.code, 200)) {
                    window.location.hash = '#company-channel';
                  } else {
                    swal({ title: 'Thông báo !', text: resp.message });
                  }
                });
              }
            });
          }
        }
      });
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

    },
    uncut: function () {
      $(document).off('click', '#formStatus');
      $(document).off('submit', '#add-new-channel');
      $(document).off('change', '#name');
      $(document).off('change', '#website');
      $(document).off('change', '#idCompany');
    }
  };
}(jQuery);