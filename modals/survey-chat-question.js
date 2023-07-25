var SurveyChatQuestionSchema = new mongoose.Schema({
    idSurvey: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'SurveyChatQuestion', index: true},
    content: {type: String, required: true},
    value: {type: String, required:true},
    createBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    updateBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    status: {type: Number, default: 1},
    unitId: {type: Number, required:true},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {id: false, versionKey: 'v'});

SurveyChatQuestionSchema.statics._deleteAll = function (ids, cb) {
    mongoose.model('SurveyChatQuestion').find({_id: ids}, function (error1, _surveyQs) {
        log.debug(_surveyQs);
        if (!_surveyQs) {
            cb(error1, 404);
        }else{
            _async.forEachOf(_surveyQs, function(_surveyQ, i, cb1){
                _async.waterfall([
                    function(cbWtf1){
                        mongoose.model('SurveyChatAnswer').remove({idQuestion:_surveyQ._id}, function(err){
                            cbWtf1(null);
                        });
                    }
                ], function(err){
                    log.debug(err);
                    log.debug(_surveyQ._id);
                    mongoose.model('SurveyChatQuestion').remove({_id: _surveyQ._id}, cb1);
                });
            }, function (err1) {
                log.debug(err1);
                cb(null);
            })
        }
    });
};

SurveyChatQuestionSchema.index({idSurvey: 1, content:1},{unique:true});
SurveyChatQuestionSchema.set('toJSON', {getters: true});
module.exports = mongoose.model('SurveyChatQuestion', SurveyChatQuestionSchema);