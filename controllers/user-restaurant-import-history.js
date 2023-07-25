exports.index = {
    json: function (req, res) {

    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = req.query;
        var aggregate = _UserRestaurantImportHistory.aggregate();
        var _query = _.has(query, 'created') ? _.object(['created'], [_.switchAgg(6, query['created'])]) : {};
        aggregate._pipeline.push({ $match: { $and: [_query] } });
        aggregate._pipeline.push({ $sort: { created: -1 } });
        _UserRestaurantImportHistory.aggregatePaginate(aggregate, { page: page, limit: rows }, function (error, history, pageCount, count) {
            var paginator = new pagination.SearchPaginator({ prelink: '/user-restaurant-import-history', current: page, rowsPerPage: rows, totalResult: count });
            _.render(req, res, 'user-restaurant-import-history', { title: 'Lịch sử nhập liệu', historyList: history, paging: paginator.getPaginationData(), plugins: ['moment', ['bootstrap-datetimepicker']] }, true, error);
        });
        //        _UserRestaurantImportHistory
        //            .find()
        //            .paginate(page, rows, function (error, history, total) {
        //                var paginator = new pagination.SearchPaginator({prelink: '/user-restaurant-import-history', current: page, rowsPerPage: rows, totalResult: total});
        //                _.render(req, res, 'user-restaurant-import-history', {title: 'Lịch sử nhập liệu', historyList: history, paging: paginator.getPaginationData(), plugins: ['moment',['bootstrap-datetimepicker']]}, true, error);
        //            });
    }
};
