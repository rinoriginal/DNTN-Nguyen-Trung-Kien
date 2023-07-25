
const zipFolder = require('zip-folder');

const { getAgentDetailInfo } = require('../commons/functions')
const { createExcelFile } = require('../commons/handleExcel')

const titlePage = 'Báo cáo gọi ra - Báo cáo theo chiến dịch';

exports.index = {
	json: async function (req, res) {
		try {
			const {
				callIdLength,
				customersources,
				field_so_dien_thoai,
				idCampain,
				note,
				status,
				ticketReason,
				ticketReasonCategory,
				ticketSubreason,
				updateBy,
				updated,
				currPage,
				sort
			} = req.query;
			let queryFilter = {};
			let querySort = {};
			let startDate;
			let endDate;
			let page = currPage ? currPage : 1;
			let rows = 10;

			if (idCampain && idCampain.length > 0) {
				queryFilter.idCampain = { $in: _.arrayObjectId(idCampain) };
			}

			if (field_so_dien_thoai) {
				queryFilter.numberPhone = { $regex: new RegExp(_.stringRegex(field_so_dien_thoai), 'i') };
			}

			if (customersources) {
				queryFilter.idSources = { $elemMatch: { $eq: _.convertObjectId(customersources) } }
			}

			if (status) {
				queryFilter.status = { $eq: Number(status) };
			}

			if (ticketReasonCategory) {
				queryFilter.idTicketReasonCategory = { $eq: _.convertObjectId(ticketReasonCategory) };
			}

			if (ticketReason) {
				queryFilter.idTicketReason = { $eq: _.convertObjectId(ticketReason) };
			}

			if (ticketSubreason) {
				queryFilter.idTicketSubreason = { $eq: _.convertObjectId(ticketSubreason) };
			}

			if (callIdLength) {
				queryFilter.callIdLength = { $eq: Number(callIdLength) };
			}

			if (note) {
				queryFilter.note = { $regex: new RegExp(_.stringRegex(note), 'i') };
			}

			if (updateBy) {
				queryFilter.updateBy = { $eq: _.convertObjectId(updateBy) };
			}

			if (updated) {
				let d1 = req.query.updated.split(' - ')[0];
				let d2 = req.query.updated.split(' - ')[1];
				startDate = _moment(d1, 'DD/MM/YYYY').startOf('day')._d;
				endDate = d2 ? _moment(d2, 'DD/MM/YYYY').endOf('day')._d : _moment(d1, 'DD/MM/YYYY').endOf('day')._d;;

				queryFilter.updated = {
					$gte: startDate,
					$lte: endDate,
				}
			}

			if (sort && sort.updated) {
				querySort.updated = sort.updated == 'asc' ? 1 : -1;
			}

			if (sort && sort.callIdLength) {
				querySort.callIdLength = sort.callIdLength == 'asc' ? 1 : -1;
			}

			let aggregateTicket = [
				{ $match: { idService: { $eq: null }, idCampain: { $ne: null } } },

				{ $lookup: { from: 'customers', localField: 'idCustomer', foreignField: '_id', as: 'customers' } },
				{ $unwind: { path: '$customers', preserveNullAndEmptyArrays: true } },

				{ $addFields: { "idSources": "$customers.sources" } },
				{ $unwind: { path: '$idSources', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'customersources', localField: 'idSources', foreignField: '_id', as: 'customersources' } },
				{ $unwind: { path: '$customersources', preserveNullAndEmptyArrays: true } },

				{ $addFields: { nameSources: '$customersources.name' } },

				{
					$group: {
						_id: '$_id',
						idSources: { $addToSet: "$idSources" },
						nameSources: { $addToSet: "$nameSources" },
						idCustomer: { $first: '$idCustomer' },
						idCampain: { $first: '$idCampain' },
						ticketReasonCategory: { $first: '$ticketReasonCategory' },
						ticketReason: { $first: '$ticketReason' },
						ticketSubreason: { $first: '$ticketSubreason' },
						idAgent: { $first: '$idAgent' },
						status: { $first: '$status' },
						note: { $first: '$note' },
						updated: { $first: '$updated' },
						updateBy: { $first: '$updateBy' },
						callId: { $first: '$callId' }
					}
				},

				{ $lookup: { from: 'field_so_dien_thoai', localField: 'idCustomer', foreignField: 'entityId', as: 'field_so_dien_thoai' } },
				{ $unwind: { path: '$field_so_dien_thoai', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_e_mail', localField: 'idCustomer', foreignField: 'entityId', as: 'field_e_mail' } },
				{ $unwind: { path: '$field_e_mail', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_ho_ten', localField: 'idCustomer', foreignField: 'entityId', as: 'field_ho_ten' } },
				{ $unwind: { path: '$field_ho_ten', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_gioi_tinh', localField: 'idCustomer', foreignField: 'entityId', as: 'field_gioi_tinh' } },
				{ $unwind: { path: '$field_gioi_tinh', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_tgs', localField: 'idCustomer', foreignField: 'entityId', as: 'field_tgs' } },
				{ $unwind: { path: '$field_tgs', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_yutang', localField: 'idCustomer', foreignField: 'entityId', as: 'field_yutang' } },
				{ $unwind: { path: '$field_yutang', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_date_of_birth', localField: 'idCustomer', foreignField: 'entityId', as: 'field_date_of_birth' } },
				{ $unwind: { path: '$field_date_of_birth', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_tinh_thanh', localField: 'idCustomer', foreignField: 'entityId', as: 'field_tinh_thanh' } },
				{ $unwind: { path: '$field_tinh_thanh', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'field_sdt_ban', localField: 'idCustomer', foreignField: 'entityId', as: 'field_sdt_ban' } },
				{ $unwind: { path: '$field_sdt_ban', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'campains', localField: 'idCampain', foreignField: '_id', as: 'campains' } },
				{ $unwind: { path: '$campains', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'ticketreasoncategories', localField: 'ticketReasonCategory', foreignField: '_id', as: 'ticketreasoncategories' } },
				{ $unwind: { path: '$ticketreasoncategories', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'ticketreasons', localField: 'ticketReason', foreignField: '_id', as: 'ticketreasons' } },
				{ $unwind: { path: '$ticketreasons', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'ticketsubreasons', localField: 'ticketSubreason', foreignField: '_id', as: 'ticketsubreasons' } },
				{ $unwind: { path: '$ticketsubreasons', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'users', localField: 'idAgent', foreignField: '_id', as: 'users' } },
				{ $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },

				{ $lookup: { from: 'users', localField: 'updateBy', foreignField: '_id', as: 'updateByUser' } },
				{ $unwind: { path: '$updateByUser', preserveNullAndEmptyArrays: true } },

				{
					$project: {
						_id: 1,
						idCustomer: 1,
						idCampain: 1,
						status: 1,
						note: 1,
						updated: 1,
						idAgent: 1,
						idSources: 1,
						nameSources: 1,
						callId: 1,
						updateBy: 1,
						callIdLength: { $size: '$callId' },
						updateByIdCisco: { $cond: [{ $or: [{ $eq: ['$updateByUser.idAgentCisco', null] }, { $eq: [{ $type: '$updateByUser.idAgentCisco' }, 'missing'] }] }, '', '$updateByUser.idAgentCisco'] },
						nameUpdateBy: { $cond: [{ $or: [{ $eq: ['$updateByUser.name', null] }, { $eq: [{ $type: '$updateByUser.name' }, 'missing'] }] }, '', '$updateByUser.name'] },
						displayNameUpdateBy: { $cond: [{ $or: [{ $eq: ['$updateByUser.displayName', null] }, { $eq: [{ $type: '$updateByUser.displayName' }, 'missing'] }] }, '', '$updateByUser.displayName'] },
						idAgentCisco: { $cond: [{ $or: [{ $eq: ['$users.idAgentCisco', null] }, { $eq: [{ $type: '$users.idAgentCisco' }, 'missing'] }] }, '', '$users.idAgentCisco'] },
						nameAgent: { $cond: [{ $or: [{ $eq: ['$users.name', null] }, { $eq: [{ $type: '$users.name' }, 'missing'] }] }, '', '$users.name'] },
						displayNameAgent: { $cond: [{ $or: [{ $eq: ['$users.displayName', null] }, { $eq: [{ $type: '$users.displayName' }, 'missing'] }] }, '', '$users.displayName'] },
						numberPhone: { $cond: [{ $or: [{ $eq: ['$field_so_dien_thoai.value', null] }, { $eq: [{ $type: '$field_so_dien_thoai.value' }, 'missing'] }] }, '', '$field_so_dien_thoai.value'] },
						field_e_mail: { $cond: [{ $or: [{ $eq: ['$field_e_mail.value', null] }, { $eq: [{ $type: '$field_e_mail.value' }, 'missing'] }] }, '', '$field_e_mail.value'] },
						field_ho_ten: { $cond: [{ $or: [{ $eq: ['$field_ho_ten.value', null] }, { $eq: [{ $type: '$field_ho_ten.value' }, 'missing'] }] }, '', '$field_ho_ten.value'] },
						field_gioi_tinh: { $cond: [{ $or: [{ $eq: ['$field_gioi_tinh.value', null] }, { $eq: [{ $type: '$field_gioi_tinh.value' }, 'missing'] }] }, '', '$field_gioi_tinh.value'] },
						field_tgs: { $cond: [{ $or: [{ $eq: ['$field_tgs.value', null] }, { $eq: [{ $type: '$field_tgs.value' }, 'missing'] }] }, '', '$field_tgs.value'] },
						field_yutang: { $cond: [{ $or: [{ $eq: ['$field_yutang.value', null] }, { $eq: [{ $type: '$field_yutang.value' }, 'missing'] }] }, '', '$field_yutang.value'] },
						field_date_of_birth: { $cond: [{ $or: [{ $eq: ['$field_date_of_birth.value', null] }, { $eq: [{ $type: '$field_date_of_birth.value' }, 'missing'] }] }, '', '$field_date_of_birth.value'] },
						field_tinh_thanh: { $cond: [{ $or: [{ $eq: ['$field_tinh_thanh.value', null] }, { $eq: [{ $type: '$field_tinh_thanh.value' }, 'missing'] }] }, '', '$field_tinh_thanh.value'] },
						field_sdt_ban: { $cond: [{ $or: [{ $eq: ['$field_sdt_ban.value', null] }, { $eq: [{ $type: '$field_sdt_ban.value' }, 'missing'] }] }, '', '$field_sdt_ban.value'] },
						nameCampain: { $cond: [{ $or: [{ $eq: ['$campains.name', null] }, { $eq: [{ $type: '$campains.name' }, 'missing'] }] }, '', '$campains.name'] },
						idTicketReasonCategory: { $cond: [{ $or: [{ $eq: ['$ticketReasonCategory', null] }, { $eq: [{ $type: '$ticketReasonCategory' }, 'missing'] }] }, '', '$ticketReasonCategory'] },
						nameTicketReasonCategory: { $cond: [{ $or: [{ $eq: ['$ticketreasoncategories.name', null] }, { $eq: [{ $type: '$ticketreasoncategories.name' }, 'missing'] }] }, '', '$ticketreasoncategories.name'] },
						idTicketReason: { $cond: [{ $or: [{ $eq: ['$ticketReason', null] }, { $eq: [{ $type: '$ticketReason' }, 'missing'] }] }, '', '$ticketReason'] },
						nameTicketReason: { $cond: [{ $or: [{ $eq: ['$ticketreasons.name', null] }, { $eq: [{ $type: '$ticketreasons.name' }, 'missing'] }] }, '', '$ticketreasons.name'] },
						idTicketSubreason: { $cond: [{ $or: [{ $eq: ['$ticketSubreason', null] }, { $eq: [{ $type: '$ticketSubreason' }, 'missing'] }] }, '', '$ticketSubreason'] },
						nameTicketSubreason: { $cond: [{ $or: [{ $eq: ['$ticketsubreasons.name', null] }, { $eq: [{ $type: '$ticketsubreasons.name' }, 'missing'] }] }, '', '$ticketsubreasons.name'] },
					}
				},
				{ $match: queryFilter },
				{ $sort: _.isEmpty(querySort) ? { _id: -1 } : querySort }
			];

			let ticketsResult;

			// Export excel
			if (_.has(req.query, 'exportExcel') && req.query.exportExcel) {
				ticketsResult = await _Tickets.aggregate(aggregateTicket);
				if (!ticketsResult || ticketsResult.length <= 0) {
					throw new Error('Không tìm thấy dữ liệu!');
				}
				const createExcelResult = await exportExcel(req, startDate, endDate, ticketsResult);
				return res.json({ code: 200, linkFile: createExcelResult });
			}

			ticketsResult = await _Tickets.aggregatePaginate(_Tickets.aggregate(aggregateTicket), { page: page, limit: rows });

			if (!ticketsResult.docs || ticketsResult.docs.length <= 0) {
				throw new Error('Không tìm thấy dữ liệu!');
			}

			let paginator = new pagination.SearchPaginator({
				prelink: '/report-outbound-tickets',
				current: page,
				rowsPerPage: rows,
				totalResult: ticketsResult.total
			});

			return res.json({
				code: 200,
				data: ticketsResult.docs,
				paging: paginator.getPaginationData()
			});
		} catch (error) {
			console.error(`------- error ------- `);
			console.error(error);
			console.error(`------- error ------- `);

			return res.json({ code: 500, error: error.message ? error.message : error });
		}
	},
	html: async function (req, res) {
		try {
			if (!req.session.auth.company || !req.session.auth.company.leader) {
				throw new Error('Không đủ quyền truy cập');
			}

			const companyResult = await _Company.distinct("_id", { _id: req.session.auth.company });
			const agentGroupResult = await _AgentGroups.distinct("_id", { idParent: { $in: companyResult } });
			const userResult = await _Users.find({
				$or: [
					{ 'agentGroupLeaders.group': { $in: agentGroupResult } },
					{ 'agentGroupMembers.group': { $in: agentGroupResult } },
					{ 'companyLeaders.company': { $in: companyResult } }
				]
			});

			//const agentsInfoResult = await getAgentDetailInfo();

			const [campaignResult, customerSourceResult] = await Promise.all([
				_Campains.aggregate([{ $project: { _id: 1, name: 1 } }]),
				_CustomerSource.find({})
			]);

			const ticketReasonCategoryResult = await _TicketReasonCategory.find({
				$or: [
					{ category: 0 },
					{ category: 2 }
				]
			});

			const ticketReasonResult = await _TicketReason.find({
				idCategory: {
					$in: _.convertObjectId(_.pluck(ticketReasonCategoryResult, '_id'))
				}
			});

			const ticketSubReasonResult = await _TicketSubreason.find({
				idReason: {
					$in: _.convertObjectId(_.pluck(ticketReasonResult, '_id'))
				}
			});

			let data = {
				campaign: campaignResult,
				user: userResult,
				ticketReasonCategory: ticketReasonCategoryResult,
				ticketReason: ticketReasonResult,
				ticketSubreason: ticketSubReasonResult,
				customer: customerSourceResult
			}

			return _.render(req, res, 'report-outbound-tickets', {
				title: titlePage,
				plugins: ['moment', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
				recordPath: _config.recordPath ? _config.recordPath.path : '',
				data,
			}, true);
		} catch (error) {
			console.error(`------- error ------- `);
			console.error(error);
			console.error(`------- error ------- `);

			return _.render(req, res, 'report-outbound-tickets', {
				title: titlePage,
				plugins: ['moment', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
				data: {
					campaign: [],
					user: [],
					ticketReasonCategory: [],
					ticketReason: [],
					ticketSubreason: [],
					customer: []
				}
			}, true, error);
		}
	}
};

function exportExcel(req, startDate, endDate, data) {
	return new Promise(async (resolve, reject) => {
		try {
			let currentDate = new Date();
			let folderName = req.session.user._id + "-" + currentDate.getTime();
			let fileName = titlePage + ' ' + _moment(currentDate).format('DD-MM-YYYY');

			let dataHeader = {
				TXT_CAMPAIGN_NAME: "nameCampain",
				TXT_PHONE_NUMBER: "numberPhone",
				TXT_CUSTOMER_SOURCE: "nameSources",
				TXT_STATUS: "status",
				TXT_TICKET_REASON_CATEGORY: "nameTicketReasonCategory",
				TXT_TICKET_REASON: "nameTicketReason",
				TXT_TICKET_SUBREASON: "nameTicketSubreason",
				TXT_CALLS: "calls",
				TXT_NOTE: "note",
				TXT_UPDATED: "updated",
				TXT_UPDATED_BY: "nameAgent",
				TXT_CUSTOMER_EMAIL: "field_e_mail",
				TXT_CUSTOMER_NAME: "field_ho_ten",
				TXT_SEX: "field_gioi_tinh",
				TXT_TGS: "field_tgs",
				TXT_YUTANG: "field_yutang",
				TXT_DATE_OF_BIRTH: "field_date_of_birth",
				TXT_CITY: "field_tinh_thanh",
				TXT_DESK_PHONE_NUMBER: "field_sdt_ban",
			}

			let newData = data.map((item) => {
				let updated = _moment.utc(item.updated).format('HH:mm:ss DD/MM/YYYY');
				let agentName = item.nameUpdateBy && item.nameUpdateBy != '' ? `( ${item.nameUpdateBy} )` : '';
				return {
					nameCampain: item.nameCampain,
					numberPhone: item.numberPhone,
					nameSources: item.nameSources.join(', '),
					status: statusName(item.status),
					nameTicketReasonCategory: item.nameTicketReasonCategory,
					nameTicketReason: item.nameTicketReason,
					nameTicketSubreason: item.nameTicketSubreason,
					calls: item.callIdLength,
					note: item.note,
					updated: updated,
					nameAgent: `${item.displayNameUpdateBy} ${agentName}`,
					field_e_mail: item.field_e_mail,
					field_ho_ten: item.field_ho_ten,
					field_gioi_tinh: item.field_gioi_tinh.toString(),
					field_tgs: item.field_tgs.toString(),
					field_yutang: item.field_yutang.toString(),
					field_date_of_birth: item.field_date_of_birth,
					field_tinh_thanh: item.field_tinh_thanh.toString(),
					field_sdt_ban: item.field_sdt_ban,
				}
			});

			await createExcel(
				req,
				startDate ? _moment(startDate).format('DD-MM-YYYY') : null,
				endDate ? _moment(endDate).format('DD-MM-YYYY') : null,
				titlePage,
				dataHeader,
				'REPORT_OUTBOUND_TICKETS',
				folderName,
				null,
				fileName,
				newData,
				null,
				{ valueWidthColumn: [25, 15, 30, 15, 30, 30, 30, 10, 30, 25, 35, 35, 20, 15, 15, 15, 15, 20, 15] },
			);

			await fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'));

			await fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'));

			let folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
			let folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
			await createFile(folderPath, folderZip);
			const zipFolderResult = folderZip.replace(_rootPath, '');

			return resolve(zipFolderResult);
		} catch (error) {
			return reject(error);
		}
	})
}

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

// Chuyển callback thành promise
function createFile(folderPath, folderZip) {
	return new Promise((resolve, reject) => {
		zipFolder(folderPath, folderZip, function (error, result) {
			if (error) {
				return reject(error);
			}
			return resolve(result);
		});
	})
}

// Chuyển callback thành promise
function createExcel(
	req,
	startTime,
	endTime,
	titleTable,
	excelHeader,
	configHeader,
	folderName,
	lastFolderName,
	fileName,
	data,
	sumRows,
	opts,
) {
	return new Promise((resolve, reject) => {
		createExcelFile(
			req,
			startTime,
			endTime,
			titleTable,
			excelHeader,
			configHeader,
			folderName,
			lastFolderName,
			fileName,
			data,
			sumRows,
			opts,
			function (error, result) {
				if (error) {
					return reject(error);
				}
				return resolve(result);
			}
		);
	})
}