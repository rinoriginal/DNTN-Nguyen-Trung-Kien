exports.index = {
    json: function (req, res) {

    },
    html: function (req, res) {
        var page = _.has(req.query, "page") ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, "rows") ? parseInt(req.query.rows) : 10;

        var query = _.cleanRequest(req.query);

        var aggregate = _TicketsMail.aggregate();

        aggregate._pipeline = [];

        if (query["idAgent"]) aggregate._pipeline.push({ $match: { "idAgent": mongodb.ObjectId(query["idAgent"]) } });

        aggregate._pipeline.push(
            { $match: { status: 2 } },
            { $lookup: { from: "servicemails", localField: "idService", foreignField: "_id", as: "idService" } },
            { $unwind: { path: "$idService", preserveNullAndEmptyArrays: true } }
        );

        if (query["idCompany"]) aggregate._pipeline.push({ $match: { "idService.idCompany": mongodb.ObjectId(query["idCompany"]) } });

        aggregate._pipeline.push(
            { $lookup: { from: "mails", localField: "mailId", foreignField: "_id", as: "mailId" } },
            { $unwind: { path: "$mailId", preserveNullAndEmptyArrays: true } }
        );

        if (query["idCampain"]) aggregate._pipeline.push({ $match: { "mailId.campaign": mongodb.ObjectId(query["idCampain"]) } });


        _async.parallel({
            companies: function (next) { _Company.find({ status: 1 }, "_id name", next); },
            campains: function (next) { _MailCampaigns.find({ status: 1 }, "_id name", next); },
            agents: function (next) { _Users.find({ status: 1 }, "_id name displayName", next); },
            total: function (next) {
                var _taggregate = Object.assign([], aggregate._pipeline);
                _taggregate.push({
                    $group: {
                        _id: {$dateToString: {format: "%d/%m/%Y", date: "$created"}},
                        mail: { $sum: 1 },
                        finished: { $sum: { $cond: { if: { $eq: ["$status", 2] }, then: 1, else: 0 } } },
                        pending: { $sum: { $cond: { if: { $eq: ["$status", -1] }, then: 1, else: 0 } } },
                        totalMinites: { $sum: { "$divide": [{ "$subtract": ["$created", "$mailId.created"] }, 1000 * 60] } }
                    }
                });
                _TicketsMail.aggregate(_taggregate, next);
            },
            reports: function (next) {
                aggregate._pipeline.push(
                    { $lookup: { from: "customerindex", localField: "idCustomer", foreignField: "_id", as: "idCustomer" } },
                    { $unwind: { path: "$idCustomer", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent" } },
                    { $unwind: { path: "$idAgent", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: { agent: "$idAgent", customer: "$idCustomer" },
                            ticket: { $sum: 1 },
                            finished: { $sum: { $cond: { if: { $eq: ["$status", 2] }, then: 1, else: 0 } } },
                            pending: { $sum: { $cond: { if: { $eq: ["$status", -1] }, then: 1, else: 0 } } },
                            totalMinites: { $sum: { "$divide": [{ "$subtract": ["$created", "$mailId.created"] }, 1000 * 60] } }
                        }
                    },
                    {$match:{"_id":{$ne:{}}}}
                );

                _TicketsMail.aggregatePaginate(aggregate, { page: page, limit: rows }, function (error, ar, pageCount, count) {
                    var paginator = new pagination.SearchPaginator({ prelink: "/first-mail", current: page, rowsPerPage: rows, totalResult: count });
                    next(error, { data: ar, paging: paginator.getPaginationData() });
                });
            }
        }, function (error, result) {
            _.render(req, res, "first-mail", {
                title: "First Mail",
                companies: result.companies,
                campains: result.campains,
                agents: result.agents,
                reports: result.reports.data,
                paging: result.reports.paging,
                total: result.total,
                plugins: [["bootstrap-select"]]
            }, true, error);
        });
    }
}