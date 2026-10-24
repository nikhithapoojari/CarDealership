import type { SearchParams } from "../types";

export type Filters = Required<SearchParams>;
export const EMPTY_FILTERS: Filters = { make: "", model: "", category: "", min_price: "", max_price: "" };

const inputClass =
  "mt-1 w-full rounded-sm border border-ink/20 bg-white px-3 py-2 text-sm placeholder:text-mute/70";

const FIELDS: { key: keyof Filters; label: string; type?: "number"; placeholder: string }[] = [
  { key: "make", label: "Make", placeholder: "Toyota" },
  { key: "model", label: "Model", placeholder: "Corolla" },
  { key: "category", label: "Category", placeholder: "SUV" },
  { key: "min_price", label: "Min price", type: "number", placeholder: "10000" },
  { key: "max_price", label: "Max price", type: "number", placeholder: "40000" },
];

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
}

export default function SearchFilters({ value, onChange }: Props) {
  const active = Object.values(value).some((v) => v !== "");

  return (
    <form
      role="search"
      aria-label="Filter vehicles"
      onSubmit={(e) => e.preventDefault()}
      className="rounded-md bg-white p-4 ring-1 ring-ink/10"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <label key={key} className="text-sm font-medium">
            {label}
            <input
              className={inputClass}
              type={type ?? "text"}
              min={type === "number" ? 0 : undefined}
              inputMode={type === "number" ? "numeric" : undefined}
              placeholder={placeholder}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="mt-3 text-sm font-semibold underline underline-offset-4"
        >
          Clear filters
        </button>
      )}
    </form>
  );
}
