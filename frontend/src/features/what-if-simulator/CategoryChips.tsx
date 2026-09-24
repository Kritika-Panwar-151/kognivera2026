interface CategoryOption {
  name: string
  icon: string
}

const categories: CategoryOption[] = [
  { name: 'Food', icon: '🍽️' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Accommodation', icon: '🏨' },
  { name: 'Activities', icon: '⭐' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Other', icon: '📦' },
]

interface Props {
  selectedCategory: string
  onSelect: (category: string) => void
}

export default function CategoryChips({ selectedCategory, onSelect }: Props) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        Expense Category
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.map((c) => {
          const isSelected = selectedCategory === c.name
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelect(c.name)}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                isSelected
                  ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs font-bold'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              <span className="text-base shrink-0">{c.icon}</span>
              <span className="truncate">{c.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
