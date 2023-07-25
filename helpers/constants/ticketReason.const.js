/**
 * Định nghĩa các key trong collection Ticket Reason Category
 */
const TICKET_REASON_CATEGORY = {
  // field category
  category: {
    CallInAndCallOut: 0, // Gọi vào và gọi ra
    CallIn: 1,           // Gọi vào 
    CallOut: 2,          // Gọi ra
    Chat: 3,             // Chat
    Email: 4,            // Email
    SocialNetwork: 5     // Mạng xã hội
  },
  // field status
  status: {
    Activate: 1,         // Kích hoạt
    Deactivate: 0,       // Không kích hoạt
  }
}

/**
 * Định nghĩa các key trong collection Ticket Reason
 */
const TICKET_REASON = {
  // field status
  status: {
    Activate: 1,
    Deactive: 0,
  }
}

module.exports = {
  TICKET_REASON_CATEGORY,
  TICKET_REASON,
}