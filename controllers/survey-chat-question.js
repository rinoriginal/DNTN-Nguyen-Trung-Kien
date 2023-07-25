exports.index = {
    json: function (req, res) {
        log.debug(req.params, req.body);

        res.json({});
    },
    html: function (req, res) {

    }
}

exports.search={
    json: function (req, res) {
        log.debug(req.params, req.body);
        res.json({});
    },
    html: function (req, res){

    }
}