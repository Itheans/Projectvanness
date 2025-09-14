import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

// ===== Utilities =====
const STORAGE_KEYS = {
  expenses: "expenses-v1",
  categories: "expense-categories-v1",
};

const formatTHB = (n) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const toDateInputValue = (d) => {
  const z = (n) => (n < 10 ? `0${n}` : n);
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

// Default categories (with colors)
const DEFAULT_CATEGORIES = [
  { id: "food", name: "อาหาร/เครื่องดื่ม", color: "#6366f1" }, // indigo
  { id: "transport", name: "เดินทาง", color: "#10b981" }, // emerald
  { id: "bill", name: "บิล", color: "#f59e0b" }, // amber
  { id: "shopping", name: "ช้อปปิ้ง", color: "#ef4444" }, // red
  { id: "health", name: "สุขภาพ", color: "#22c55e" }, // green
  { id: "entertain", name: "บันเทิง", color: "#06b6d4" }, // cyan
  { id: "other", name: "อื่น ๆ", color: "#8b5cf6" }, // violet
];

// ===== Main App =====
export default function ExpenseTrackerApp() {
  const [expenses, setExpenses] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.expenses);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.categories);
      return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [form, setForm] = useState({
    date: toDateInputValue(new Date()),
    amount: "",
    category: DEFAULT_CATEGORIES[0].id,
    note: "",
    method: "เงินสด",
  });

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category: "all",
    sortBy: "dateDesc", // dateDesc | dateAsc | amountDesc | amountAsc
    query: "",
  });

  const [editingId, setEditingId] = useState(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
  }, [categories]);

  // ===== Derived data with filters =====
  const filtered = useMemo(() => {
    let list = [...expenses];
    const { from, to, category, query, sortBy } = filters;

    if (from) {
      const f = new Date(from);
      list = list.filter((e) => new Date(e.date) >= f);
    }
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e.date) <= t);
    }
    if (category !== "all") list = list.filter((e) => e.category === category);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.note?.toLowerCase().includes(q) ||
          e.method?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "dateAsc":
        list.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case "amountDesc":
        list.sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
      case "amountAsc":
        list.sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
      default:
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return list;
  }, [expenses, filters]);

  const total = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount || 0), 0),
    [filtered]
  );

  // By category (for pie/bar)
  const byCategory = useMemo(() => {
    return categories
      .map((c) => ({
        name: c.name,
        value: filtered
          .filter((e) => e.category === c.id)
          .reduce((s, e) => s + Number(e.amount || 0), 0),
        color: c.color,
      }))
      .filter((x) => x.value > 0);
  }, [filtered, categories]);

  // ===== Handlers =====
  const resetForm = () =>
    setForm({
      date: toDateInputValue(new Date()),
      amount: "",
      category: categories[0]?.id || "other",
      note: "",
      method: "เงินสด",
    });

  const addExpense = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return alert("กรอกจำนวนเงินให้ถูกต้อง");
    if (!form.date) return alert("กรอกวันที่");
    const payload = { id: uid(), ...form, amount };
    setExpenses((prev) => [payload, ...prev]);
    resetForm();
  };

  const startEdit = (id) => {
    const item = expenses.find((x) => x.id === id);
    if (!item) return;
    setEditingId(id);
    setForm({ ...item, amount: String(item.amount) });
  };

  const saveEdit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return alert("กรอกจำนวนเงินให้ถูกต้อง");
    setExpenses((prev) =>
      prev.map((x) => (x.id === editingId ? { ...x, ...form, amount } : x))
    );
    setEditingId(null);
    resetForm();
  };

  const removeExpense = (id) => {
    if (!confirm("ลบรายการนี้หรือไม่?")) return;
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  };

  const clearAll = () => {
    if (!confirm("ลบข้อมูลทั้งหมดหรือไม่?")) return;
    setExpenses([]);
  };

  // Category management
  const addCategory = () => {
    const name = prompt("ชื่อหมวดหมู่");
    if (!name) return;
    const color =
      prompt("รหัสสี (เช่น #ff0000)", "#10b981") || "#10b981";
    const id = name.trim().toLowerCase().replace(/\s+/g, "-");
    setCategories((prev) => [...prev, { id, name, color }]);
  };

  const renameCategory = (id) => {
    const name = prompt("แก้ไขชื่อหมวดหมู่");
    if (!name) return;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const deleteCategory = (id) => {
    if (!confirm("ลบหมวดหมู่? (รายการที่ใช้หมวดนี้จะไม่ถูกลบ)")) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // CSV Export/Import
  const exportCSV = () => {
    const headers = ["date", "amount", "category", "note", "method", "id"];
    const rows = expenses.map((e) => headers.map((h) => e[h] ?? "").toString());
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result || "";
        const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
        const headers = headerLine.split(",");
        const idx = (h) => headers.indexOf(h);
        const data = lines.map((line) => {
          const cols = line.split(",");
          return {
            id: cols[idx("id")] || uid(),
            date: cols[idx("date")],
            amount: parseFloat(cols[idx("amount")]) || 0,
            category: cols[idx("category")] || "other",
            note: cols[idx("note")] || "",
            method: cols[idx("method")] || "",
          };
        });
        setExpenses((prev) => [...data, ...prev]);
      } catch {
        alert("ไฟล์ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  };

  // ===== UI =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span>💸</span> ระบบบันทึกค่าใช้จ่าย
          </h1>
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-all hover:shadow active:scale-95"
            >
              ส่งออก CSV
            </button>
            <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm cursor-pointer transition-all hover:shadow active:scale-95">
              นำเข้า CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => importCSV(e.target.files?.[0])}
              />
            </label>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-500 text-white text-sm transition-all hover:shadow active:scale-95"
            >
              ลบทั้งหมด
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-4">
        {/* Left: Form */}
        <section className="lg:col-span-1">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow p-4 border border-slate-100">
            <h2 className="font-bold text-lg mb-2">
              {editingId ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
            </h2>
            <form onSubmit={editingId ? saveEdit : addExpense} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">วันที่</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="เช่น 100"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[20, 35, 50, 100, 200].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, amount: String(v) })}
                      className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs transition-all"
                    >
                      + {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">หมวดหมู่</label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={addCategory}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 transition-all active:scale-95"
                  >
                    เพิ่มหมวด
                  </button>
                  <button
                    type="button"
                    onClick={() => renameCategory(form.category)}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 transition-all active:scale-95"
                  >
                    แก้ชื่อหมวด
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(form.category)}
                    className="text-xs px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 transition-all active:scale-95"
                  >
                    ลบหมวด
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">วิธีจ่าย</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  placeholder="เช่น เงินสด, PromptPay, บัตรเครดิต"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">บันทึก/หมายเหตุ</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium shadow transition-all active:scale-95"
                >
                  {editingId ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      resetForm();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 transition-all active:scale-95"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* Right: Dashboard + List */}
        <section className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow p-4 border border-slate-100">
            <h2 className="font-bold mb-3">🔎 ตัวกรอง</h2>
            <div className="grid md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs mb-1">ตั้งแต่วันที่</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">ถึงวันที่</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">หมวดหมู่</label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="all">ทั้งหมด</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">ค้นหา (วิธีจ่าย)</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="เช่น เงินสด"
                  value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">จัดเรียง</label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                >
                  <option value="dateDesc">วันที่ ใหม่→เก่า</option>
                  <option value="dateAsc">วันที่ เก่า→ใหม่</option>
                  <option value="amountDesc">จำนวนเงิน มาก→น้อย</option>
                  <option value="amountAsc">จำนวนเงิน น้อย→มาก</option>
                </select>
              </div>
            </div>
          </div>

          {/* Charts by category */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
              <div className="font-semibold mb-2">แจกแจงตามหมวดหมู่</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                      {byCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatTHB(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
              <div className="font-semibold mb-2">ยอดต่อหมวด (แท่ง)</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} angle={-10} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip formatter={(v) => formatTHB(v)} />
                    <Bar dataKey="value">
                      {byCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl shadow p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">รายการล่าสุด</h2>
              <span className="text-sm text-slate-500">{filtered.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-slate-200">
                <thead className="sticky top-0 bg-white/95 backdrop-blur text-left text-slate-600">
                  <tr>
                    <th className="py-2">วันที่</th>
                    <th className="py-2">หมวด</th>
                    <th className="py-2">วิธีจ่าย</th>
                    <th className="py-2 text-right">จำนวนเงิน</th>
                    <th className="py-2">หมายเหตุ</th>
                    <th className="py-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        ยังไม่มีรายการที่ตรงกับตัวกรอง ✨ ลองเพิ่มรายการใหม่หรือปรับตัวกรองดูนะ
                      </td>
                    </tr>
                  )}
                  {filtered.map((e) => {
                    const cat = categories.find((c) => c.id === e.category);
                    return (
                      <tr key={e.id} className="border-t hover:bg-sky-50/50 transition-colors">
                        <td className="py-2 font-medium text-slate-700">
                          {new Date(e.date).toLocaleDateString("th-TH")}
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-white shadow"
                              style={{ background: cat?.color || "#94a3b8" }}
                            />
                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100">
                              {cat?.name || e.category}
                            </span>
                          </span>
                        </td>
                        <td className="py-2">{e.method}</td>
                        <td className="py-2 text-right font-medium">{formatTHB(e.amount)}</td>
                        <td className="py-2">{e.note}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => startEdit(e.id)}
                            className="px-2 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 mr-2"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => removeExpense(e.id)}
                            className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto p-4 text-xs text-slate-500">
        บันทึกข้อมูลลงในเบราว์เซอร์ของคุณ (LocalStorage) · สามารถส่งออก/นำเข้า CSV ได้
      </footer>
    </div>
  );
}
