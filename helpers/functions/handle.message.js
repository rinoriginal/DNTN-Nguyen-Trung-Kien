const MSG = {
  11000: {
    code: 400,
    message: "Dữ liệu bị trùng",
    message_origin: "Duplicated",
  },
};

function handleMessageError(err) {
  let message = "FAIL";
  if (MSG[err.code]) {
    return errorMSG(MSG[err.code]);
  } else {
    console.log({ errName: err.name });
    switch (err.name) {
      case "ValidationError":
        let details = Object.keys(err.errors).length > 0 ? err.errors[Object.keys(err.errors)[0]].message : "ValidationError";
        return errorMSG({ code: 400, message: details || message });
      default:
        break;
    }
  }

  return errorMSG({ code: 400, message: err.message || message });
}

function errorMSG(err) {
  return {
    code: err.code,
    message: err.message,
  };
}

module.exports = {
  handleMessageError,
  errorMSG,
}