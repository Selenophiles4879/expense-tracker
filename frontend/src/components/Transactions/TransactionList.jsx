import React, { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import {
  deleteTransactionAPI,
  listTransactionsAPI,
} from "../../services/transactions/transactionService";

import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { listCategoriesAPI } from "../../services/category/categoryService";

const ParchmentFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=EB+Garamond:ital,wght@0,500;1,500;1,600&display=swap');
    .parchment-display { font-family: 'Playfair Display', Georgia, serif; }
    .parchment-script { font-family: 'EB Garamond', Georgia, serif; }
  `}</style>
);

const FlourishGlyph = ({ className = "" }) => (
  <svg
    width="34"
    height="22"
    viewBox="0 0 34 22"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M17 2C17 2 11 9 4 11c7 2 13 9 13 9s6-7 13-9c-7-2-13-9-13-9Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="17" cy="11" r="2.2" fill="currentColor" />
  </svg>
);

const parchmentClipPath =
  "polygon(1% 2%,4% 3%,7% 1%,10% 3%,14% 1%,18% 3%,22% 1%,26% 3%,30% 1%,34% 2%,38% 1%,42% 3%,46% 1%,50% 2%,54% 1%,58% 3%,62% 1%,66% 2%,70% 1%,74% 3%,78% 1%,82% 3%,86% 1%,90% 3%,94% 1%,98% 4%,97% 10%,99% 16%,97% 22%,99% 28%,98% 34%,99% 40%,97% 46%,99% 52%,98% 58%,99% 64%,97% 70%,99% 76%,98% 82%,99% 88%,97% 94%,99% 98%,95% 97%,91% 99%,87% 97%,83% 99%,79% 97%,75% 99%,71% 97%,67% 99%,63% 97%,59% 99%,55% 97%,51% 99%,47% 97%,43% 99%,39% 97%,35% 99%,31% 97%,27% 99%,23% 97%,19% 99%,15% 97%,11% 99%,7% 97%,3% 99%,2% 94%,1% 88%,3% 82%,1% 76%,2% 70%,1% 64%,3% 58%,1% 52%,2% 46%,1% 40%,3% 34%,1% 28%,2% 22%,1% 16%,3% 10%  )";

const ledgerClipPath =
  "polygon(1% 3%,7% 1%,14% 3%,21% 1%,28% 3%,35% 1%,42% 3%,49% 1%,56% 3%,63% 1%,70% 3%,77% 1%,84% 3%,92% 1%,99% 3%,98% 18%,99% 34%,98% 50%,99% 66%,98% 82%,99% 98%,92% 97%,85% 99%,78% 97%,71% 99%,64% 97%,57% 99%,50% 97%,43% 99%,36% 97%,29% 99%,22% 97%,15% 99%,8% 97%,1% 99%,2% 83%,1% 67%,2% 51%,1% 35%,2% 19%,1% 8%)";

const Ornament = ({ className = "" }) => (
  <svg
    viewBox="0 0 180 180"
    fill="none"
    className={`pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M14 160C14 105 18 44 72 28C105 18 134 28 160 8"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      d="M20 137C48 125 57 103 39 82C66 91 92 76 87 49C109 64 136 50 137 25"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path
      d="M38 120C58 111 69 97 61 83C77 87 95 76 95 61"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M25 62C41 47 58 43 76 47C62 32 61 22 66 14"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="28" cy="28" r="6" fill="currentColor" />
    <circle cx="74" cy="47" r="4" fill="currentColor" />
    <circle cx="92" cy="78" r="4" fill="currentColor" />
    <circle cx="48" cy="96" r="3" fill="currentColor" />
    <path d="M14 160V106" stroke="currentColor" strokeWidth="4" />
  </svg>
);

