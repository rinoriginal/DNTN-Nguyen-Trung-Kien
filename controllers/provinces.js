const { TYPE_AREA } = require(path.join(_rootPath, 'helpers', 'constants', 'provinces.const.js'))

exports.index = {
    json: function (req, res) {
        let { scope, typeArea } = req.query;
        console.log({ scope });
        switch (scope) {
            case 'search-by-area':
                if (typeArea) typeArea = typeArea.split(",");

                _Provinces.find({ typeArea: { $in: typeArea || [] } }, (err, result) => {
                    if (err) res.json({ code: 500, message: "fail" });
                    else res.json({ code: 200, message: result });
                });
                break;
            case 'search-by-area-exist-restaurant':
                let query = {}
                if (_.has(req.query, 'idBrand') && req.query.idBrand) {
                    query["restaurants.idBrand"] = _.convertObjectId(req.query.idBrand)
                }
                if (_.has(req.query, 'typeArea') && req.query.typeArea) {
                    query["typeArea"] = +(req.query.typeArea)
                }
                _Provinces.aggregate([
                    { $lookup: { from: "restaurants", localField: "_id", foreignField: "idProvince", as: "restaurants" } },
                    { $unwind: "$restaurants" },
                    { $match: query },
                    {
                        $group: {
                            _id: "$_id",
                            count: { $sum: 1 },
                            typeArea: { $first: "$typeArea" },
                            status: { $first: "$status" },
                            name: { $first: "$name" },
                            restaurant: { $push: "$restaurants" }
                        }

                    }
                ], function (err, result) {
                    res.json({ code: err ? 500 : 200, message: err ? err : result });

                })
                break;

            default:
                res.json({ code: 200, message: "success default" });
                break;
        }
    },
    html: function (req, res, next) {
        // next page 404
        return next();
        _.render(req, res, 'brand-manager', {
            title: "Quản lý nhãn hiệu",
            areas: Object.keys(TYPE_AREA).map(i => TYPE_AREA[i]),
            body: "bodyyy",
        }, true, null);
    }
}


// function getprovincesByArea(typeArea, cb) {
    // _Provinces.find({typeArea}, cb);
// }