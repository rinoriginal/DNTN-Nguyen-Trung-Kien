

exports.index = {
    json: function (req, res) {
        log.debug(5, req)
    },
    html: function (req, res) {
        log.debug(8, req.session.auth.company);
        log.debug(9, req.query);

        var format = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

        _async.parallel({
            companiesChannel: function(next) {
                var query= {};
                if(req.session.auth.company)
                    query.idCompany= req.session.auth.company._id;
                query.status=1;
                query.website={ "$nin": [ null, "" ] };

                _CompanyChannel.find(query, next);
            },
            surveys: function(next) {
                var query={};

                    if(_.has(req.query, 'name') && req.query.name.trim().length > 0){
                        var reg = req.query.name.replace(/([!@#$%^&*()+=\[\]\\';,./{}|":<>?~_-])/g, "\\$1");
                        query.name={'$regex' : reg.trim(), '$options' : 'i'};
                    }
                    if(_.has(req.query, 'website') && req.query.website.trim().length > 0){
                        var reg = req.query.website.replace(/([!@#$%^&*()+=\[\]\\';,./{}|":<>?~_-])/g, "\\$1");
                        query.website={'$regex' : reg.trim(), '$options' : 'i'};
                    }
                    if(_.has(req.query, 'status')){
                        query.status= req.query.status;
                    }
                _SurveyChat.find(query, next);
            }
        }, function(err, result){
            log.debug(err, result);
            _.render(req, res, 'survey-chat', {
                title: 'Quản lý khảo sát',
                surveys: result.surveys,
                companiesChannel: result.companiesChannel,
                plugins: [['bootstrap-select'], ['mrblack-table'],'moment']
            }, true, err);
        });

    }
}

exports.create= function (req, res) {
    log.debug(req.body);

    var survey= {};
    survey.idCompanyChannel= new mongodb.ObjectID(req.body.website);
    survey.name=req.body.name;
    survey.status=req.body.status;
    survey.createBy= req.session.user._id;

    _SurveyChat.find({name: survey.name}).exec(function(err, surveys){
        if(err) return res.json({code: 500, message: err.message});
        if(surveys && surveys.length >0){
            return res.json({code: 500, message: "Tên bộ đánh giá bị trùng"});
        }else{

            if(survey.status==1){
                _SurveyChat.find({idCompanyChannel: survey.idCompanyChannel, status: 1}).exec(function(err, surveys){
                    if(err) return res.json({code: 500, message: err.message});
                    if(surveys && surveys.length >0){
                        return res.json({code: 500, message: "website "+surveys[0].website+" đã có bộ đánh giá đang kích hoạt"});
                    }else{
                        createSurvey(req, res, survey);
                    }
                });
            }else{
                createSurvey(req, res, survey);
            }
        }
    });

}

var createSurvey = function (req, res, survey) {
    var questions= [];

    _CompanyChannel.findById(req.body.website, function(err, c){
        log.debug(err, c);
        if (err) return res.json({code: 500, message: err.message});

        survey.website= c.website;

        log.debug(47, survey);
        _SurveyChat.create(survey, function(cErr, survey){
            log.debug(cErr, survey);
            if (cErr) return res.json({code: 500, message: cErr.message});

            _.each(req.body.question, function(element, index, list){
                log.debug(element, index, list);
                if(element.trim()!=''){
                    var question={};
                    question.idSurvey= survey._id;
                    question.content= element;
                    question.value= req.body.value[index];
                    question.createBy= req.session.user._id;
                    question.unitId=index;
                    questions[index]= question;

                    log.debug(question);
                    _SurveyChatQuestion.create(question, function(scErr, sc){
                        log.debug(scErr, sc);
                    });
                }

            })

            return res.json({code: 200});
        });

    });
}

exports.show= {
    json: function (req, res){
        log.debug(req.params);
        var result={};
        _SurveyChat.findById(req.params.surveychat, function(err, survey){
            log.debug(err, survey);
           if(err) return res.json({code:500, message:err.message});

           result.survey=survey;

           _SurveyChatQuestion.find({idSurvey: survey._id}, function(err1, questions){
               log.debug(err1, questions);

               if(err1) return res.json({code:500, message:err1.message});

               result.questions= questions;

               res.json({code:200, data: result});
           })
        });
    },
    html:  function (req, res){

    }
}

exports.update= function (req, res){

    log.debug(req.body);

    if(_.has(req.body, 'website')){
        return res.json({code: 500, message: "Bắt buộc có thông tin website"});
    }

    if(_.has(req.body, 'name')){
        return res.json({code: 500, message: "Bắt buộc có tên bộ đánh giá"});
    }

    var survey= {};
    survey.idCompanyChannel= new mongodb.ObjectID(req.body.website);
    survey.name=req.body.name;
    survey.status=req.body.status;
    survey.updateBy= req.session.user._id;
    survey._id= req.body.id;



    if(survey.name.trim()!= req.body['original-name']){
        _SurveyChat.find({name: survey.name}).exec(function(err, surveys){
            if(err) return res.json({code: 500, message: err.message});
            if(surveys && surveys.length >0){
                return res.json({code: 500, message: "Tên bộ đánh giá bị trùng"});
            }else{
                if( survey.status== 1){
                    _SurveyChat.find({idCompanyChannel: survey.idCompanyChannel, status: 1}).exec(function(err, surveys) {
                        if (err) return res.json({code: 500, message: err.message});
                        if (surveys && surveys.length > 0&& surveys[0]._id.toString() != survey._id) {
                            return res.json({code: 500, message: "website "+surveys[0].website+" đã có bộ đánh giá đang kích hoạt"});
                        } else {
                            updateSurvey(req, res, survey)
                        }
                    })
                }else{
                    updateSurvey(req, res, survey)
                }

            }
        })
    }else{
        if( survey.status== 1){
            _SurveyChat.find({idCompanyChannel: survey.idCompanyChannel, status: 1}).exec(function(err, surveys) {
                if (err) return res.json({code: 500, message: err.message});
                if (surveys && surveys.length > 0 && surveys[0]._id.toString() != survey._id) {
                    return res.json({code: 500, message: "website "+surveys[0].website+" đã có bộ đánh giá đang kích hoạt"});
                } else {
                    updateSurvey(req, res, survey)
                }
            })
        }else{
            updateSurvey(req, res, survey)
        }
    }


}

var updateSurvey = function (req, res, survey){
    var questions= [];

    _CompanyChannel.findById(req.body.website, function(err, c){
        log.debug(err, c);
        if (err) return res.json({code: 500, message: err.message});

        survey.website= c.website;

        log.debug(47, survey);
        _SurveyChat.findByIdAndUpdate(survey._id, {$set: survey}, {upsert: true}, function(cErr, survey){
            log.debug(cErr, survey);
            if (cErr) return res.json({code: 500, message: cErr.message});


            _.each(req.body.question, function(element, index, list){
                log.debug(element, index, list);

                if(element.trim()!=''){
                    var question={};

                    question.idSurvey= survey._id;
                    question.content= element;
                    question.value= req.body.value[index];
                    if(req.body.questionid[index]){
                        question._id= req.body.questionid[index];
                        question.updateBy= req.session.user._id;
                    }
                    else
                        question.createBy= req.session.user._id;
                    question.unitId=index;
                    questions[index]= question;

                    log.debug(question);
                    if(req.body.questionid[index]){
                        _SurveyChatQuestion.findByIdAndUpdate(question._id, {$set: question}, {upsert: true}, function(scErr, sc){
                            log.debug(scErr, sc);
                        });
                    }
                    else{
                        _SurveyChatQuestion.create(question, function(scErr, sc){
                            log.debug(scErr, sc);
                        });
                    }


                }else{
                    _SurveyChatQuestion.remove({_id: new mongodb.ObjectID(req.body.questionid[index])}, function(rErr){
                        log.debug(rErr);
                    });
                }

            })

            return res.json({code: 200});
        });

    });
}

exports.edit = function (req, res){

}

exports.validate= function (req, res) {
    var _query = _.chain(req.query).cleanRequest(['_', 'fieldId', 'fieldValue']).replaceMultiSpaceAndTrim().value();
    log.debug(_query);

    if(_query.type == 1){
        var q= {name: _query["dlg-name"]};
        _SurveyChat
            .findOne(q).exec(function (error, result) {
                log.debug([req.query.fieldId, _.isNull(result)]);
                return res.json([req.query.fieldId, _.isNull(result)]);
        });
    }else if(_query.type==2){
        if(_query["edit-name"]==_query["edit-name-original"]){
            res.json([req.query.fieldId, true]);
        }else{
            _SurveyChat
                .findOne({name: _query["edit-name"]}).exec(function (error, result) {
                log.debug([req.query.fieldId, _.isNull(result)]);
                return res.json([req.query.fieldId, _.isNull(result)]);
            });
        }
    }else {
        res.json([req.query.fieldId, true]);
    }

}

exports.search = function(req, res){
    log.debug(req.query)
}

exports.destroy = function (req, res) {

    log.debug(req.body, req.params);
    _SurveyChat._deleteAll(req.params.surveychat, function(err, s){
        log.debug(err, s);
        return res.json({code: err?500:200, message: err?err.message:'Xoá thành công'});
    })
}