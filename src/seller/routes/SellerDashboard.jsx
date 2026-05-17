import { useEffect, useState } from "react";
import SellerDashboardTopMetricsRow from "../components/SellerDashboardTopMetricsRow.jsx";
import SellerDashboardSalesLineChart from "../components/SellerDashboardSalesLineChart.jsx";
import SellerDashboardTopSellingProducts from "../components/SellerDashboardTopSellingProducts.jsx";
import SellerDashboardAverageScore from "../components/SellerDashboardAverageScore.jsx";
import SellerDashboardRevenueBarChart from "../components/SellerDashboardRevenueBarChart.jsx";
import { getSellerDashboard } from "../services/sellerDashboardService.js";
import SideMenu from "../../components/SideMenu.jsx";
import SellerNavBar from "../components/SellerNavBar.jsx";

export default function SellerDashboard() {
  const [metrics, setMetrics] = useState([
    { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
    { title: "Total reviews", value: "0", subtext: "No change month over month" },
    { title: "All time sales", value: "0", subtext: "No change month over month" },
  ]);
  const [salesData, setSalesData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [averageScore, setAverageScore] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError("");
      try {
        const data = await getSellerDashboard();
        if (cancelled) return;
        setMetrics(Array.isArray(data.metrics) ? data.metrics : []);
        setSalesData(Array.isArray(data.salesData) ? data.salesData : []);
        setTopProductsData(Array.isArray(data.products) ? data.products : []);
        setRevenueData(Array.isArray(data.revenueData) ? data.revenueData : []);
        setAverageScore(Number(data.averageScore || 0));
      } catch (err) {
        if (cancelled) return;
        setDashboardError(err?.response?.data?.message || "Failed to load seller dashboard.");
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
      <div className="min-h-screen bg-[#f2f2f2]">
        <SellerNavBar pageName={"Dashboard"} />
        <SideMenu role={"seller"} title={"Seller Options"} />

        {/* Replaced arbitrary section layout with your normalized shell wrappers */}
        <main className="max-w-7xl mx-auto px-4 lg:px-[5vw] pt-24 pb-12">

          {/* Page Title Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Performance Overview</h1>
          </div>

          {dashboardError ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{dashboardError}</div>
          ) : null}

          {dashboardLoading ? (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 animate-pulse">Loading analytics overview...</div>
          ) : null}

          <SellerDashboardTopMetricsRow metrics={metrics.length ? metrics : [
            { title: "Total revenue of this month", value: "$0.00", subtext: "No change month over month" },
            { title: "Total reviews", value: "0", subtext: "No change month over month" },
            { title: "All time sales", value: "0", subtext: "No change month over month" },
          ]} />

          <div className="mb-6 mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SellerDashboardSalesLineChart data={salesData.length ? salesData : [{ day: "N/A", sales: 0 }]} />
            </div>
            <div className="lg:col-span-1">
              <SellerDashboardTopSellingProducts products={topProductsData} />
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
        </main>
      </div>
  );
}