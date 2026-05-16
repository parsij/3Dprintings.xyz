export default function SellerDashboardTopSellingProducts({ products }) {
  return (
    <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-md font-bold text-black">Top selling products</h3>
      <div className="flex flex-col gap-5">
        {products.map((product, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-orange-500 bg-gray-200">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-orange-100" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-black">{product.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                ${product.price} x {product.sales} = <span className="font-bold text-black">${product.total}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}