export default function SellerDashboardTopMetricsRow({ metrics }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      {metrics.map((metric, index) => (
        <div key={index} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-black">{metric.title}</h3>
          <p className="mb-2 text-4xl font-extrabold text-black">{metric.value}</p>
          <p className="text-sm font-medium text-gray-500">{metric.subtext}</p>
        </div>
      ))}
    </div>
  );
}
