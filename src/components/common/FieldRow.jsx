export default function FieldRow({ label, type = 'text', id, ...props }) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        required
        type={type}
        {...props}
        className="w-full rounded-lg border border-line px-3 py-2 focus:border-blood-600 focus:outline-none"
      />
    </div>
  );
}
