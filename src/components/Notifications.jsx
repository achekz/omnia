import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    socket.on("receiveNotification", (data) => {
      setNotifications((prev) => [data, ...prev]);
    });
  }, []);

  return (
    <div>
      <h3>Notifications</h3>
      {notifications.map((n, i) => (
        <div key={i}>{n.message}</div>
      ))}
    </div>
  );
}