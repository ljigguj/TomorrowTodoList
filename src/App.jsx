import { useState, useEffect } from "react";

const TASK_KEY = "tomorrow_tasks_v1";
const PIN_KEY = "pinned_events_v1";

const PRIORITY_CONFIG = {
  high: { label: "高", bg: "#FCEBEB", color: "#A32D2D", border: "#F09595" },
  medium: { label: "中", bg: "#FAEEDA", color: "#854F0B", border: "#EF9F27" },
  low: { label: "低", bg: "#EAF3DE", color: "#3B6D11", border: "#97C459" },
};

const defaultTasks = [
  { id: 1, title: "晨会 — 项目进度同步", startTime: "09:00", endTime: "09:30", priority: "high", note: "准备Q2汇报材料", done: false },
  { id: 2, title: "撰写产品需求文档", startTime: "10:00", endTime: "12:00", priority: "high", note: "", done: false },
  { id: 3, title: "午休", startTime: "12:00", endTime: "13:30", priority: "low", note: "", done: true },
];

const defaultPinForm = { title: "", startDate: "", endDate: "", note: "" };
const defaultTaskForm = { title: "", startTime: "", endTime: "", priority: "medium", note: "" };

function getTaskStatus(task) {
  if (task.done) return "done";
  const now = new Date();
  if (!task.endTime) return "active";
  const [h, m] = task.endTime.split(":").map(Number);
  const end = new Date(); end.setHours(h, m, 0, 0);
  if (now > end) return "overdue";
  if ((end - now) / 60000 < 30) return "urgent";
  return "active";
}

function getPinStatus(ev) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = ev.startDate ? new Date(ev.startDate) : null;
  const end = ev.endDate ? new Date(ev.endDate) : null;
  if (end && today > end) return "ended";
  if (start && today < start) return "upcoming";
  return "ongoing";
}

const TASK_STATUS_STYLE = {
  done:    { bg: "#F1EFE8", color: "#5F5E5A", label: "已完成" },
  overdue: { bg: "#FCEBEB", color: "#A32D2D", label: "已逾期" },
  urgent:  { bg: "#FAEEDA", color: "#854F0B", label: "即将到期" },
  active:  { bg: "#E6F1FB", color: "#185FA5", label: "进行中" },
};

