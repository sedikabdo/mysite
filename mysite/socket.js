const socketIo = require("socket.io");

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", // يمكنك تعديل هذا حسب بيئتك (مثل "http://localhost:3000" في التطوير)
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // الانضمام إلى غرفة المستخدم الفردية بناءً على userId
    socket.on("join", (userId) => {
      if (userId) {
        socket.userId = userId; // تخزين userId في كائن المقبس
        socket.join(userId); // غرفة خاصة بالمستخدم الفردي
        console.log(`User ${userId} joined their own room: ${userId}`);

        // بث حالة الاتصال لتحديث قائمة الأصدقاء
        io.emit("userStatus", { userId, online: true });
      }
    });

    // الانضمام إلى غرفة الدردشة بين مستخدمين (للمحادثات الثنائية)
    socket.on("joinChat", ({ userId, friendId }) => {
      const room = [userId, friendId].sort().join("_"); // غرفة فريدة لكل زوج من المستخدمين
      socket.join(room);
      console.log(`User ${userId} joined chat room ${room} with ${friendId}`);
    });

    // استقبال الرسالة من العميل وبثها للمستلم فقط
    socket.on("sendMessage", (message) => {
      console.log("Received message:", message);
      const room = [message.sender_id, message.receiver_id].sort().join("_");
      io.to(room).emit("newMessage", message); // بث الرسالة للغرفة الثنائية
      io.to(message.receiver_id).emit("newMessage", message); // بث الرسالة لغرفة المستلم الفردية
    });

    // استقبال تحديث الصورة وبثه لجميع المتصلين
    socket.on("updateAvatar", ({ userId, avatar }) => {
      console.log(`Avatar updated for user ${userId}: ${avatar}`);
      io.emit("avatarUpdated", { userId, avatar }); // بث التحديث للجميع
    });

    // بث حدث فتح الدردشة
    socket.on("chatOpened", (data) => {
      io.emit("chatOpened", data);
    });

    socket.on("disconnect", () => {
      const userId = socket.userId;
      console.log("User disconnected:", userId || socket.id);
      if (userId) {
        // بث حالة الانفصال لتحديث قائمة الأصدقاء
        io.emit("userStatus", { userId, online: false });
      }
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };