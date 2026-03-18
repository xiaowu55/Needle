"use client";

import { useEffect, useState } from "react";
import { PushDeliveryHeatmap } from "@/components/push-delivery-heatmap";

type ScheduleForm = {
  frequency: "daily" | "weekly";
  time: string;
  weekday: string;
  intervalHours: string;
};

type PushStatusResponse = {
  enabled: boolean;
  endpointKnown: boolean;
  sentCount: number;
  schedule: {
    frequency: "daily" | "weekly" | "interval";
    hour: number;
    minute: number;
    weekday?: number;
    intervalHours?: number;
    timeZone: string;
  } | null;
  deliveryHistory: Array<{
    dateKey: string;
    count: number;
  }>;
};

const STORAGE_KEY = "album-daily:push-settings";
const DEFAULT_FORM: ScheduleForm = {
  frequency: "daily",
  time: "09:00",
  weekday: "1",
  intervalHours: "6",
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushSettings() {
  const [form, setForm] = useState<ScheduleForm>(DEFAULT_FORM);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [status, setStatus] = useState("未启用推送提醒");
  const [isSupported, setIsSupported] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState("");
  const [pushStatus, setPushStatus] = useState<PushStatusResponse>({
    enabled: false,
    endpointKnown: false,
    sentCount: 0,
    schedule: null,
    deliveryHistory: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  async function loadPushStatus(endpoint?: string) {
    const response = await fetch("/api/push/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const nextStatus = (await response.json()) as PushStatusResponse;
    setPushStatus(nextStatus);
  }

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setIsSupported(supported);

    if (!supported) {
      setStatus("当前浏览器不支持 Web Push。");
      return;
    }

    setPermission(Notification.permission);

    const savedForm = window.localStorage.getItem(STORAGE_KEY);
    if (savedForm) {
      try {
        const saved = JSON.parse(savedForm) as Partial<ScheduleForm>;
        setForm({
          ...DEFAULT_FORM,
          ...saved,
          frequency: saved.frequency === "weekly" ? "weekly" : "daily",
        });
      } catch {
        setForm(DEFAULT_FORM);
      }
    }

    void (async () => {
      const configResponse = await fetch("/api/push/public-key");
      const configData = (await configResponse.json()) as {
        publicKey: string;
        configured: boolean;
      };

      setPublicKey(configData.publicKey);
      setIsConfigured(configData.configured);

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscriptionEndpoint(existingSubscription.endpoint);
        setStatus("推送已订阅，可修改时间与周期。");
        await loadPushStatus(existingSubscription.endpoint);
      } else {
        await loadPushStatus();
      }
    })();
  }, []);

  async function saveSubscription() {
    if (!isSupported || !publicKey) {
      return;
    }

    setIsSaving(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      let currentPermission = Notification.permission;

      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }

      if (currentPermission !== "granted") {
        setStatus("通知权限未开启。");
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          schedule: {
            frequency: form.frequency,
            time: form.time,
            weekday: Number.parseInt(form.weekday, 10),
            intervalHours: Number.parseInt(form.intervalHours, 10),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setSubscriptionEndpoint(subscription.endpoint);
      setStatus("推送提醒已更新。");
      await loadPushStatus(subscription.endpoint);
    } finally {
      setIsSaving(false);
    }
  }

  async function disableSubscription() {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setStatus("当前没有可取消的推送订阅。");
      return;
    }

    await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });

    await subscription.unsubscribe();
    window.localStorage.removeItem(STORAGE_KEY);
    setSubscriptionEndpoint("");
    setStatus("推送提醒已关闭。");
    setPushStatus({
      enabled: false,
      endpointKnown: false,
      sentCount: 0,
      schedule: null,
      deliveryHistory: [],
    });
  }

  return (
    <section className="push-panel">
      <div className="push-panel-copy">
        <p className="editor-kicker">PWA Reminder</p>
        <h2 className="push-panel-title">推送提醒</h2>
        <p className="push-panel-text">
          允许在你设定的时间，用系统通知提醒你继续听今天这张专辑。
        </p>
      </div>

      {!isSupported ? (
        <p className="push-panel-status">{status}</p>
      ) : !isConfigured ? (
        <p className="push-panel-status">服务端还没配置 Web Push 的 VAPID 密钥。</p>
      ) : (
        <>
          <div className="push-grid">
            <label className="push-field">
              <span>周期</span>
              <select
                value={form.frequency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    frequency: event.target.value as ScheduleForm["frequency"],
                  }))
                }
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </select>
              </label>

            <label className="push-field">
              <span>时间</span>
              <input
                type="time"
                step={900}
                value={form.time}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    time: event.target.value,
                  }))
                }
                />
              </label>

            {form.frequency === "weekly" ? (
              <label className="push-field">
                <span>星期</span>
                <select
                  value={form.weekday}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      weekday: event.target.value,
                    }))
                  }
                >
                  <option value="1">周一</option>
                  <option value="2">周二</option>
                  <option value="3">周三</option>
                  <option value="4">周四</option>
                  <option value="5">周五</option>
                  <option value="6">周六</option>
                  <option value="0">周日</option>
                </select>
              </label>
            ) : null}
          </div>

          <div className="poster-actions push-actions">
            <button
              type="button"
              className="editor-button editor-button-dark"
              disabled={isSaving}
              onClick={() => void saveSubscription()}
            >
              {subscriptionEndpoint ? "更新提醒" : "启用提醒"}
            </button>
            {subscriptionEndpoint ? (
              <button
                type="button"
                className="editor-button"
                onClick={() => void disableSubscription()}
              >
                关闭提醒
              </button>
            ) : null}
          </div>

          <PushDeliveryHeatmap
            enabled={pushStatus.enabled}
            history={pushStatus.deliveryHistory}
            timeZone={pushStatus.schedule?.timeZone}
          />

          <p className="push-panel-status">
            当前权限：{permission}。{status}
          </p>
        </>
      )}
    </section>
  );
}