const PIN_STATUS_STYLE = {
  ongoing:  { bg: "#FCEBEB", color: "#A32D2D", border: "#F7C1C1", label: "进行中" },
  upcoming: { bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4", label: "即将开始" },
  ended:    { bg: "#F1EFE8", color: "#5F5E5A", border: "#D3D1C7", label: "已结束" },
};

function daysLeft(ev) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (!ev.endDate) return null;
  const end = new Date(ev.endDate);
  const diff = Math.ceil((end - today) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "今天截止";
  return diff + " 天后截止";
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

export default function App() {
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  const dateStr = tmr.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  const [tasks, setTasks] = useState(defaultTasks);
  const [pins, setPins] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [pinForm, setPinForm] = useState(defaultPinForm);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editPinId, setEditPinId] = useState(null);
  const [, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const tr = await window.storage.get(TASK_KEY);
        if (tr?.value) setTasks(JSON.parse(tr.value));
        const pr = await window.storage.get(PIN_KEY);
        if (pr?.value) setPins(JSON.parse(pr.value));
      } catch {}
    })();
  }, []);

  async function persist(newTasks, newPins) {
    try {
      await window.storage.set(TASK_KEY, JSON.stringify(newTasks));
      await window.storage.set(PIN_KEY, JSON.stringify(newPins));
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 1500);
    } catch { setSaveStatus("保存失败"); setTimeout(() => setSaveStatus(""), 2000); }
  }

  function updateTasks(t) { setTasks(t); persist(t, pins); }
  function updatePins(p) { setPins(p); persist(tasks, p); }

  const total = tasks.length, doneCount = tasks.filter(t => t.done).length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;
  const sorted = [...tasks].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  function handleAddTask() {
    if (!taskForm.title.trim()) return;
    let next;
    if (editTaskId !== null) {
      next = tasks.map(t => t.id === editTaskId ? { ...t, ...taskForm } : t);
      setEditTaskId(null);
    } else {
      next = [...tasks, { ...taskForm, id: Date.now(), done: false }];
    }
    updateTasks(next);
    setTaskForm(defaultTaskForm); setShowTaskForm(false);
  }

  function handleAddPin() {
    if (!pinForm.title.trim()) return;
    let next;
    if (editPinId !== null) {
      next = pins.map(p => p.id === editPinId ? { ...p, ...pinForm } : p);
      setEditPinId(null);
    } else {
      next = [...pins, { ...pinForm, id: Date.now() }];
    }
    updatePins(next);
    setPinForm(defaultPinForm); setShowPinForm(false);
  }

  const inp = (extra) => ({ fontSize: 14, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", boxSizing: "border-box", width: "100%", ...extra });

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "var(--font-sans)" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 2px" }}>明日待办清单</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 1.25rem" }}>
        {dateStr}
        {saveStatus && <span style={{ marginLeft: 10, fontSize: 11, color: "#1D9E75" }}>{saveStatus}</span>}
      </p>

      {/* ── 置顶重要事件区 ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>📌</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>重要事件</span>
          </div>
          <button onClick={() => { setShowPinForm(true); setEditPinId(null); setPinForm(defaultPinForm); }}
            style={{ fontSize: 12, cursor: "pointer", padding: "4px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)" }}>
            + 添加置顶
          </button>
        </div>

        {showPinForm && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "1rem", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px", color: "var(--color-text-primary)" }}>{editPinId ? "编辑重要事件" : "新建重要事件"}</p>
            <input value={pinForm.title} onChange={e => setPinForm({ ...pinForm, title: e.target.value })}
              placeholder="事件名称（必填）" style={{ ...inp(), marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>开始日期</div>
                <input type="date" value={pinForm.startDate} onChange={e => setPinForm({ ...pinForm, startDate: e.target.value })} style={inp()} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>截止日期</div>
                <input type="date" value={pinForm.endDate} onChange={e => setPinForm({ ...pinForm, endDate: e.target.value })} style={inp()} />
              </div>
            </div>
            <input value={pinForm.note} onChange={e => setPinForm({ ...pinForm, note: e.target.value })}
              placeholder="备注（可选）" style={{ ...inp(), marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddPin} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "#A32D2D", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                {editPinId ? "保存修改" : "置顶"}
              </button>
              <button onClick={() => { setPinForm(defaultPinForm); setEditPinId(null); setShowPinForm(false); }}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
                取消
              </button>
            </div>
          </div>
        )}

        {pins.length === 0 && !showPinForm && (
          <div style={{ fontSize: 13, color: "var(--color-text-tertiary)", padding: "10px 0 4px" }}>暂无置顶事件</div>
        )}

        {pins.map(ev => {
          const st = getPinStatus(ev);
          const sc = PIN_STATUS_STYLE[st];
          const left = daysLeft(ev);
          return (
            <div key={ev.id} style={{ border: "1px solid " + sc.border, borderLeft: "3px solid " + sc.border, borderRadius: 10, padding: "10px 14px", marginBottom: 8, background: sc.bg, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: sc.color }}>{ev.title}</span>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 5, background: "rgba(255,255,255,0.55)", color: sc.color, border: "0.5px solid " + sc.border }}>{sc.label}</span>
                  {left && <span style={{ fontSize: 11, color: sc.color, opacity: 0.85 }}>{left}</span>}
                </div>
                {(ev.startDate || ev.endDate) && (
                  <div style={{ fontSize: 12, color: sc.color, opacity: 0.8, marginBottom: ev.note ? 2 : 0 }}>
                    {ev.startDate && "📅 " + formatDate(ev.startDate)}
                    {ev.startDate && ev.endDate && " → "}
                    {ev.endDate && formatDate(ev.endDate)}
                  </div>
                )}
                {ev.note && <div style={{ fontSize: 12, color: sc.color, opacity: 0.7 }}>{ev.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => { setPinForm({ title: ev.title, startDate: ev.startDate, endDate: ev.endDate, note: ev.note || "" }); setEditPinId(ev.id); setShowPinForm(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px" }} title="编辑">✏️</button>
                <button onClick={() => updatePins(pins.filter(p => p.id !== ev.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px 4px" }} title="删除">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 统计卡 ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem" }}>
        {[
          { label: "全部任务", val: total },
          { label: "已完成", val: doneCount },
          { label: "未完成", val: total - doneCount },
        ].map(c => (
          <div key={c.label} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 10, padding: "10px 14px", border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.val}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>
          <span>完成进度</span><span>{progress}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 6, background: "var(--color-background-secondary)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: progress + "%", background: "#1D9E75", borderRadius: 6, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* ── 任务列表 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>任务列表</span>
        <button onClick={() => { setShowTaskForm(true); setEditTaskId(null); setTaskForm(defaultTaskForm); }}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer", padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> 添加任务
        </button>
      </div>

      {showTaskForm && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>{editTaskId ? "编辑任务" : "新建任务"}</p>
          <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
            placeholder="任务名称（必填）" style={{ ...inp(), marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>开始时间</div>
              <input type="time" value={taskForm.startTime} onChange={e => setTaskForm({ ...taskForm, startTime: e.target.value })} style={inp()} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>截止时间</div>
              <input type="time" value={taskForm.endTime} onChange={e => setTaskForm({ ...taskForm, endTime: e.target.value })} style={inp()} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>优先级</div>
            <div style={{ display: "flex", gap: 7 }}>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setTaskForm({ ...taskForm, priority: k })}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: taskForm.priority === k ? "1.5px solid " + v.border : "0.5px solid var(--color-border-tertiary)", background: taskForm.priority === k ? v.bg : "var(--color-background-secondary)", color: taskForm.priority === k ? v.color : "var(--color-text-secondary)", fontSize: 13, cursor: "pointer", fontWeight: taskForm.priority === k ? 500 : 400 }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <input value={taskForm.note} onChange={e => setTaskForm({ ...taskForm, note: e.target.value })}
            placeholder="备注（可选）" style={{ ...inp(), marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddTask} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#185FA5", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
              {editTaskId ? "保存修改" : "添加"}
            </button>
            <button onClick={() => { setTaskForm(defaultTaskForm); setEditTaskId(null); setShowTaskForm(false); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer" }}>
              取消
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>暂无任务，点击"添加任务"开始</div>
        )}
        {sorted.map(task => {
          const st = getTaskStatus(task);
          const sc = TASK_STATUS_STYLE[st];
          const pc = PRIORITY_CONFIG[task.priority];
          return (
            <div key={task.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start", opacity: task.done ? 0.72 : 1 }}>
              <button onClick={() => updateTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                style={{ marginTop: 2, width: 20, height: 20, borderRadius: "50%", border: task.done ? "none" : "1.5px solid var(--color-border-secondary)", background: task.done ? "#1D9E75" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {task.done && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", textDecoration: task.done ? "line-through" : "none" }}>{task.title}</span>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 5, background: pc.bg, color: pc.color, border: "0.5px solid " + pc.border }}>{pc.label}</span>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 5, background: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>
                {(task.startTime || task.endTime) && (
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: task.note ? 3 : 0 }}>
                    {task.startTime && "🕐 " + task.startTime}
                    {task.startTime && task.endTime && " → "}
                    {task.endTime && task.endTime}
                  </div>
                )}
                {task.note && <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{task.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => { setTaskForm({ title: task.title, startTime: task.startTime, endTime: task.endTime, priority: task.priority, note: task.note || "" }); setEditTaskId(task.id); setShowTaskForm(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 4px" }}>✏️</button>
                <button onClick={() => updateTasks(tasks.filter(t => t.id !== task.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 4px" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}