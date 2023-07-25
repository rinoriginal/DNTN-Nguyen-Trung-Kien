const FILE_STATUS = {
    UNKNOWN: "UNKNOWN",
    PROCESSING: "PROCESSING",
    NOT_EXIST: "NOT_EXIST",
    READY_DOWNLOAD: "READY_DOWNLOAD",
    DOWNLOADED: "DOWNLOADED",
    UPLOADED: "UPLOADED",
    DELETED: "DELETED",
    ERROR_ON_DOWNLOAD: "ERROR_ON_DOWNLOAD",
}

const CALL_DIRECTION_V1 = {
    INTERNAL: "INTERNAL", // nội bộ
    IN_BOUND: "IN_BOUND", // gọi vào
    OUT_BOUND: "OUT_BOUND", // gọi ra
    UNKNOWN: "UNKNOWN", // chưa xác định
}
const CALL_DIRECTION = {
    INTERNAL: "INTERNAL", // nội bộ
    INBOUND: "INBOUND", // gọi vào
    OUTBOUND: "OUTBOUND", // gọi ra
    UNKNOWN: "UNKNOWN", // chưa xác định
}

module.exports = {
    FILE_STATUS,
    CALL_DIRECTION,
    CALL_DIRECTION_V1
}