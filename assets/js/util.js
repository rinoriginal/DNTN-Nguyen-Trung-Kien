

/**
 * Tải xuống một file từ url
 * Không mở popup dạng window.open(url);
 * Trình duyệt sẽ chặn bạn nếu bạn thực hiện action mở popup trong một async (trừ khi bạn cho phép)
 * @param url String Đường dẫn file cần download
 */
function downloadFromUrl(url) {
	var link = document.createElement("a");
	link.download = '';
	link.href = url;
	link.click();
}
//Gọi ra nhanh theo chiến dịch
$('#btnQuickCall').click(function (e) {
	if (getCookie('_agentState') == "READY") {
		return swal({
			title: "Thông báo",
			text: "Bạn cần chuyển trạng thái không sẵn sàng để thực hiện cuộc gọi!",
			type: "warning",
			confirmButtonColor: "#DD6B55",
			confirmButtonText: "OK",
			closeOnConfirm: true,
		});
	}

	$('#txtUserMobile').autocomplete({
		source: [
			{
				url: "/customer/search?type=getCustomerByKeyword&keyword=%QUERY%",
				type: 'remote',
			}
		],
		preparse: function (items) {
			if (items.message) {
				return items.message.map(function (item, i) {
					return {
						value: item.phone,
						title: (item.name ? item.name : ' ') + ' (' + item.phone + ' )'
					};
				});
			} else {
				return items;
			}
		},
		filter: function (items, query, source) {
			var results = [], value = '';

			for (var i in items) {
				value = items[i][this.valueKey];

				// if( this.valid(value,query)  ){
				results.push(items[i]);
				// }
			}
			return results;
		},
		// valid: function ( value,query ){
		// 	return value.toLowerCase().indexOf(query.toLowerCase())!=-1;
		// },
		dropdownWidth: '180%'
	});

	$('#sltCampains').empty();
	var defaultCampainsId = localStorage.getItem('campainsId');

	_AjaxData('/ticket-import-by-phone/search', 'GET', 'campains', function (resp) {
		console.log(resp)
		if (resp.data.length > 0) {

			_.each(resp.data, function (campain, idx) {
				var sltDefault = '';

				if (defaultCampainsId && campain._id == defaultCampainsId) {
					sltDefault = 'selected';
				}
				$('#sltCampains').append('<option style="padding:5px" value="' + campain._id + '" ' + sltDefault + '>' + campain.name + '</option>');
			})
		}
	})
	$('#quickCallGGG').modal({
		backdrop: 'static',
		keyboard: false
	});
});
var intervalCisco = null;
$(document).on('click', '#quickCallSubmit', function (e) {
	e.preventDefault();
	let phone = $('#txtUserMobile').val()
	let idCampain = $('#sltCampains').val()
	//Lưu vào Localstorage
	localStorage.setItem('campainsId', $('#sltCampains').val());
	// 1. make cuộc call
	// 2. get thông tin cuộc call và tạo ticket
	$.LoadingOverlay("show",{
		text        : "Đang thực hiện call ra."
	});
	window._finesse.makeCall(phone, getCookie('_extension'), function (_1, _2, xhr) {
		console.log('Data make call:', xhr)
		if (xhr && xhr.status === 202) {
			let finished = false
			let countCallApi = 0
			let dialog = ""
			async.until(function (params) {
				return finished == true
			}, function iter(next) {
				window._finesse.getDialogs(getCookie('_agentId'), function (_11, _22, data) {
					countCallApi++
					let response = JSON.parse(xml2json(data.responseText));
					if (response && response.Dialogs && response.Dialogs.Dialog) {
						console.log("Response", response.Dialogs.Dialog)
						finished = true
						dialog = response.Dialogs.Dialog;
						next()
					} else {
						finished = false
						next()
					}
				});
			}, function done(err) {
				$.LoadingOverlay("text", "Cuộc call đã được kết nối.");
				// Khi có cuộc call kết nối thực hiện call api tạo ticket
				let data = {
					fromAddress: getCookie('_extension'),
					idCampain: idCampain,
					phone: phone,
					id: dialog && dialog.id
				}
				jQuery.post('/api/v1/voice/click-two-call', data
					, function (resp) {
						$('#quickCallGGG').modal('hide');
						if (resp && resp.code == 200) {
							$.LoadingOverlay("hide");
							window.location.hash = 'ticket-edit?ticketID=' + resp.ticketId;
						} else {
							$.LoadingOverlay("hide");
							return swal({
								title: "Thông báo",
								text: "Tạo thông tin khách hàng và ticket thất bại!",
								type: "warning",
								confirmButtonColor: "#DD6B55",
								confirmButtonText: "OK",
								closeOnConfirm: true,
							});
						}
						
					});
			})
		}
	}, _makeCallHandler);
});
