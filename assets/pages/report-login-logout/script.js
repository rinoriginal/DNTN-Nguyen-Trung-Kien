var DFT = function ($) {
  function bindClick() {
    $('#export_excel_total').on('click', function (e) {
			getFilter(true, 'total');
		});
    $('#search_data').on('click', function () {
			getFilter();
			getFilter(false, 'by-day');
			// fetchDataChart();
		});
    $('#export_excel_by_time').on('click', function (e) {
			getFilter(true, 'by-day');
		});
  }

  // Lấy dữ liệu
	function getFilter(exportExcel, type) {
		var filter = {};

		var filter = _.chain($('.input')).reduce(function (memo, input) {
			if (!_.isEqual($(input).val(), '') && !_.isEqual($(input).val(), null)) {
				memo[input.name] = $(input).val();
			}
			return memo;
		}, {}).value();

		if (!exportExcel) {
			$('#table_total').empty();
			$('#table_by_day').empty();
		}

		if (exportExcel) filter.exportExcel = true;
		if (type) filter.type = type;
		_Ajax('/report-login-logout?' + $.param(filter), 'GET', [], function (resp) {
			if (!resp || resp.code !== 200) {
				return swal({ title: 'Cảnh báo!', text: resp.message ? resp.message : 'Có lỗi xảy ra!' });
			}

			if (!exportExcel) {
				if(type === 'by-day'){
					loadDataByDay(resp.data)
				}
				else{
					loadDataTotal(resp.data);
					drawCharts(resp.data)
				}
				return;
			}

			if (exportExcel) {
				return downloadFromUrl(resp.linkFile);
			}
		});
	};

	function loadDataByDay(data) {
		var rowHtml = '';
		data.forEach((item, index) =>{
			rowHtml += `
				<tr>
					<td colspan="5" class="text-center">
						<h4 class="lvh-label hidden-xs" style="font-weight: bold; display: ${index > 0 && data[index]._id.date == data[index-1]._id.date ? 'none' : 'block'}">
							${item._id.date || ''}
						</h4>
					</td>
				</tr>
     		<tr>
				<td class="text-center">${item.displayName}</td>
				<td class="text-center">${moment(item.LoginDateTime).format('HH:mm DD/MM/YYYY')}</td>
				<td class="text-center">${moment(item.LogoutDateTime).format('HH:mm DD/MM/YYYY')}</td>
				<td class="text-center">${hms(item.totalDuration)}</td>
				<td class="text-center">${hms(item.avgDuration)}</td>
			</tr>`;
		})
		$('#table_by_day').html(rowHtml);
	}

	function loadDataTotal(data){
		let rowHtml = ''
		data.forEach(item => {
			rowHtml += `
				<tr>
					<td class="text-center">${item.displayName}</td>
					<td class="text-center">${moment(item.LoginDateTime).format('HH:mm DD/MM/YYYY')}</td>
					<td class="text-center">${moment(item.LogoutDateTime).format('HH:mm DD/MM/YYYY')}</td>
					<td class="text-center">${hms(item.totalDuration)}</td>
					<td class="text-center">${hms(item.avgDuration)}</td>
				</tr>
      `;
		});
		$('#table_total').html(rowHtml);
	}

	function drawCharts(timelineData) {
		if ((typeof google === 'undefined') || (typeof google.visualization === 'undefined')) {
			google.charts.load("current", { packages: ["timeline"], 'language': 'vi' });
			return;
		}

		if (timelineData) {
			// hiển thị dữ liệu tổng
			drawTimelineChar(timelineData, 'timelines');
		}
	};

	function drawTimelineChar(timeline, idSelector) {
		let dataTable = new google.visualization.DataTable();
		dataTable.addColumn({ type: 'string', id: 'Name' });
		dataTable.addColumn({ type: 'string', id: 'Status' });
		dataTable.addColumn({ type: 'string', id: 'Tooltip', role: 'tooltip', 'p': { 'html': true } });
		dataTable.addColumn({ type: 'string', role: 'style' });
		dataTable.addColumn({ type: 'date', id: 'Start' });
		dataTable.addColumn({ type: 'date', id: 'End' });

		let rows = [];

		// Hacked to String Object to get Date from ISO String
		if (!String.prototype.getTime) {
			String.prototype.getTime = function () {
				var self = this;
				var _d = moment(self.toString());
				if (_d.isValid()) {
					return _d.toDate();
				}
				return new Date();
			};
		}

		timeline.forEach((el) => {
			el.status.forEach((item) => {
				var stt = {
					name: el.displayName.toString(),
					status: item.event.toString(),
					start: item.startTime,
					end: item.endTime,
				};

				var tmp = getStyleTooltip(stt);
				stt.color = tmp.color;
				stt.tooltip = tmp.tooltip;
				rows.push(stt);
			});
		});

		$('#' + idSelector).height(_.uniq(rows, function (r) {
			return r.name;
		}).length * 50 + 50);

		var container = document.getElementById(idSelector);
		var chart = new google.visualization.Timeline(container);
		var chartRows = [];

		rows.map(function (r) {
			var start = moment(r.start)._d;
			var end = moment(r.end)._d;
			chartRows.push([r.name, r.status, r.tooltip, r.color, start, end]);
		});

		dataTable.addRows(chartRows);

		var options = {
			avoidOverlappingGridLines: false,
			tooltip: { isHtml: true },
			timeline: { showBarLabels: false }
		};

		return chart.draw(dataTable, options);
	}

	function getStyleTooltip(stt) {
		let color = 'color: #42B72A';
		let time = moment(stt.start).format('HH:mm:ss DD/MM/YYYY') + ' - ' + moment(stt.end).format('HH:mm:ss DD/MM/YYYY');
		let duration = moment.utc(moment(stt.end).diff(moment(stt.start))).format("HH:mm:ss");

		let tooltip = `
			<div style="padding: 5px; width: 320px !important;">
				<b>Thời gian: </b>${time}
				<br />
				<b>Thời lượng: </b>${duration}
			</div>
		`;

		return { color, tooltip };
	}

	function hms(secs){
		if (isNaN(secs)) return "00:00:00"
        var sec = Math.ceil(secs / 1000);
        var minutes = Math.floor(sec / 60);
        sec = sec % 60;
        var hours = Math.floor(minutes / 60)
        minutes = minutes % 60;
        return hours + ":" + pad(minutes) + ":" + pad(sec);
	}

	function pad(num) {
		return ("0" + num).slice(-2);
	}

  function bindTextValue() {
		_.each(_.allKeys(_config.MESSAGE.REPORT_LOGIN_LOGOUT), function (item) {
			$('.' + item).html(_config.MESSAGE.REPORT_LOGIN_LOGOUT[item]);
		});
	};

  return {
    init: function () {
      bindClick();
      bindTextValue();

      // Config google chart
			google.charts.load("current", { packages: ["timeline"], 'language': 'vi' });

			$('.multi-date-picker').datepicker({
				multidate: 2,
				multidateSeparator: ' - ',
				format: 'dd/mm/yyyy',
				todayHighlight: true
			});
    },
    uncut: function () {
			$(document).off('click', '#exportexcel');
		}
  }
}(jQuery);