exports.create = function (req, res) {
    _async.waterfall([
        function (next) {
            var listQuery = [];
            _async.each(req.files, function (file, cb) {
                var foderPath = path.join('assets', 'file-manager');
                // var extendfile = file.originalname.substring(file.originalname.length - 4, file.originalname.length);
                var extendfile = file.originalname.split('.').pop()
                let originalname = file.originalname.split('.')[0].replace(/[\*\^\'\!\#\&]/g, '').split(' ').join('-')
                fsx.mkdirp(path.join(_rootPath, foderPath), function (err) {
                    if (err) next(err, null);
                    fsx.move(file.path, path.join(_rootPath, foderPath, originalname + file.filename + "." + extendfile), function (err) {
                        var query = {};
                        query['url'] = path.join(foderPath, originalname + file.filename + "." + extendfile).toString().replace(/\\/gi, '/');
                        // query['id'] = (file.filename + extendfile).toString().replace(/\\/gi, '/');
                        query['name'] = file.originalname.replace(/[\*\^\'\!\#]/g, '').split(' ').join('-');
                        query['createdBy'] = query.updateBy = req.session.user._id;
                        query['created'] = query.updated = new Date();
                        query['status'] = 1;
                        listQuery.push(query);
                        cb();
                    })
                })
            }, function (error) {
                next(error, listQuery);
            })
        },
        function (dataFile, next) {
            var listResult = [];
            _async.each(dataFile, function (item, cb) {
                _FileManager.create(item, function (error, result) {
                    if (!error) listResult.push(result);
                    cb();
                })

            }, function (error) {
                next(error, listResult);
            })
        }
    ], function (error, data) {
        log.info('DATA UPLOAD: ', data)
        log.info('ERROR UPLOAD', error)

        res.json({ code: (error ? 500 : 200), message: error ? error : data });
    })
}


exports.destroy = function (req, res) {
    // let url = path.join('assets', 'file-manager', req.params.uploadfile.replace(/\_/gi, '.')).toString().replace(/\\/gi, '/')
    // console.log(url);

    // fsx.remove(path.join(_rootPath, url), function (error) {
    //     // cb(null, file_result._id)
    //     res.json({ code: (error ? 500 : 200), message: error ? error : '' });
    // });
    _async.waterfall([
        function (cb) {
            _FileManager.findById(_.convertObjectId(req.params['uploadfile']), function (error, result) {
                if (result)
                    cb(error, result);
                else
                    res.json({ code: 200, message: null });
            })
        },
        function (file_result, cb) {
            fsx.remove(path.join(_rootPath, file_result.url), function (error) {
                cb(null, file_result._id)
            });
        },
        function (id_result, cb) {
            _FileManager.remove({ _id: id_result }, function (error, result) {
                cb(null, result);
            })
        }
    ], function (error, data) {
        res.json({ code: (error ? 500 : 200), message: error ? error : data });
    })
}