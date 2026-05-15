import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import SellerDashboardTopMetricsRow from "../components/SellerDashboardTopMetricsRow.jsx";
import SellerDashboardSalesLineChart from "../components/SellerDashboardSalesLineChart.jsx";
import SellerDashboardTopSellingProducts from "../components/SellerDashboardTopSellingProducts.jsx";
import SellerDashboardAverageScore from "../components/SellerDashboardAverageScore.jsx";
import SellerDashboardRevenueBarChart from "../components/SellerDashboardRevenueBarChart.jsx";
import { getSellerDashboard } from "../services/sellerDashboardService.js";

export default function Dashboard() {
  const [metrics, setMetrics] = useState([
    { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
    { title: "Total reviews", value: "0", subtext: "No change month over month" },
    { title: "All time sales", value: "0", subtext: "No change month over month" },
  ]);
  const [salesData, setSalesData] = useState([]);
  const [products, setProducts] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [averageScore, setAverageScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerDashboard();
        setMetrics(Array.isArray(data.metrics) ? data.metrics : []);
        setSalesData(Array.isArray(data.salesData) ? data.salesData : []);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setRevenueData(Array.isArray(data.revenueData) ? data.revenueData : []);
        setAverageScore(Number(data.averageScore || 0));
      } catch (err) {
        console.error("Error loading seller dashboard:", err);
        setError(err?.response?.data?.message || "Failed to load seller dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-black">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-bold">My Dashboard</h1>
        <div className="flex items-center gap-3">
          <button className="rounded-lg bg-gray-200 p-2 transition-colors hover:bg-gray-300">
            <MoreHorizontal size={20} />
          </button>
          <button className="rounded-lg bg-black px-4 py-2 text-white transition-colors hover:bg-orange-500">
            Share
          </button>
          <div className="h-10 w-10 rounded-full border-2 border-black bg-orange-500" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            Loading dashboard...
          </div>
        ) : null}

        <div className="mb-8 flex items-end justify-between">
          <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-1">
            <button className="rounded-md bg-gray-100 px-4 py-1 text-sm font-medium">Details</button>
            <button className="rounded-md px-4 py-1 text-sm hover:bg-gray-50">Withdraw Funds</button>
            <button className="rounded-md px-4 py-1 text-sm hover:bg-gray-50">Preferences</button>
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight">3DPrintings.xyz</h2>
        </div>

        <SellerDashboardTopMetricsRow metrics={metrics.length ? metrics : [
          { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
          { title: "Total reviews", value: "0", subtext: "No change month over month" },
          { title: "All time sales", value: "0", subtext: "No change month over month" },
        ]} />

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SellerDashboardSalesLineChart data={salesData.length ? salesData : [{ day: "N/A", sales: 0 }]} />
          </div>
          <div className="lg:col-span-1">
            <SellerDashboardTopSellingProducts products={products} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SellerDashboardAverageScore score={averageScore} />
          </div>
          <div className="lg:col-span-2">
            <SellerDashboardRevenueBarChart data={revenueData.length ? revenueData : [{ month: "N/A", revenue: 0 }]} />
          </div>
        </div>
      </div>
    </div>
  );
}
