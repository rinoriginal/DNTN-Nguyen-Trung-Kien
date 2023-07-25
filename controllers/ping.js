
exports.index = {
	json: function(req, res) {
		res.json({
			userId: _.has(req.session.user, '_id') ? req.session.user._id : null
		})
	}
};