const DecorativeLine = ({ width = "w-20 md:w-32" }) => (
  <div className="flex items-center justify-center gap-3 text-[#57290b]">
    <span className={`h-[2px] ${width} bg-[#57290b]/65`} />
    <svg width="50" height="26" viewBox="0 0 50 26" aria-hidden="true">
      <path
        d="M2 13h15c5 0 7-8 10-8s5 16 0 16-5-8-10-8H2M48 13H33c-5 0-7-8-10-8s-5 16 0 16 5-8 10-8h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="25" cy="13" r="3" fill="currentColor" />
    </svg>
    <span className={`h-[2px] ${width} bg-[#57290b]/65`} />
  </div>
);

const Compass = () => (
  <svg viewBox="0 0 160 160" className="w-full h-full" aria-hidden="true">
    <circle cx="80" cy="80" r="58" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="80" cy="80" r="46" fill="none" stroke="currentColor" strokeWidth="1" />
    <path d="M80 15V145M15 80H145" stroke="currentColor" strokeWidth="1" />
    <path d="M80 20L91 72L80 80L69 72Z" fill="currentColor" />
    <path d="M80 140L69 88L80 80L91 88Z" fill="#b08043" />
    <path d="M140 80L88 69L80 80L88 91Z" fill="currentColor" />
    <path d="M20 80L72 91L80 80L72 69Z" fill="#b08043" />
    <circle cx="80" cy="80" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="80" cy="80" r="5" fill="#4f260b" />
    <text x="80" y="12" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">N</text>
    <text x="80" y="157" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">S</text>
    <text x="151" y="85" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">E</text>
    <text x="9" y="85" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="serif">W</text>
  </svg>
);

