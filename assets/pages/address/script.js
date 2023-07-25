


var renderDistrict = function () {
    let nameProvince = $('#edit_field_tinh_thanh').val()
    _Ajax('customer/upload?searchProvince=true', 'POST', [{ nameProvince: JSON.stringify(nameProvince) }], function (resp) {
        if (resp.code == 200) {
            // renderDistrict(resp.data)
            let html = '<option value = "0">--- Chọn ---</option>';
            if (resp.data) {
                _.each(resp.data, function (el) {
                    html +=
                        '<option value="' + el.name + '" ' + (customer && customer.field_quan_huyen && customer.field_quan_huyen[0] ? (JSON.stringify(customer.field_quan_huyen[0].value[0]) == JSON.stringify(el.name) ? 'selected' : '') : '') + '>' + el.name + '</option>'
                })
            }
            $('#edit_field_quan_huyen').html(html)
            $('#edit_field_quan_huyen').selectpicker('refresh');
        }
    })
}

if (provinces) {
    let html = '<option value = "0">--- Chọn ---</option>';
    _.each(provinces, function (el) {
        html +=
            '<option value="' + el.name + '" ' + (customer && customer.field_tinh_thanh && customer.field_tinh_thanh[0] ? (JSON.stringify(customer.field_tinh_thanh[0].value[0]) == JSON.stringify(el.name) ? 'selected' : '') : '') + '>' + el.name + '</option>'
    })
    $('#edit_field_tinh_thanh').html(html)
    $('#edit_field_tinh_thanh').selectpicker('refresh');
    if (districts) renderDistrict();

}

$(document).on('change', '#edit_field_tinh_thanh', function () {
    if (districts) renderDistrict()
});