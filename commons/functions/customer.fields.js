module.exports = {
    getCustomerFields,
    getCustomerFieldSorted
  };
  
  async function getCustomerFields(idCompany) {
    try {
      var cond = {};
      var fieldsId = [];
  
      if (idCompany) {
        cond = {
          _id: idCompany,
        };
      }
      let companys = await _Company.distinct("companyProfile", cond);
      let profiles = await _CompanyProfile.find({
        _id: {
          $in: companys,
        },
      });
      _.each(profiles, function (el) {
        fieldsId = _.union(fieldsId, el.fieldId);
      });
  
      let fields = await _CustomerFields
        .find({
          _id: {
            $in: fieldsId,
          },
          status: 1,
        })
        .sort({
          weight: 1,
          displayName: 1,
        })
        .exec();
  
      return fields;
    } catch (err) {
      throw err;
    }
  }
  
  // lấy danh sách các field theo thứ tự sắp xếp
  function getCustomerFieldSorted(callback) {
    _async.waterfall([
        function (next) {
            _Company.findOne({}, next)
        }, function (company, next) {
            _CompanyProfile.aggregate([
                {
                    $match: {
                        _id: _.convertObjectId(company.companyProfile)
                    }
                },
                { $unwind: "$fieldId" },
                {
                    $lookup: {
                        from: "customerfields", localField: "fieldId", foreignField: "_id", as: "field"
                    }
                },
                { $unwind: "$field" },
                {
                    $project: {
                        _id: "$field._id",
                        fieldType: "$field.fieldType",
                        fieldValue: "$field.fieldValue",
                        isDefault: "$field.isDefault",
                        isRequired: "$field.isRequired",
                        displayWidth: "$field.displayWidth",
                        weight: "$field.weight",
                        status: "$field.status",
                        displayName: "$field.displayName",
                        modalName: "$field.modalName",
                    }
                },
                {
                    $lookup: {
                        from: "sortfieldcustomers", localField: "_id", foreignField: "fieldId", as: "sortField"
                    }
                },
                { $unwind: { path: '$sortField', preserveNullAndEmptyArrays: true } },
                {
                    $sort: {
                        "sortField.index": 1
                    }
                }
            ], function (err, rs) {
                next(err, rs)
            })
        }
    ], function (error, result) {
        callback(error, result)
    })
  
  }

  module.exports = {
    getCustomerFields,
    getCustomerFieldSorted
  };