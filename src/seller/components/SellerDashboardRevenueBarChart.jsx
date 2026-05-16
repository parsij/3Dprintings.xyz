import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function SellerDashboardRevenueBarChart({ data }) {
  return (
    <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-md font-bold text-black">Total revenue of each month</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={10} />
            <YAxis
              domain={["auto", "auto"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip
              cursor={{ fill: "#f3f4f6" }}
              contentStyle={{ backgroundColor: "#000", color: "#fff", borderRadius: "8px" }}
              itemStyle={{ color: "#f97316" }}
            />
            <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} activeBar={{ fill: "#f97316" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}