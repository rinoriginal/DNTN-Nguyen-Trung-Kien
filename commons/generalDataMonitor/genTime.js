function genTime() {
  var currentTime = new Date();
  var startDateCurrentMonth = _moment(currentTime).startOf('month')._d;
  var endDateCurrentMonth = _moment(currentTime).endOf('month')._d;

  var endDatePrevMonth = _moment(startDateCurrentMonth).subtract(1, "days").endOf('month')._d;
  var startDatePrevMonth = moment(endDatePrevMonth).startOf('month')._d;

  return {
    startDateCurrentMonth,
    endDateCurrentMonth,
    endDatePrevMonth,
    startDatePrevMonth,
  }
}

module.exports = genTime;