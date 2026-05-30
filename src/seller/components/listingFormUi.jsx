export const FIELD_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none shadow-none transition-colors duration-200 focus:border-orange-500 focus:outline-none focus:ring-0 focus:shadow-none hover:border-orange-200";

export function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

export function FieldLabel({
  htmlFor,
  children,
  required = true,
  className = "mb-1 block text-sm font-semibold text-gray-700 transition-colors duration-300 group-hover:text-orange-600",
}) {
  return (
    <label htmlFor={htmlFor} className={className}>
      {children} {required ? <RequiredMark /> : null}
    </label>
  );
}

export function SectionTitle({ children, required = true }) {
  return (
    <h3 className="text-sm font-semibold text-gray-800">
      {children} {required ? <RequiredMark /> : null}
    </h3>
  );
}
