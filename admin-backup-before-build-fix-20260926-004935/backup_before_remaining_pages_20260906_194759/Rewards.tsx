
import { useEffect, useState } from "react";

export default function Rewards() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [rewardValue, setRewardValue] = useState("10000");

  async function load() {
    const res = await fetch("/api/rewards");
    const json = await res.json();
    setItems(json.data ?? []);
  }

  async function create() {
    await fetch("/api/rewards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        target: "captain",
        conditionType: "orders_count",
        threshold: Number(threshold),
        rewardValue: Number(rewardValue),
        isActive: true,
      }),
    });

    setName("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div dir="rtl">
      <h1>المكافآت</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسم المكافأة"
      />

      <input
        value={threshold}
        onChange={(e) =>
          setThreshold(e.target.value)
        }
        placeholder="الحد"
      />

      <input
        value={rewardValue}
        onChange={(e) =>
          setRewardValue(e.target.value)
        }
        placeholder="قيمة المكافأة"
      />

      <button onClick={create}>
        إضافة مكافأة
      </button>

      {items.map((item) => (
        <div key={item._id}>
          {item.name} — {item.rewardValue}
        </div>
      ))}
    </div>
  );
}
