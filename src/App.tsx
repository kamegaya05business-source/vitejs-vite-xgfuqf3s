import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://mbgsmjowdxwtwwmwygvu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iZ3Ntam93ZHh3dHd3bXd5Z3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTA0ODAsImV4cCI6MjA4ODc4NjQ4MH0.J8iAYq-tgz7ExPWYeMHE2ar78apsYyMa7j1ob3mFteQ";

const supa = (() => {
  const h = { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` };
  const api = (path, opts: any = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: h, ...opts }).then(r => r.json());
  return {
    getRoom: (id) => api(`rooms?id=eq.${id}&select=*`),
    createRoom: (id, members) => api(`rooms`, { method: "POST", body: JSON.stringify({ id, members }), headers: { ...h, "Prefer": "return=representation" } }),
    updateMembers: (id, members) => api(`rooms?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ members }), headers: { ...h, "Prefer": "return=representation" } }),
    getExpenses: (roomId, month) => api(`expenses?room_id=eq.${roomId}&month=eq.${month}&select=*&order=date.asc`),
    addExpense: (exp) => api(`expenses`, { method: "POST", body: JSON.stringify(exp), headers: { ...h, "Prefer": "return=representation" } }),
    updateExpense: (id, exp) => api(`expenses?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(exp), headers: { ...h, "Prefer": "return=representation" } }),
    deleteExpense: (id) => api(`expenses?id=eq.${id}`, { method: "DELETE" }),
  };
})();

const CATEGORIES = [
  { id: "rent",          label: "家賃",   icon: "🏠" },
  { id: "grocery",      label: "日用品", icon: "🧴" },
  { id: "food",         label: "食費",   icon: "🍽️" },
  { id: "entertainment",label: "娯楽費", icon: "🎮" },
  { id: "utility",      label: "光熱費", icon: "💡" },
  { id: "transport",    label: "交通費", icon: "🚃" },
  { id: "medical",      label: "医療費", icon: "💊" },
  { id: "telecom",      label: "通信費", icon: "📱" },
  { id: "other",        label: "その他", icon: "📦" },
];

const SPLIT_PRESETS = ["50:50", "60:40", "70:30", "自由入力"];
// 按分ラベル生成（名前付き）
function splitLabel(preset, members) {
  if (preset === "自由入力") return "自由入力";
  const [a, b] = preset.split(":").map(Number);
  const m0 = members[0] || "A";
  const m1 = members[1] || "B";
  return `${m0} ${a} : ${b} ${m1}`;
}
const ROOM_ID = "SHARED"; // 固定ルームID

// ---- Entry Page ----
function EntryPage({ onJoin }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    if (!name.trim()) { setErr("お名前を入力してください"); return; }
    setLoading(true);
    let rows = await supa.getRoom(ROOM_ID);
    let room;
    if (!Array.isArray(rows) || rows.length === 0) {
      const created = await supa.createRoom(ROOM_ID, [name.trim()]);
      room = Array.isArray(created) ? created[0] : { id: ROOM_ID, members: [name.trim()] };
    } else {
      room = rows[0];
      if (!room.members.includes(name.trim())) {
        await supa.updateMembers(ROOM_ID, [...room.members, name.trim()]);
        room.members = [...room.members, name.trim()];
      }
    }
    onJoin(ROOM_ID, name.trim(), room);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f0f4ff 0%,#fce4ec 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "40px 36px", width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🏠</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, color: "#333", fontWeight: 700 }}>精算Tool</h1>
        </div>
        {err && <div style={{ background: "#fff0f0", color: "#e53935", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{err}</div>}
        <input
          placeholder="お名前を入力"
          value={name}
          onChange={e => { setName(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && handleEnter()}
          style={inputStyle}
        />
        <button onClick={handleEnter} disabled={loading} style={{ ...btnStyle, background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {loading ? "入室中…" : "→ 入室する"}
        </button>
      </div>
    </div>
  );
}

// ---- Main App ----
function App() {
  const [page, setPage] = useState("entry");
  const [myName, setMyName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [isEvent, setIsEvent] = useState(false);
  const [eventName, setEventName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const periodKey = isEvent ? `event:${eventName}` : selectedMonth;

  const fetchExpenses = useCallback(async () => {
    const rows = await supa.getExpenses(ROOM_ID, periodKey);
    if (Array.isArray(rows)) setExpenses(rows);
  }, [periodKey]);

  useEffect(() => { if (page === "main") fetchExpenses(); }, [fetchExpenses, page]);
  useEffect(() => {
    if (page !== "main") return;
    const t = setInterval(fetchExpenses, 5000);
    return () => clearInterval(t);
  }, [fetchExpenses, page]);

  const handleJoin = (id, name, room) => {
    setMyName(name); setMembers(room.members); setPage("main");
  };

  if (page === "entry") return <EntryPage onJoin={handleJoin} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fc", fontFamily: "'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏠</span>
          <span style={{ fontWeight: 700, color: "#333", fontSize: 16 }}>精算Tool</span>
        </div>
        <div style={{ background: "#667eea", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 12 }}>{myName}</div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 100px" }}>

        {/* Period selector */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setIsEvent(false)} style={{ flex: 1, border: "none", borderRadius: 10, padding: "7px", cursor: "pointer", fontWeight: 600, fontSize: 13, background: !isEvent ? "linear-gradient(135deg,#667eea,#764ba2)" : "#f5f5f5", color: !isEvent ? "#fff" : "#555" }}>
              📅 月次
            </button>
            <button onClick={() => setIsEvent(true)} style={{ flex: 1, border: "none", borderRadius: 10, padding: "7px", cursor: "pointer", fontWeight: 600, fontSize: 13, background: isEvent ? "linear-gradient(135deg,#f093fb,#f5576c)" : "#f5f5f5", color: isEvent ? "#fff" : "#555" }}>
              🎉 イベント
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isEvent ? (
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                style={{ border: "none", fontSize: 16, fontWeight: 600, color: "#333", background: "transparent", outline: "none", flex: 1 }} />
            ) : (
              <input placeholder="イベント名（例：沖縄旅行）" value={eventName} onChange={e => setEventName(e.target.value)}
                style={{ border: "none", fontSize: 15, fontWeight: 600, color: "#333", background: "transparent", outline: "none", flex: 1 }} />
            )}
            <button onClick={() => setShowSummary(true)} disabled={isEvent && !eventName.trim()}
              style={{ background: "linear-gradient(135deg,#43cea2,#185a9d)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (isEvent && !eventName.trim()) ? 0.4 : 1 }}>
              精算 →
            </button>
          </div>
        </div>

        {/* Members */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const }}>
          {members.map(m => (
            <div key={m} style={{ background: "#fff", borderRadius: 20, padding: "5px 14px", fontSize: 13, color: "#555", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>👤</span>{m}
              <button onClick={() => {
                const updated = members.filter(x => x !== m);
                setMembers(updated);
                supa.updateMembers(ROOM_ID, updated);
              }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>

        {/* Expense list */}
        {expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div>まだ支出がありません</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {expenses.map(exp => {
              const cat = CATEGORIES.find(c => c.id === exp.category) || CATEGORIES[CATEGORIES.length - 1];
              return (
                <div key={exp.id} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#333", fontSize: 15 }}>{exp.store || "—"}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{exp.date} · {cat.label} · {exp.paid_by} · {exp.split}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "#667eea", fontSize: 16 }}>¥{Number(exp.amount).toLocaleString()}</div>
                  <button onClick={() => { setEditId(exp.id); setShowForm(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#bbb" }}>✏️</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => { setEditId(null); setShowForm(true); }}
        style={{ position: "fixed", bottom: 28, right: 24, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", fontSize: 28, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(102,126,234,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
        +
      </button>

      {showForm && (
        <ExpenseForm
          members={members} myName={myName} periodKey={periodKey} isEvent={isEvent}
          editData={editId ? expenses.find(e => e.id === editId) : null}
          onSave={(exp) => {
            const full = { ...exp, room_id: ROOM_ID };
            if (editId) {
              setExpenses(prev => prev.map(e => e.id === editId ? full : e));
              supa.updateExpense(editId, exp);
            } else {
              setExpenses(prev => [...prev, full]);
              supa.addExpense(full);
            }
            setShowForm(false); setEditId(null);
          }}
          onDelete={editId ? () => {
            setExpenses(prev => prev.filter(e => e.id !== editId));
            supa.deleteExpense(editId);
            setShowForm(false); setEditId(null);
          } : null}
          onClose={() => { setShowForm(false); setEditId(null); }}
        />
      )}

      {showSummary && (
        <SummaryModal expenses={expenses} members={members} period={isEvent ? eventName : selectedMonth} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}

// ---- Expense Form ----
function ExpenseForm({ members, myName, periodKey, isEvent, editData, onSave, onDelete, onClose }) {
  const today = new Date();
  const defaultDate = isEvent ? today.toISOString().slice(0, 10) : `${periodKey}-${String(today.getDate()).padStart(2, "0")}`;
  const [date, setDate] = useState(editData?.date || defaultDate);
  const [amount, setAmount] = useState(editData?.amount || "");
  const [category, setCategory] = useState(editData?.category || "rent");
  const [store, setStore] = useState(editData?.store || "");
  const [paidBy, setPaidBy] = useState(editData?.paid_by || myName);
  const [splitMode, setSplitMode] = useState(() => {
    if (!editData) return "50:50";
    return ["50:50", "60:40", "70:30"].includes(editData.split) ? editData.split : "自由入力";
  });
  const [customSplit, setCustomSplit] = useState(() => {
    if (!editData) return "";
    return ["50:50", "60:40", "70:30"].includes(editData.split) ? "" : editData.split;
  });

  const handleSave = () => {
    if (!date || !amount || !store) return;
    const splitVal = splitMode === "自由入力" ? customSplit : splitMode;
    onSave({ id: editData?.id || Date.now().toString(), month: periodKey, date, amount: Number(amount), category, store, paid_by: paidBy, split: splitVal });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 520, padding: "24px 20px 32px", maxHeight: "90vh", overflowY: "auto" as const }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#333" }}>{editData ? "支出を編集" : "支出を追加"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>
        <Label>日付</Label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        <Label>金額</Label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#999" }}>¥</span>
          <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, paddingLeft: 28 }} />
        </div>
        <Label>カテゴリ</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              background: category === c.id ? "linear-gradient(135deg,#667eea,#764ba2)" : "#f5f5f5",
              color: category === c.id ? "#fff" : "#555", border: "none", borderRadius: 12, padding: "10px 4px",
              cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, lineHeight: 1.3
            }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <Label>支出先</Label>
        <input placeholder="例：イオン、Netflix" value={store} onChange={e => setStore(e.target.value)} style={inputStyle} />
        <Label>支払った人</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const }}>
          {members.map(m => (
            <button key={m} onClick={() => setPaidBy(m)} style={{
              background: paidBy === m ? "linear-gradient(135deg,#43cea2,#185a9d)" : "#f5f5f5",
              color: paidBy === m ? "#fff" : "#555", border: "none", borderRadius: 20, padding: "7px 16px", cursor: "pointer", fontWeight: 600, fontSize: 14
            }}>{m}</button>
          ))}
        </div>
        <Label>按分</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {SPLIT_PRESETS.map(p => (
            <button key={p} onClick={() => setSplitMode(p)} style={{
              background: splitMode === p ? "linear-gradient(135deg,#f093fb,#f5576c)" : "#f5f5f5",
              color: splitMode === p ? "#fff" : "#555", border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13, textAlign: "left" as const
            }}>{splitLabel(p, members)}</button>
          ))}
        </div>
        {splitMode === "自由入力" && <input placeholder="例：80:20" value={customSplit} onChange={e => setCustomSplit(e.target.value)} style={inputStyle} />}
        <button onClick={handleSave} disabled={!date || !amount || !store}
          style={{ ...btnStyle, background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", marginTop: 8, opacity: (!date || !amount || !store) ? 0.5 : 1 }}>
          {editData ? "更新する" : "追加する"}
        </button>
        {onDelete && <button onClick={onDelete} style={{ ...btnStyle, background: "#fff0f0", color: "#e53935", marginTop: 8 }}>削除する</button>}
      </div>
    </div>
  );
}

// ---- Summary Modal ----
function SummaryModal({ expenses, members, period, onClose }) {
  const totals: Record<string, { paid: number; owed: number }> = {};
  members.forEach(m => { totals[m] = { paid: 0, owed: 0 }; });
  expenses.forEach(exp => {
    const [r1, r2] = parseSplit(exp.split, members.length);
    members.forEach((m, i) => { totals[m].owed += exp.amount * (i === 0 ? r1 : r2); });
    if (totals[exp.paid_by] !== undefined) totals[exp.paid_by].paid += exp.amount;
  });
  const balances = members.map(m => ({ name: m, bal: totals[m].paid - totals[m].owed }));
  const settlements: any[] = [];
  const p2 = balances.filter(b => b.bal > 0.5).sort((a, b) => b.bal - a.bal).map(x => ({ ...x }));
  const n2 = balances.filter(b => b.bal < -0.5).sort((a, b) => a.bal - b.bal).map(x => ({ ...x }));
  let pi = 0, ni = 0;
  while (pi < p2.length && ni < n2.length) {
    const amt = Math.min(p2[pi].bal, -n2[ni].bal);
    settlements.push({ from: n2[ni].name, to: p2[pi].name, amount: Math.round(amt) });
    p2[pi].bal -= amt; n2[ni].bal += amt;
    if (Math.abs(p2[pi].bal) < 0.5) pi++;
    if (Math.abs(n2[ni].bal) < 0.5) ni++;
  }
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, padding: "28px 24px", maxHeight: "85vh", overflowY: "auto" as const }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#333" }}>💰 {period} 精算結果</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#bbb" }}>✕</button>
        </div>
        <div style={{ background: "#f7f8fc", borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 13, marginBottom: 8 }}>
            <span>合計支出</span><span style={{ fontWeight: 700, color: "#333", fontSize: 16 }}>¥{total.toLocaleString()}</span>
          </div>
          {members.map(m => (
            <div key={m} style={{ display: "flex", justifyContent: "space-between", color: "#555", fontSize: 14, marginTop: 4 }}>
              <span>👤 {m}</span>
              <span>支払 ¥{(totals[m]?.paid || 0).toLocaleString()} / 負担 ¥{Math.round(totals[m]?.owed || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: 15, color: "#333", marginBottom: 12 }}>精算内容</h3>
        {settlements.length === 0 ? (
          <div style={{ textAlign: "center", color: "#43cea2", fontWeight: 600, padding: "20px 0" }}>✅ 清算不要！バランスが取れています</div>
        ) : settlements.map((s, i) => (
          <div key={i} style={{ background: "linear-gradient(135deg,#667eea15,#764ba215)", borderRadius: 16, padding: "16px 20px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700, color: "#333" }}>{s.from}</span>
            <span style={{ color: "#999", fontSize: 13 }}>が</span>
            <span style={{ fontWeight: 700, color: "#667eea" }}>{s.to}</span>
            <span style={{ color: "#999", fontSize: 13 }}>に</span>
            <span style={{ fontWeight: 700, color: "#e53935", fontSize: 18, marginLeft: "auto" }}>¥{s.amount.toLocaleString()}</span>
          </div>
        ))}
        <h3 style={{ fontSize: 15, color: "#333", marginBottom: 12, marginTop: 20 }}>カテゴリ別</h3>
        {CATEGORIES.map(c => {
          const s = expenses.filter(e => e.category === c.id).reduce((a, e) => a + e.amount, 0);
          if (!s) return null;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span style={{ color: "#555", fontSize: 14, flex: 1 }}>{c.label}</span>
              <span style={{ fontWeight: 600, color: "#333" }}>¥{s.toLocaleString()}</span>
              <div style={{ width: 80, background: "#eee", borderRadius: 4, height: 6 }}>
                <div style={{ width: `${Math.round(s / total * 100)}%`, background: "linear-gradient(135deg,#667eea,#764ba2)", height: 6, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseSplit(split, memberCount) {
  if (!split || memberCount < 2) return [0.5, 0.5];
  const parts = split.split(":").map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const t = parts[0] + parts[1]; return [parts[0] / t, parts[1] / t];
  }
  return [0.5, 0.5];
}

function Label({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 6 }}>{children}</div>;
}

const inputStyle: React.CSSProperties = { width: "100%", border: "1.5px solid #eee", borderRadius: 12, padding: "11px 14px", fontSize: 15, outline: "none", marginBottom: 16, boxSizing: "border-box", background: "#fafafa", color: "#333" };
const btnStyle: React.CSSProperties = { width: "100%", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer", boxSizing: "border-box" };

export default App;