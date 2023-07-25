exports.formatDate = (_date, format = "HH:mm:ss") => {
    let date;
    if (typeof _date === "number") date = new Date(_date);
    else date = _date;
    const fullYear = `${date.getFullYear()}`;
    const month = `0${date.getMonth()}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    const hours = `0${date.getHours()}`.slice(-2);
    const minutes = `0${date.getMinutes()}`.slice(-2);
    const seconds = `0${date.getSeconds()}`.slice(-2);

    return format
        .replace("YYYY", fullYear)
        .replace("MM", month)
        .replace("DD", day)
        .replace("HH", hours)
        .replace("mm", minutes)
        .replace("ss", seconds);
};

exports.pad = pad;

exports.hms = (secs) => {
    if (isNaN(secs)) return "00:00:00"
    var sec = Math.ceil(secs / 1000);
    var minutes = Math.floor(sec / 60);
    sec = sec % 60;
    var hours = Math.floor(minutes / 60)
    minutes = minutes % 60;
    return hours + ":" + pad(minutes) + ":" + pad(sec);
}
exports.hmsToNumber = (value) => {
    if (value === '--' || value === 0) return 0;
    var time = value.split(':'); // split it at the colons

    // minutes are worth 60 seconds. Hours are worth 60 minutes.
    var seconds = (+time[0]) * 60 * 60 + (+time[1]) * 60 + (+time[2]);
    return seconds;
}
exports.msToTime = function (s) {
    if (!s || s == 0) return '00:00:00';
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
    return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
  }

function pad(num) {
    return ("0" + num).slice(-2);
}