const WaxSeal = ({ id }) => (
  <svg viewBox="0 0 150 190" className="w-full h-full" aria-hidden="true">
    <defs>
      <filter id={`wax-shadow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#1a0603" floodOpacity="0.5" />
      </filter>
      <radialGradient id={`wax-${id}`} cx="35%" cy="28%">
        <stop offset="0%" stopColor="#c95a46" />
        <stop offset="42%" stopColor="#8e2d20" />
        <stop offset="100%" stopColor="#4b100b" />
      </radialGradient>
    </defs>
    <g filter={`url(#wax-shadow-${id})`}>
      <path
        d="M75 8C88 4 96 16 108 18C122 19 129 31 125 43C137 53 133 67 126 76C132 89 121 102 110 103C101 116 87 112 77 121C65 116 53 120 43 111C29 111 20 99 24 87C13 77 18 62 24 53C19 39 29 28 42 27C50 15 64 18 75 8Z"
        fill={`url(#wax-${id})`}
        stroke="#54130e"
        strokeWidth="3"
      />
      <circle cx="75" cy="68" r="39" fill="none" stroke="#4b100b" strokeWidth="3" />
      <circle cx="75" cy="68" r="32" fill="none" stroke="#c76a58" strokeWidth="1.5" />
      <path
        d="M75 43V94M75 57L58 46M75 61L92 48M75 70L56 60M75 73L95 60M64 95H86"
        stroke="#45100c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="58" cy="46" r="6" fill="#55140e" />
      <circle cx="92" cy="48" r="6" fill="#55140e" />
      <circle cx="56" cy="60" r="6" fill="#55140e" />
      <circle cx="95" cy="60" r="6" fill="#55140e" />
    </g>

    {/* TWINE */}
    <path
      d="M52 118C46 138 40 156 30 178M46 116C36 134 26 150 14 168"
      stroke="#8a6a3a"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M52 118C46 138 40 156 30 178"
      stroke="#c7a869"
      strokeWidth="1"
      fill="none"
      strokeDasharray="3 3"
    />
  </svg>
);

// Point + tangent along a quadratic Bézier — used to lay real barbs
// along a curved spine, the way an actual flight feather is built.
const quadPoint = (t, p0, c, p1) => {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y,
  };
};

const quadTangent = (t, p0, c, p1) => {
  const mt = 1 - t;
  return {
    x: 2 * mt * (c.x - p0.x) + 2 * t * (p1.x - c.x),
    y: 2 * mt * (c.y - p0.y) + 2 * t * (p1.y - c.y),
  };
};

const buildFeatherBarbs = () => {
  // spine: base of the vane -> feather tip
  const p0 = { x: 30, y: 196 };
  const c = { x: 40, y: 104 };
  const p1 = { x: 93, y: 12 };

  const barbs = [];
  const count = 26;

  for (let i = 1; i < count; i++) {
    const t = i / count;
    const pt = quadPoint(t, p0, c, p1);
    const tan = quadTangent(t, p0, c, p1);
    const tanLen = Math.hypot(tan.x, tan.y) || 1;
    const ux = tan.x / tanLen;
    const uy = tan.y / tanLen;
    // normal (perpendicular) to the spine
    const nx = -uy;
    const ny = ux;

    // envelope: feather is narrow near the tip, widest a bit past
    // the middle, and fades out again toward the base of the vane
    const envelope = Math.sin(Math.PI * Math.pow(t, 0.65)) * (1 - t * 0.25);
    const len = 7 + envelope * 27;

    [1, -1].forEach((side) => {
      // barb sweeps backward (toward the base) and outward, with a
      // gentle forward curl near its tip like a real vane barb
      const backX = -ux;
      const backY = -uy;
      const midX = pt.x + nx * side * len * 0.85 + backX * len * 0.22;
      const midY = pt.y + ny * side * len * 0.85 + backY * len * 0.22;
      const endX = pt.x + nx * side * len * 0.55 + backX * len * 0.92;
      const endY = pt.y + ny * side * len * 0.55 + backY * len * 0.92;

      barbs.push({
        key: `${i}-${side}`,
        d: `M${pt.x.toFixed(1)} ${pt.y.toFixed(1)} Q${midX.toFixed(1)} ${midY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
        opacity: 0.5 + envelope * 0.45,
        width: 0.7 + envelope * 1.3,
        dark: side === -1,
      });
    });
  }

  return barbs;
};

const Quill = () => {
  const barbs = React.useMemo(buildFeatherBarbs, []);

  return (
    <svg viewBox="0 0 120 230" className="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <filter id="quillShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="3" dy="5" stdDeviation="3" floodColor="#1a0d03" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#quillShadow)">
        {/* SHAFT — bare quill below the vane, down to the nib */}
        <path d="M18 224L30 196" stroke="#241206" strokeWidth="2.6" strokeLinecap="round" />

        {/* RACHIS — the central spine the barbs radiate from */}
        <path d="M30 196Q40 104 93 12" stroke="#2a1608" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 196Q40 104 93 12" stroke="#d8b077" strokeWidth="0.7" opacity="0.5" />

        {/* BARBS — individually curved feather strands, light + dark
            alternating for a soft ruffled, sunlit look */}
        {barbs.map((b) => (
          <path
            key={b.key}
            d={b.d}
            stroke={b.dark ? "#3a2008" : "#c99a5c"}
            strokeWidth={b.width}
            strokeLinecap="round"
            opacity={b.opacity}
          />
        ))}

        {/* NIB TIP */}
        <path d="M14 231L18 216L22 231Z" fill="#1c0e04" />
      </g>
    </svg>
  );
};

const TransactionList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    category: "",
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const { data: categoriesData } = useQuery({
    queryFn: listCategoriesAPI,
    queryKey: ["list-categories"],
  });

  const {
    data: transactions,
    isError,
    isLoading,
    error,
  } = useQuery({
    queryFn: () => listTransactionsAPI(filters),
    queryKey: ["list-transactions", filters],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTransactionAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list-transactions"] });
    },
    onError: (error) => {
      console.error(
        "Delete failed:",
        error?.response?.data?.message || error.message
      );
    },
  });

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleUpdateTransaction = (transaction) => {
    navigate(`/transactions/update/${transaction._id}`, {
      state: { transaction },
    });
  };

  const handleTransactionClick = (transaction) => {
    if (transaction.type !== "expense" || !transaction.items?.length) return;
    setSelectedTransactionId((prev) =>
      prev === transaction._id ? null : transaction._id
    );
  };

  return (
    <div className="my-4 p-4 shadow-lg rounded-lg bg-white">
      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          className="p-2 rounded-lg border border-gray-300"
        />

        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
          className="p-2 rounded-lg border border-gray-300"
        />

        <div className="relative">
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="w-full p-2 rounded-lg border border-gray-300 appearance-none"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <ChevronDownIcon className="w-5 h-5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="w-full p-2 rounded-lg border border-gray-300 appearance-none"
          >
            <option value="">All Categories</option>
            <option value="Uncategorized">Uncategorized</option>
            {categoriesData?.map((category) => (
              <option key={category._id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="w-5 h-5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="my-4 p-4 shadow-lg rounded-lg bg-white">
        <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            Filtered Transactions
          </h3>

          {isLoading && <p>Loading transactions...</p>}

          {isError && (
            <p className="text-red-500">
              {error?.response?.data?.message || "Failed to load transactions"}
            </p>
          )}

          {!isLoading && !isError && transactions?.length === 0 && (
            <p>No transactions found.</p>
          )}

          <ul className="list-disc pl-5 space-y-2">
            {transactions?.map((transaction) => (
              <React.Fragment key={transaction._id}>
                {/* TRANSACTION */}
                <li
                  onClick={() => handleTransactionClick(transaction)}
                  className={`bg-white p-3 rounded-md shadow border border-gray-200 flex justify-between items-center ${
                    transaction.type === "expense" && transaction.items?.length
                      ? "cursor-pointer"
                      : ""
                  }`}
                >
                  <div>
                    <span className="font-medium text-gray-600">
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>

                    <span
                      className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.type === "income"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type.charAt(0).toUpperCase() +
                        transaction.type.slice(1)}
                    </span>

                    <span className="ml-2 text-gray-800">
                      {transaction.category} - ₹
                      {transaction.amount.toLocaleString()}
                    </span>

                    <span className="text-sm text-gray-600 italic ml-2">
                      {transaction.description}
                    </span>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateTransaction(transaction);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                      title="Edit transaction"
                    >
                      <FaEdit />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(transaction._id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title="Delete transaction"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </li>

                {/* =====================================================
                    ANCIENT PARCHMENT — EXPANDED ITEM DETAILS
                    Transaction functionality remains unchanged.
                ===================================================== */}
                {selectedTransactionId === transaction._id &&
                  transaction.type === "expense" &&
                  transaction.items?.length > 0 && (
                    <li className="list-none w-full -ml-5 md:-ml-0">
                      <div
                        className="relative isolate w-full overflow-hidden text-[#351806] shadow-[0_18px_45px_rgba(58,28,5,0.45)]"
                        style={{ clipPath: parchmentClipPath }}
                      >
                        <ParchmentFonts />

                        {/* PAPER BASE */}
                        <div className="absolute inset-0 -z-30 bg-[radial-gradient(ellipse_at_center,#f8dda5_0%,#edc887_36%,#dfb36b_68%,#a9682d_100%)]" />

                        {/* PAPER GRAIN */}
                        <svg className="absolute inset-0 -z-20 h-full w-full opacity-[0.20] pointer-events-none" preserveAspectRatio="none">
                          <filter id={`paper-noise-${transaction._id}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="5" seed="27" />
                            <feColorMatrix type="saturate" values="0" />
                            <feComponentTransfer>
                              <feFuncA type="table" tableValues="0 0.42" />
                            </feComponentTransfer>
                          </filter>
                          <rect width="100%" height="100%" filter={`url(#paper-noise-${transaction._id})`} />
                        </svg>

                        {/* SOFT PAPER LIGHT */}
                        <div className="absolute inset-[3%] -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,238,188,.58),rgba(245,208,143,.16)_58%,transparent_83%)]" />

                        {/* BURNT VIGNETTE */}
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_46%,rgba(118,60,13,.14)_62%,rgba(84,37,5,.48)_80%,rgba(38,14,2,.92)_100%)]" />
                        <div className="absolute inset-0 -z-10 shadow-[inset_0_0_55px_rgba(50,19,2,.85)]" />
                        <div className="absolute inset-0 -z-10 shadow-[inset_0_0_14px_rgba(30,10,1,.6)]" />

                        {/* AGED STAINS */}
                        <div className="absolute left-[4%] top-[36%] h-24 w-32 rounded-full bg-[#704018]/20 blur-xl rotate-[-18deg] pointer-events-none" />
                        <div className="absolute right-[5%] top-[41%] h-32 w-28 rounded-full bg-[#704018]/18 blur-xl rotate-[12deg] pointer-events-none" />
                        <div className="absolute left-[12%] bottom-[15%] h-20 w-28 rounded-full bg-[#704018]/15 blur-xl pointer-events-none" />
                        <div className="absolute right-[20%] bottom-[18%] h-20 w-24 rounded-full bg-[#704018]/12 blur-xl pointer-events-none" />

                        {/* DOUBLE INNER BORDER */}
                        <div className="absolute inset-5 md:inset-7 border border-[#60300c]/35 pointer-events-none" />
                        <div className="absolute inset-7 md:inset-9 border border-[#60300c]/10 pointer-events-none" />

                        {/* CORNERS */}
                        <Ornament className="absolute left-2 top-2 w-28 h-28 md:w-44 md:h-44 text-[#512408]/90" />
                        <Ornament className="absolute right-2 top-2 w-28 h-28 md:w-44 md:h-44 text-[#512408]/90 scale-x-[-1]" />
                        <Ornament className="absolute right-2 bottom-1 w-32 h-32 md:w-48 md:h-48 text-[#512408]/90 scale-x-[-1] scale-y-[-1]" />

                        {/* COMPASS */}
                        <div className="absolute left-[5%] top-[13%] hidden sm:block w-24 h-24 md:w-36 md:h-36 text-[#70451f]/45 pointer-events-none">
                          <Compass />
                        </div>

                        {/* RIGHT QUOTE */}
                        <div className="absolute right-[5%] top-[12%] hidden lg:block w-32 text-center parchment-script italic font-semibold text-[#2e1305] text-base leading-6 opacity-100 drop-shadow-[1px_1.5px_0px_rgba(255,240,210,0.5)] pointer-events-none">
                          “Small
                          <br />
                          Expenses
                          <br />
                          Build
                          <br />
                          a Better
                          <br />
                          Tomorrow”
                        </div>

                        <div className="relative z-20 px-7 pt-6 pb-8 md:px-12 md:pt-8 md:pb-12">
                          {/* TITLE */}
                          <div className="text-center px-2 md:px-28">
                            <h4 className="parchment-display mt-1 flex items-center justify-center gap-3 md:gap-5 italic font-bold text-4xl sm:text-5xl md:text-7xl tracking-tight text-[#3a1705] drop-shadow-[1px_2px_1px_rgba(70,30,5,.28)]">
                              <FlourishGlyph className="hidden sm:block w-6 h-4 md:w-9 md:h-6 shrink-0 text-[#5a2c0c]/80" />
                              Expense Items
                              <FlourishGlyph className="hidden sm:block w-6 h-4 md:w-9 md:h-6 shrink-0 text-[#5a2c0c]/80 scale-x-[-1]" />
                            </h4>

                            <p className="parchment-script mt-1 italic text-lg md:text-3xl text-[#4a240d]">
                              A record of purchased items
                            </p>

                            <div className="mt-3">
                              <DecorativeLine width="w-16 md:w-24" />
                            </div>

                            <div className="parchment-script mt-2 text-xs md:text-sm uppercase tracking-[0.38em] font-bold text-[#60310e]">
                              {transaction.category}
                            </div>
                          </div>

                          {/* LEDGER */}
                          <div
                            className="relative mx-auto mt-7 w-[96%] sm:w-[90%] md:w-[78%] lg:w-[74%] px-5 md:px-10 pt-2 pb-1 bg-[radial-gradient(ellipse_at_center,#f0ce91,#e3b96f)] border border-[#65320c] shadow-[0_8px_16px_rgba(62,28,5,.35),inset_0_0_28px_rgba(75,32,5,.22)]"
                            style={{ clipPath: ledgerClipPath }}
                          >
                            <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_18%_28%,#70451f_0_1px,transparent_3px),radial-gradient(circle_at_74%_62%,#70451f_0_1px,transparent_4px),radial-gradient(circle_at_48%_82%,#70451f_0_1px,transparent_3px)]" />

                            <table className="parchment-script relative w-full text-base sm:text-lg md:text-2xl text-[#351b0b]">
                              <thead>
                                <tr className="border-b-2 border-[#5b2a08]/80">
                                  <th className="py-3 text-left italic font-bold w-[16%]">S.No.</th>
                                  <th className="py-3 text-left italic font-bold">Item</th>
                                  <th className="py-3 text-right italic font-bold w-[22%]">Price</th>
                                </tr>
                              </thead>

                              <tbody>
                                {transaction.items.map((item, index) => (
                                  <tr key={item._id || index} className="border-b border-[#75451f]/35 hover:bg-[#75451f]/10 transition-colors">
                                    <td className="py-3 md:py-3.5">{index + 1}.</td>
                                    <td className="py-3 md:py-3.5 italic font-medium break-words">{item.name}</td>
                                    <td className="py-3 md:py-3.5 text-right italic font-medium whitespace-nowrap">
                                      ₹{Number(item.price || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}

                                <tr>
                                  <td colSpan="2" className="pt-5 pb-3 text-2xl md:text-4xl italic font-bold">
                                    <span className="mr-3">〰</span>
                                    Total
                                  </td>
                                  <td className="pt-5 pb-3 text-right text-2xl md:text-4xl italic font-bold whitespace-nowrap">
                                    ₹
                                    {transaction.items
                                      .reduce((total, item) => total + Number(item.price || 0), 0)
                                      .toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* LOWER DECORATION */}
                          <div className="mt-7">
                            <DecorativeLine width="w-16 md:w-28" />
                          </div>

                          {/* FOOTER */}
                          <div className="relative mt-4 min-h-[145px] md:min-h-[175px]">
                            {/* WAX SEAL */}
                            <div className="absolute left-[0%] bottom-0 w-24 h-32 md:w-36 md:h-48 -rotate-6 z-40 pointer-events-none">
                              <WaxSeal id={transaction._id} />
                            </div>

                            {/* LEFT QUOTE */}
                            <div className="absolute left-[18%] bottom-4 hidden md:block parchment-script italic font-semibold text-[#2e1305] text-lg leading-7 drop-shadow-[1px_1.5px_0px_rgba(255,240,210,0.5)]">
                              “Good Food
                              <br />
                              &nbsp;&nbsp;Brighter Days”
                            </div>

                            {/* RIGHT QUOTE */}
                            <div className="absolute right-[16%] bottom-4 hidden md:block text-right parchment-script italic font-semibold text-[#2e1305] text-lg leading-7 drop-shadow-[1px_1.5px_0px_rgba(255,240,210,0.5)]">
                              Spend Wisely
                              <br />
                              Live Better
                            </div>

                            {/* QUILL */}
                            <div className="absolute right-[0%] bottom-[-5px] w-16 h-28 md:w-24 md:h-48 rotate-[8deg] z-40 pointer-events-none">
                              <Quill />
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
              </React.Fragment>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
