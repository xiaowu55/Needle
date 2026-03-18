"use client";

type PushDeliveryHeatmapProps = {
  history: Array<{
    dateKey: string;
    count: number;
  }>;
  enabled: boolean;
  timeZone?: string;
};

function getDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildRecentDateKeys(timeZone: string, days = 30) {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return getDateKey(date, timeZone);
  });
}

export function PushDeliveryHeatmap({
  history,
  enabled,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: PushDeliveryHeatmapProps) {
  const counts = new Map(history.map((entry) => [entry.dateKey, entry.count]));
  const recentDates = buildRecentDateKeys(timeZone, 30);

  return (
    <section className="push-history" aria-label="最近 30 天送达记录">
      <div className="push-history-copy">
        <p className="editor-kicker">Delivery history</p>
        <h3 className="push-panel-title">最近 30 天送达记录</h3>
        <p className="push-panel-text">
          {enabled
            ? "每天成功送达提醒后，这里的方块会点亮。"
            : "启用提醒后，这里会记录每天的送达情况。"}
        </p>
      </div>

      <div className="push-history-grid" role="list">
        {recentDates.map((dateKey) => {
          const count = counts.get(dateKey) ?? 0;
          const intensityClass =
            count >= 4
              ? " level-4"
              : count === 3
                ? " level-3"
                : count === 2
                  ? " level-2"
                  : count === 1
                    ? " level-1"
                    : "";
          return (
            <span
              key={dateKey}
              role="listitem"
              className={`push-history-cell${intensityClass}`}
              title={`${dateKey} · ${count > 0 ? `已送达 ${count} 次` : "未送达"}`}
              aria-label={`${dateKey}${count > 0 ? ` 已送达 ${count} 次` : " 未送达"}`}
            />
          );
        })}
      </div>

      <div className="push-history-legend">
        <span>少</span>
        <span className="push-history-cell" aria-hidden="true" />
        <span className="push-history-cell level-1" aria-hidden="true" />
        <span className="push-history-cell level-3" aria-hidden="true" />
        <span className="push-history-cell level-4" aria-hidden="true" />
        <span>多</span>
      </div>
    </section>
  );
}
