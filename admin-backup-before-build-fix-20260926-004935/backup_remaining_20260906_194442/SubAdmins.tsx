import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function SubAdmins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  async function load() {
    const response = await api.get(
      "/completion/sub-admins",
    );
    setAdmins(response.data.admins || []);
  }

  async function create() {
    await api.post(
      "/completion/sub-admins",
      form,
    );

    setForm({
      fullName: "",
      phone: "",
      email: "",
      password: "",
    });

    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-page">
      <h1>الأدمنات الفرعية</h1>

      <div className="admin-card">
        <h2>إنشاء أدمن فرعي</h2>

        <input
          placeholder="الاسم"
          value={form.fullName}
          onChange={(e) =>
            setForm({
              ...form,
              fullName: e.target.value,
            })
          }
        />

        <input
          placeholder="الهاتف"
          value={form.phone}
          onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value,
            })
          }
        />

        <input
          placeholder="Gmail"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
        />

        <input
          type="password"
          placeholder="كلمة المرور"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
        />

        <button onClick={create}>
          ➕ إنشاء أدمن فرعي
        </button>
      </div>

      <div className="admin-card">
        <h2>الأدمنات</h2>

        {admins.map((admin) => (
          <div key={admin._id}>
            <strong>{admin.fullName}</strong>
            <span> — {admin.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
