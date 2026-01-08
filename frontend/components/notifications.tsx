"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface Notification {
  id: string;
  type: "banner" | "modal" | "email";
  title: string;
  message: string;
  image_url: string | null;
}

export function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      console.log("Notifications API response:", response.data);
      const banners = (response.data.data || []).filter(
        (n: Notification) => n.type === "banner"
      );
      console.log("Filtered banners:", banners);
      setNotifications(banners);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/dismiss`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  if (loading || notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3 flex-1">
            {notif.image_url && (
              <img
                src={notif.image_url}
                alt="notification"
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div>
              <p className="font-bold">{notif.title}</p>
              <p className="text-sm opacity-90">{notif.message}</p>
            </div>
          </div>
          <button
            onClick={() => handleDismiss(notif.id)}
            className="ml-4 text-white hover:text-gray-200 font-bold text-xl"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function NotificationModal() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      const modals = (response.data.data || []).filter(
        (n: Notification) => n.type === "modal"
      );
      setNotifications(modals);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (notifications.length === 0) return;

    const currentNotif = notifications[currentIndex];
    try {
      await api.post(`/notifications/${currentNotif.id}/dismiss`);
      // Remove from list and show next if exists
      const newNotifs = notifications.filter((_, i) => i !== currentIndex);
      setNotifications(newNotifs);
      if (currentIndex >= newNotifs.length && newNotifs.length > 0) {
        setCurrentIndex(newNotifs.length - 1);
      }
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  if (loading || notifications.length === 0) return null;

  const currentNotif = notifications[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
        {currentNotif.image_url && (
          <img
            src={currentNotif.image_url}
            alt="notification"
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {currentNotif.title}
          </h2>
          <p className="text-gray-700 mb-6 whitespace-pre-wrap">
            {currentNotif.message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Entendi
            </button>
          </div>
          {notifications.length > 1 && (
            <p className="text-center text-sm text-gray-500 mt-3">
              {currentIndex + 1} de {notifications.length} notificações
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
