export default function ListingFormSection({ title, description, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {title ? (
        <div className="mb-4 border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
