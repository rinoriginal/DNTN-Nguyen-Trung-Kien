var SurveyChatSchema = new mongoose.Schema({
    name: {type: String, required: true},
    website: {type: String, default: ''},
    idCompanyChannel: {type: mongoose.Schema.Types.ObjectId, ref: 'CompanyChannel', default: null},
    createBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    updateBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {id: false, versionKey: 'v'});

SurveyChatSchema.statics._deleteAll = function (ids, cb) {
    mongoose.model('SurveyChat').find({_id: ids}, function (error1, _surveys) {
        if (!_surveys) {
            cb(error1, 404);
        }else{
            _async.forEachOf(_surveys, function(_survey, i, cb1){
                mongoose.model('SurveyChatQuestion').find({idSurvey: _survey._id}).exec(function(err2, _surveyQs){
                    var _surveyQsIds = _.pluck(_surveyQs, '_id');
                    log.debug(_surveyQsIds);
                    mongoose.model('SurveyChatQuestion')._deleteAll({$in: _surveyQsIds}, function (err3) {
                        mongoose.model('SurveyChat').remove({_id: _survey._id}, cb1);
                    });
                });
            }, function (err4) {
                cb(err4);
            })
        }
    });
};
SurveyChatSchema.plugin(require('mongoose-aggregate-paginate'));
SurveyChatSchema.index({name:1},{unique:true});
SurveyChatSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('SurveyChat', SurveyChatSchema);