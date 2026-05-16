export default function SellerDashboardAverageScore({ score }) {
  const fillPercentage = Math.min(Math.max((score / 5) * 100, 0), 100);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-md font-bold text-black">Overall Product Rating</h3>
      <div className="flex grow items-center justify-center gap-6">
        <svg width="150" height="150" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset={`${fillPercentage}%`} stopColor="#E5DC40" />
              <stop offset={`${fillPercentage}%`} stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path
            fill="url(#star-gradient)"
            stroke="#000000"
            strokeWidth="0.5"
            strokeLinejoin="round"
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
        <span className="text-7xl font-bold text-black">{score.toFixed(2)}</span>
      </div>
      <div className="text-sm text-gray-600"> The average rating of all your products combined.</div>
    </div>
  );
}
