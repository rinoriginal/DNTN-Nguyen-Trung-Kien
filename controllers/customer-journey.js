
exports.index = function (req, res) {
    // Lấy thông tin danh sách ticket của khách hàng
    var customerId = new mongodb.ObjectID(req.query.customerId);
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 5;

    var agg = _CustomerJourney.aggregate();
    agg._pipeline.push({
        $match: {
            'ticketObject.idCustomer': customerId
        }
    }, { $unwind: "$ticketObject" }, {
        $lookup: {
            from: 'campains',
            localField: 'ticketObject.idCampain', // tìm id service cho outbound
            foreignField: '_id',
            as: 'idCampain'
        }
    }, {
        $unwind: {
            path: '$idCampain',
            preserveNullAndEmptyArrays: true
        }
    }, {
        $lookup: {
            from: 'companies',
            localField: 'idCampain.idCompany', // tìm kiếm công ty cho cuộc call outbound
            foreignField: '_id',
            as: 'companyOutbound'
        }
    }, {
        $lookup: {
            from: 'services',
            localField: 'ticketObject.idService', // tìm id service cho inbound
            foreignField: '_id',
            as: 'idService'
        }
    }, {
        $unwind: {
            path: '$idService',
            preserveNullAndEmptyArrays: true
        }
    }, {
        $lookup: {
            from: 'companies',
            localField: 'idService.idCompany', // tìm kiếm công ty cho cuộc call inbound
            foreignField: '_id',
            as: 'companyInbound'
        }
    }, {
        $lookup: {
            from: 'servicechats',
            localField: 'ticketObject.idService',
            foreignField: '_id',
            as: 'idServiceChat'
        }
    }, {
        $unwind: {
            path: '$idServiceChat',
            preserveNullAndEmptyArrays: true
        }
    }, {
        $lookup: {
            from: 'companychannels',
            localField: 'idServiceChat.idChannel', // Tìm kênh chát
            foreignField: '_id',
            as: 'idChannel'
        }
    }, {
        $unwind: {
            path: '$idChannel',
            preserveNullAndEmptyArrays: true
        }
    }, {
        $lookup: {
            from: 'companies',
            localField: 'idChannel.idCompany', // Tìm công ty chat
            foreignField: '_id',
            as: 'companyChat'
        }
    }, {
        $lookup: {
            from: 'servicemails',
            localField: 'ticketObject.idService', // Tìm service mail
            foreignField: '_id',
            as: 'idServiceMail'
        }
    }, {
        $unwind: {
            path: '$idServiceMail',
            preserveNullAndEmptyArrays: true
        }
    }, {
        $lookup: {
            from: 'companies',
            localField: 'idServiceMail.idCompany', // Tìm công ty mail
            foreignField: '_id',
            as: 'companyMail'
        },
    }, {
        $lookup: {
            from: 'ticketreasoncategories',
            localField: 'ticketObject.ticketReasonCategory',
            foreignField: '_id',
            as: 'ticketReasonCategory'
        }
    }, { $unwind: { path: '$ticketReasonCategory', preserveNullAndEmptyArrays: true } }, {
        $lookup: {
            from: 'ticketsubreasons',
            localField: 'ticketObject.ticketSubreason',
            foreignField: '_id',
            as: 'ticketSubreason'
        }
    }, { $unwind: { path: '$ticketSubreason', preserveNullAndEmptyArrays: true } });
    // if (!!req.session.auth.company) {
    //     var companyId = new mongodb.ObjectID(req.session.auth.company._id);
    //     agg._pipeline.push({
    //         $redact: {
    //             $cond: {
    //                 if: { $or: [{ $eq: ["$idService.idCompany", companyId] }, { $eq: ["$idCampain.idCompany", companyId] }] },
    //                 then: "$$KEEP",
    //                 else: "$$PRUNE"
    //             }
    //         }
    //     })
    // }

    agg._pipeline.push({
        $group: {
            _id: '$ticketId',
            updateBy: { $first: '$updateBy' },
            channelType: { $first: '$ticketObject.channelType' },
            idCampain: { $first: '$ticketObject.idCampain' },
            deadline: { $first: '$ticketObject.deadline' },
            updated: { $first: '$ticketObject.updated' },
            status: { $first: '$ticketObject.status' },
            idService: { $first: '$ticketObject.idService' },
            ticketReasonCategory: { $first: '$ticketReasonCategory' },
            ticketReason: { $first: '$ticketReason' },
            ticketSubreason: { $first: '$ticketSubreason' },
            note: { $first: '$ticketObject.note' },
            companyChat: { $first: '$companyChat.name' },
            companyMail: { $first: '$companyMail.name' },
            companyOutcound: { $first: '$companyOutcound.name' },
            companyInbound: { $first: '$companyInbound.name' }
        }
    }, {
        $project: {
            _id: 1,
            'updateBy.name': 1,
            'updateBy.displayName': 1,
            channelType: 1,
            deadline: 1,
            updated: 1,
            status: 1,
            idService: 1,
            idCampain: 1,
            ticketReasonCategory: 1,
            ticketReason: 1,
            ticketSubreason: 1,
            note: 1,
            companyChat: 1,
            companyMail: 1,
            companyInbound: 1,
            companyOutbound: 1
        }
    }, {
        $sort: {
            updated: -1
        }
    }
    );
    _CustomerJourney.aggregatePaginate(agg, { page: page, limit: rows }, function (error, tickets, pageCount, total) {
        if (error) return res.json({ code: 500, message: JSON.stringify(error) });
        var paginator = new pagination.SearchPaginator({ prelink: '/customer-journey?customerId=' + req.query.customerId, current: page, rowsPerPage: rows, totalResult: total });
        var obj = {};
        obj['data'] = tickets;
        obj['paging'] = paginator.getPaginationData();
        res.json({ code: error ? 500 : 200, message: error ? error : obj });
    });
}
