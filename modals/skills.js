
var SkillSchema = new mongoose.Schema({
    skillName: {type: String, required: true, index: true},
    alarmDurHigh: {type: Number, required: true},
    alarmDurLow: {type: Number, required: true},
    recordingState: {type: Number, default: 1},
    idCompany: {type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now},
    updated: {type: Date}
}, {id: false, versionKey: 'v'});

SkillSchema.statics._deleteAll = function (ids, cb) {
    var aggregate = [];
    var _query = {_id: {$in: _.arrayObjectId(ids)}};
    aggregate.push({$match: _query});
    aggregate.push({$lookup: {from: 'services', localField: '_id', foreignField: 'idSkill', as: 'services'}});
    aggregate.push({$lookup: {from: 'groupprofiles', localField: '_id', foreignField: 'skills.idSkill', as: 'groupprofiles'}});

    _Skills.aggregate(aggregate, function (err, skills) {
        var _errorSkills = _.filter(skills, function(el){
            return el.services.length > 0 || el.groupprofiles.length > 0;
        });

        var _deleteSkills = _.filter(skills, function(el){
            return el.services.length == 0 && el.groupprofiles.length == 0;
        });
        mongoose.model('Skill').remove({_id: {$in: _.pluck(_deleteSkills, '_id')}}, function(err, result){
            cb(err, _errorSkills);
        });
    });
};

SkillSchema.set('toJSON', {getters: true});
SkillSchema.index({skillName:1, idCompany:1},{unique:true});
module.exports = mongoose.model('Skill', SkillSchema);