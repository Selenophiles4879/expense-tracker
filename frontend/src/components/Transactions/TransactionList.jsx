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

const TransactionList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  //! Selected transaction for displaying items
  const [selectedTransactionId, setSelectedTransactionId] =
    useState(null);

  //! Filtering state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    category: "",
  });

  //! Handle Filter Change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  //! Fetch categories
  const { data: categoriesData } = useQuery({
    queryFn: listCategoriesAPI,
    queryKey: ["list-categories"],
  });

  //! Fetch transactions
  const {
    data: transactions,
    isError,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: () => listTransactionsAPI(filters),
    queryKey: ["list-transactions", filters],
  });

  //! DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTransactionAPI(id),

    onSuccess: () => {
  // Refresh transaction list and Dashboard chart
  queryClient.invalidateQueries({
    queryKey: ["list-transactions"],
  });

  refetch();
},

    onError: (error) => {
      console.error(
        "Delete failed:",
        error?.response?.data?.message || error.message
      );
    },
  });

  //! Delete handler
  const handleDelete = (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this transaction?"
      )
    ) {
      return;
    }

    deleteMutation.mutate(id);
  };

  //! Update handler
  const handleUpdateTransaction = (transaction) => {
    navigate(`/transactions/update/${transaction._id}`, {
      state: {
        transaction,
      },
    });
  };

  //! Handle transaction click
  const handleTransactionClick = (transaction) => {
    // Only expense transactions with items can be expanded
    if (
      transaction.type !== "expense" ||
      !transaction.items?.length
    ) {
      return;
    }

    // Clicking the same transaction collapses it
    setSelectedTransactionId((prev) =>
      prev === transaction._id ? null : transaction._id
    );
  };

  return (
    <div className="my-4 p-4 shadow-lg rounded-lg bg-white">
      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Start Date */}
        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={handleFilterChange}
          className="p-2 rounded-lg border-gray-300"
        />

        {/* End Date */}
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={handleFilterChange}
          className="p-2 rounded-lg border-gray-300"
        />

        {/* Type */}
        <div className="relative">
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="w-full p-2 rounded-lg border-gray-300 appearance-none"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <ChevronDownIcon className="w-5 h-5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>

        {/* Category */}
        <div className="relative">
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="w-full p-2 rounded-lg border-gray-300 appearance-none"
          >
            <option value="">All Categories</option>
            <option value="Uncategorized">Uncategorized</option>

            {categoriesData?.map((category) => (
              <option key={category._id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>

          <ChevronDownIcon className="w-5 h-5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="my-4 p-4 shadow-lg rounded-lg bg-white">
        <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            Filtered Transactions
          </h3>

          {/* LOADING */}
          {isLoading && <p>Loading transactions...</p>}

          {/* ERROR */}
          {isError && (
            <p className="text-red-500">
              {error?.response?.data?.message ||
                "Failed to load transactions"}
            </p>
          )}

          {/* EMPTY */}
          {!isLoading &&
            !isError &&
            transactions?.length === 0 && (
              <p>No transactions found.</p>
            )}

          {/* TRANSACTION LIST */}
          <ul className="list-disc pl-5 space-y-2">
            {transactions?.map((transaction) => (
              <React.Fragment key={transaction._id}>
                {/* TRANSACTION */}
                <li
                  onClick={() =>
                    handleTransactionClick(transaction)
                  }
                  className={`bg-white p-3 rounded-md shadow border border-gray-200 flex justify-between items-center ${
                    transaction.type === "expense" &&
                    transaction.items?.length
                      ? "cursor-pointer"
                      : ""
                  }`}
                >
                  <div>
                    {/* DATE */}
                    <span className="font-medium text-gray-600">
                      {new Date(
                        transaction.date
                      ).toLocaleDateString()}
                    </span>

                    {/* TYPE */}
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

                    {/* CATEGORY + AMOUNT */}
                    <span className="ml-2 text-gray-800">
                      {transaction.category} - ₹
                      {transaction.amount.toLocaleString()}
                    </span>

                    {/* DESCRIPTION */}
                    <span className="text-sm text-gray-600 italic ml-2">
                      {transaction.description}
                    </span>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex space-x-3">
                    {/* EDIT */}
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

                    {/* DELETE */}
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
                
                {/* EXPANDED ITEM DETAILS
                {selectedTransactionId === transaction._id &&
                  transaction.type === "expense" &&
                  transaction.items?.length > 0 && (
                    <li className="list-none">
                      <div className="bg-white p-3 rounded-md shadow border border-gray-200">
                        <table className="w-full text-base text-gray-800">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 font-semibold text-gray-700">
                                S.No.
                              </th>

                              <th className="text-left py-2 font-semibold text-gray-700">
                                Item
                              </th>

                              <th className="text-right py-2 font-semibold text-gray-700">
                                Price
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {/* ITEMS 
                            {transaction.items.map(
                              (item, index) => (
                                <tr
                                  key={item._id || index}
                                  className="border-b border-gray-100"
                                >
                                  <td className="py-2">
                                    {index + 1}
                                  </td>

                                  <td className="py-2">
                                    {item.name}
                                  </td>

                                  <td className="py-2 text-right">
                                    ₹
                                    {Number(
                                      item.price
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              )
                            )}

                            {/* TOTAL 
                            <tr>
                              <td
                                colSpan="2"
                                className="pt-3 font-semibold text-gray-800"
                              >
                                Total
                              </td>

                              <td className="pt-3 text-right font-semibold text-gray-800">
                                ₹
                                {transaction.items
                                  .reduce(
                                    (total, item) =>
                                      total +
                                      Number(item.price || 0),
                                    0
                                  )
                                  .toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </li>
                  )}
                */}
                
                {/* Parchment view */}

{/* ================================================================
    ANCIENT PARCHMENT — EXPANDED ITEM DETAILS
    FUNCTIONALITY PRESERVED
================================================================ */}

{selectedTransactionId === transaction._id &&
  transaction.type === "expense" &&
  transaction.items?.length > 0 && (
    <li className="list-none w-full">

      {/* ============================================================
          MAIN PARCHMENT
      ============================================================ */}

      <div
        className="
          relative
          w-full
          min-h-[820px]
          overflow-hidden
          isolate

          px-4
          py-8

          md:px-8
          md:py-10

          text-[#3a1705]

          shadow-[0_18px_45px_rgba(58,28,5,0.48)]

          bg-[#e8c07c]

          /* IRREGULAR OUTER SHAPE */
          [clip-path:polygon(
            1%_2%,4%_3%,7%_1%,11%_3%,15%_1%,19%_3%,23%_1%,
            27%_3%,31%_1%,35%_3%,39%_1%,43%_2%,47%_1%,51%_3%,
            55%_1%,59%_3%,63%_1%,67%_2%,71%_1%,75%_3%,79%_1%,
            83%_3%,87%_1%,91%_3%,95%_1%,99%_4%,

            98%_10%,99%_16%,97%_22%,99%_28%,98%_34%,99%_40%,
            97%_46%,99%_52%,98%_58%,99%_64%,97%_70%,99%_76%,
            98%_82%,99%_88%,97%_94%,99%_98%,

            95%_97%,91%_99%,87%_97%,83%_99%,79%_97%,75%_99%,
            71%_97%,67%_99%,63%_97%,59%_99%,55%_97%,51%_99%,
            47%_97%,43%_99%,39%_97%,35%_99%,31%_97%,27%_99%,
            23%_97%,19%_99%,15%_97%,11%_99%,7%_97%,3%_99%,

            2%_94%,1%_88%,3%_82%,1%_76%,2%_70%,1%_64%,
            3%_58%,1%_52%,2%_46%,1%_40%,3%_34%,1%_28%,
            2%_22%,1%_16%,3%_10%
          )]
        "
      >

        {/* ==========================================================
            PARCHMENT BASE
        ========================================================== */}

        <div
          className="
            absolute
            inset-0
            -z-30
            pointer-events-none

            bg-[radial-gradient(
              ellipse_at_center,
              #f6dca4_0%,
              #efcc8c_30%,
              #e4b971_58%,
              #c88c43_82%,
              #754014_100%
            )]
          "
        />

        {/* ==========================================================
            OLD PAPER TEXTURE
        ========================================================== */}

        <svg
          className="
            absolute
            inset-0
            w-full
            h-full
            -z-20
            opacity-30
            pointer-events-none
          "
          preserveAspectRatio="none"
        >
          <filter id={`parchmentNoise-${transaction._id}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018"
              numOctaves="5"
              seed="17"
            />

            <feColorMatrix
              type="saturate"
              values="0"
            />

            <feComponentTransfer>
              <feFuncA
                type="table"
                tableValues="0 0.42"
              />
            </feComponentTransfer>
          </filter>

          <rect
            width="100%"
            height="100%"
            filter={`url(#parchmentNoise-${transaction._id})`}
          />
        </svg>

        {/* ==========================================================
            CENTER PAPER GLOW
        ========================================================== */}

        <div
          className="
            absolute
            inset-[4%]
            -z-10
            pointer-events-none

            bg-[radial-gradient(
              ellipse_at_center,
              rgba(255,232,175,0.58),
              rgba(239,199,125,0.22)_55%,
              transparent_82%
            )]

            blur-[1px]
          "
        />

        {/* ==========================================================
            DARK BURNT EDGES
        ========================================================== */}

        <div
          className="
            absolute
            inset-0
            -z-10
            pointer-events-none

            bg-[radial-gradient(
              ellipse_at_center,
              transparent_53%,
              rgba(117,61,15,0.08)_66%,
              rgba(91,43,7,0.28)_82%,
              rgba(53,22,3,0.72)_100%
            )]
          "
        />

        {/* ==========================================================
            EXTRA EDGE BURN
        ========================================================== */}

        <div
          className="
            absolute
            inset-0
            -z-10
            pointer-events-none

            shadow-[inset_0_0_35px_rgba(71,31,4,0.7)]
          "
        />

        {/* ==========================================================
            AGED STAINS
        ========================================================== */}

        <div
          className="
            absolute
            left-[4%]
            top-[38%]

            w-32
            h-24

            rounded-full

            bg-[#704018]/20
            blur-xl

            rotate-[-20deg]

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            right-[5%]
            top-[43%]

            w-28
            h-36

            rounded-full

            bg-[#704018]/16
            blur-xl

            rotate-[15deg]

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            left-[14%]
            bottom-[12%]

            w-24
            h-20

            rounded-full

            bg-[#74451d]/15
            blur-xl

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            right-[22%]
            bottom-[18%]

            w-20
            h-20

            rounded-full

            bg-[#704018]/10
            blur-lg

            pointer-events-none
          "
        />

        {/* ==========================================================
            INNER BORDER
        ========================================================== */}

        <div
          className="
            absolute
            inset-[24px]

            border
            border-[#69350e]/30

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            inset-[30px]

            border
            border-[#69350e]/10

            pointer-events-none
          "
        />

        {/* ==========================================================
            TOP LEFT ORNAMENT
        ========================================================== */}

        <svg
          className="
            absolute
            top-2
            left-3

            w-36
            h-36

            md:w-44
            md:h-44

            text-[#57290a]

            opacity-90

            pointer-events-none
          "
          viewBox="0 0 180 180"
          fill="none"
        >

          <path
            d="
              M14 160
              C14 105 18 44 72 28
              C105 18 134 28 160 8
            "
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            d="
              M20 137
              C48 125 57 103 39 82
              C66 91 92 76 87 49
              C109 64 136 50 137 25
            "
            stroke="currentColor"
            strokeWidth="2.5"
          />

          <path
            d="
              M38 120
              C58 111 69 97 61 83
              C77 87 95 76 95 61
            "
            stroke="currentColor"
            strokeWidth="2"
          />

          <path
            d="
              M25 62
              C41 47 58 43 76 47
              C62 32 61 22 66 14
            "
            stroke="currentColor"
            strokeWidth="2"
          />

          <circle
            cx="28"
            cy="28"
            r="6"
            fill="currentColor"
          />

          <circle
            cx="74"
            cy="47"
            r="4"
            fill="currentColor"
          />

          <circle
            cx="92"
            cy="78"
            r="4"
            fill="currentColor"
          />

          <circle
            cx="48"
            cy="96"
            r="3"
            fill="currentColor"
          />

          <path
            d="M14 160V106"
            stroke="currentColor"
            strokeWidth="4"
          />
        </svg>

        {/* ==========================================================
            TOP RIGHT ORNAMENT
        ========================================================== */}

        <svg
          className="
            absolute
            top-2
            right-3

            w-36
            h-36

            md:w-44
            md:h-44

            text-[#57290a]

            opacity-90

            scale-x-[-1]

            pointer-events-none
          "
          viewBox="0 0 180 180"
          fill="none"
        >

          <path
            d="
              M14 160
              C14 105 18 44 72 28
              C105 18 134 28 160 8
            "
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            d="
              M20 137
              C48 125 57 103 39 82
              C66 91 92 76 87 49
              C109 64 136 50 137 25
            "
            stroke="currentColor"
            strokeWidth="2.5"
          />

          <path
            d="
              M38 120
              C58 111 69 97 61 83
              C77 87 95 76 95 61
            "
            stroke="currentColor"
            strokeWidth="2"
          />

          <circle
            cx="28"
            cy="28"
            r="6"
            fill="currentColor"
          />

          <circle
            cx="74"
            cy="47"
            r="4"
            fill="currentColor"
          />
        </svg>

        {/* ==========================================================
            BOTTOM RIGHT ORNAMENT
        ========================================================== */}

        <svg
          className="
            absolute
            bottom-1
            right-3

            w-40
            h-40

            md:w-48
            md:h-48

            text-[#57290a]

            opacity-90

            scale-x-[-1]
            scale-y-[-1]

            pointer-events-none
          "
          viewBox="0 0 180 180"
          fill="none"
        >

          <path
            d="
              M14 160
              C14 105 18 44 72 28
              C105 18 134 28 160 8
            "
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            d="
              M20 137
              C48 125 57 103 39 82
              C66 91 92 76 87 49
              C109 64 136 50 137 25
            "
            stroke="currentColor"
            strokeWidth="2.5"
          />

          <path
            d="
              M38 120
              C58 111 69 97 61 83
              C77 87 95 76 95 61
            "
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>

        {/* ==========================================================
            COMPASS
        ========================================================== */}

        <div
          className="
            absolute
            left-[7%]
            top-[15%]

            w-28
            h-28

            md:w-36
            md:h-36

            opacity-45

            pointer-events-none
          "
        >

          <svg
            viewBox="0 0 160 160"
            className="w-full h-full"
          >

            <circle
              cx="80"
              cy="80"
              r="58"
              fill="none"
              stroke="#70451f"
              strokeWidth="2"
            />

            <circle
              cx="80"
              cy="80"
              r="46"
              fill="none"
              stroke="#70451f"
              strokeWidth="1"
            />

            <circle
              cx="80"
              cy="80"
              r="9"
              fill="none"
              stroke="#70451f"
              strokeWidth="2"
            />

            <path
              d="M80 15V145M15 80H145"
              stroke="#70451f"
              strokeWidth="1"
            />

            <path
              d="M80 20L91 72L80 80L69 72Z"
              fill="#70451f"
            />

            <path
              d="M80 140L69 88L80 80L91 88Z"
              fill="#b08043"
            />

            <path
              d="M140 80L88 69L80 80L88 91Z"
              fill="#70451f"
            />

            <path
              d="M20 80L72 91L80 80L72 69Z"
              fill="#b08043"
            />

            <circle
              cx="80"
              cy="80"
              r="5"
              fill="#4f260b"
            />

            <text
              x="80"
              y="12"
              textAnchor="middle"
              fontSize="15"
              fill="#70451f"
              fontFamily="serif"
            >
              N
            </text>

            <text
              x="80"
              y="157"
              textAnchor="middle"
              fontSize="15"
              fill="#70451f"
              fontFamily="serif"
            >
              S
            </text>

            <text
              x="151"
              y="85"
              textAnchor="middle"
              fontSize="15"
              fill="#70451f"
              fontFamily="serif"
            >
              E
            </text>

            <text
              x="9"
              y="85"
              textAnchor="middle"
              fontSize="15"
              fill="#70451f"
              fontFamily="serif"
            >
              W
            </text>

          </svg>
        </div>

        {/* ==========================================================
            RIGHT QUOTE
        ========================================================== */}

        <div
          className="
            absolute

            right-[5%]
            top-[12%]

            hidden
            lg:block

            w-36

            text-center

            font-serif
            italic

            text-[#4d2810]

            text-base
            md:text-lg

            leading-7

            opacity-90
          "
        >

          <p>
            “Small
            <br />
            Expenses
            <br />
            Build
            <br />
            a Better
            <br />
            Tomorrow”
          </p>

        </div>

        {/* ==========================================================
            MAIN CONTENT
        ========================================================== */}

        <div className="relative z-20">

          {/* ========================================================
              TOP DECORATIVE LINE
          ======================================================== */}

          <div
            className="
              flex
              items-center
              justify-center
              gap-5

              mb-1
            "
          >

            <div
              className="
                h-[2px]
                w-20
                md:w-32
                bg-[#57290b]/70
              "
            />

            <svg
              width="58"
              height="30"
              viewBox="0 0 58 30"
              className="text-[#57290b]"
            >

              <path
                d="
                  M2 15H19
                  C24 15 26 5 29 5
                  C32 5 34 25 29 25
                  C26 25 24 15 19 15
                  H2
                "
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />

              <path
                d="
                  M56 15H39
                  C34 15 32 5 29 5
                  C26 5 24 25 29 25
                  C32 25 34 15 39 15
                  H56
                "
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />

              <circle
                cx="29"
                cy="15"
                r="3"
                fill="currentColor"
              />

            </svg>

            <div
              className="
                h-[2px]
                w-20
                md:w-32
                bg-[#57290b]/70
              "
            />

          </div>

          {/* ========================================================
              TITLE
          ======================================================== */}

          <div className="text-center">

            <h4
              className="
                mt-1

                text-5xl
                md:text-7xl

                font-serif
                italic
                font-bold

                tracking-tight

                text-[#3a1705]

                drop-shadow-[1px_2px_1px_rgba(70,30,5,.25)]
              "
            >
              Expense Items
            </h4>

            <p
              className="
                mt-1

                text-xl
                md:text-3xl

                font-serif
                italic

                text-[#4a240d]
              "
            >
              A record of purchased items
            </p>

            {/* ======================================================
                TITLE ORNAMENT
            ====================================================== */}

            <div
              className="
                flex
                items-center
                justify-center
                gap-4

                mt-3
              "
            >

              <div
                className="
                  h-[2px]
                  w-20
                  md:w-28

                  bg-[#62300d]/60
                "
              />

              <svg
                width="45"
                height="28"
                viewBox="0 0 45 28"
                className="text-[#62300d]"
              >

                <path
                  d="
                    M22 2
                    C22 2 16 11 8 14
                    C16 17 22 26 22 26
                    C22 26 29 17 37 14
                    C29 11 22 2 22 2Z
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <circle
                  cx="22"
                  cy="14"
                  r="3"
                  fill="currentColor"
                />

              </svg>

              <div
                className="
                  h-[2px]
                  w-20
                  md:w-28

                  bg-[#62300d]/60
                "
              />

            </div>

            {/* ======================================================
                CATEGORY
            ====================================================== */}

            <div className="mt-2">

              <span
                className="
                  text-xs

                  uppercase

                  tracking-[0.38em]

                  font-serif
                  font-bold

                  text-[#60310e]
                "
              >
                {transaction.category}
              </span>

            </div>

          </div>

          {/* ========================================================
              INNER LEDGER
          ======================================================== */}

          <div
            className="
              relative

              mx-auto

              mt-6

              w-[92%]
              md:w-[76%]

              px-5
              md:px-10

              pt-2
              pb-1

              bg-[#e7bd76]

              border
              border-[#65320c]

              shadow-[0_7px_14px_rgba(62,28,5,.34),inset_0_0_25px_rgba(75,32,5,.22)]

              [clip-path:polygon(
                1%_3%,7%_1%,14%_3%,21%_1%,28%_3%,35%_1%,42%_3%,
                49%_1%,56%_3%,63%_1%,70%_3%,77%_1%,84%_3%,92%_1%,99%_3%,

                98%_16%,99%_31%,98%_46%,99%_61%,98%_76%,99%_98%,

                91%_96%,84%_99%,77%_97%,70%_99%,63%_97%,56%_99%,
                49%_97%,42%_99%,35%_97%,28%_99%,21%_97%,14%_99%,
                7%_97%,1%_99%,

                2%_83%,1%_68%,2%_53%,1%_38%,2%_23%,1%_8%
              )]
            "
          >

            {/* LEDGER TEXTURE */}

            <div
              className="
                absolute
                inset-0

                pointer-events-none

                opacity-25

                bg-[radial-gradient(circle_at_18%_28%,#70451f_0_1px,transparent_3px),radial-gradient(circle_at_74%_62%,#70451f_0_1px,transparent_4px),radial-gradient(circle_at_48%_82%,#70451f_0_1px,transparent_3px)]
              "
            />

            {/* ======================================================
                TABLE
            ====================================================== */}

            <table
              className="
                relative

                w-full

                font-serif

                text-lg
                md:text-2xl

                text-[#351b0b]
              "
            >

              <thead>

                <tr
                  className="
                    border-b-2
                    border-[#5b2a08]/80
                  "
                >

                  <th
                    className="
                      py-3

                      text-left

                      italic
                      font-bold

                      w-[22%]
                    "
                  >
                    S.No.
                  </th>

                  <th
                    className="
                      py-3

                      text-left

                      italic
                      font-bold
                    "
                  >
                    Item
                  </th>

                  <th
                    className="
                      py-3

                      text-right

                      italic
                      font-bold

                      w-[25%]
                    "
                  >
                    Price
                  </th>

                </tr>

              </thead>

              <tbody>

                {transaction.items.map((item, index) => (

                  <tr
                    key={item._id || index}
                    className="
                      border-b
                      border-[#75451f]/35

                      hover:bg-[#75451f]/10

                      transition-colors
                    "
                  >

                    <td className="py-3 md:py-3.5">
                      {index + 1}.
                    </td>

                    <td
                      className="
                        py-3
                        md:py-3.5

                        italic
                        font-medium
                      "
                    >
                      {item.name}
                    </td>

                    <td
                      className="
                        py-3
                        md:py-3.5

                        text-right

                        italic
                        font-medium

                        whitespace-nowrap
                      "
                    >
                      ₹{Number(item.price).toLocaleString()}
                    </td>

                  </tr>

                ))}

                {/* ==================================================
                    TOTAL
                ================================================== */}

                <tr>

                  <td
                    colSpan="2"
                    className="
                      pt-5
                      pb-3

                      text-2xl
                      md:text-4xl

                      italic
                      font-bold
                    "
                  >

                    <span className="mr-4">
                      〰
                    </span>

                    Total

                  </td>

                  <td
                    className="
                      pt-5
                      pb-3

                      text-right

                      text-2xl
                      md:text-4xl

                      italic
                      font-bold

                      whitespace-nowrap
                    "
                  >

                    ₹
                    {transaction.items
                      .reduce(
                        (total, item) =>
                          total + Number(item.price || 0),
                        0
                      )
                      .toLocaleString()}

                  </td>

                </tr>

              </tbody>

            </table>

          </div>

          {/* ========================================================
              WAX SEAL
          ======================================================== */}

          <div
            className="
              absolute

              left-[3%]
              bottom-[6%]

              w-28
              h-28

              md:w-40
              md:h-40

              pointer-events-none

              rotate-[-8deg]

              z-40
            "
          >

            <svg
              viewBox="0 0 150 150"
              className="w-full h-full"
            >

              <defs>

                <radialGradient
                  id={`waxSeal-${transaction._id}`}
                  cx="35%"
                  cy="28%"
                >

                  <stop
                    offset="0%"
                    stopColor="#c95a46"
                  />

                  <stop
                    offset="42%"
                    stopColor="#8e2d20"
                  />

                  <stop
                    offset="100%"
                    stopColor="#4b100b"
                  />

                </radialGradient>

              </defs>

              <path
                d="
                  M75 8
                  C88 4 96 16 108 18
                  C122 19 129 31 125 43
                  C137 53 133 67 126 76
                  C132 89 121 102 110 103
                  C101 116 87 112 77 121
                  C65 116 53 120 43 111
                  C29 111 20 99 24 87
                  C13 77 18 62 24 53
                  C19 39 29 28 42 27
                  C50 15 64 18 75 8
                  Z
                "
                fill={`url(#waxSeal-${transaction._id})`}
                stroke="#54130e"
                strokeWidth="3"
              />

              <circle
                cx="75"
                cy="68"
                r="39"
                fill="none"
                stroke="#4b100b"
                strokeWidth="3"
              />

              <circle
                cx="75"
                cy="68"
                r="32"
                fill="none"
                stroke="#c76a58"
                strokeWidth="1.5"
              />

              {/* TREE */}

              <path
                d="
                  M75 43V94
                  M75 57L58 46
                  M75 61L92 48
                  M75 70L56 60
                  M75 73L95 60
                  M64 95H86
                "
                stroke="#45100c"
                strokeWidth="4"
                strokeLinecap="round"
              />

              <circle
                cx="58"
                cy="46"
                r="6"
                fill="#55140e"
              />

              <circle
                cx="92"
                cy="48"
                r="6"
                fill="#55140e"
              />

              <circle
                cx="56"
                cy="60"
                r="6"
                fill="#55140e"
              />

              <circle
                cx="95"
                cy="60"
                r="6"
                fill="#55140e"
              />

            </svg>

          </div>

          {/* ========================================================
              QUILL
          ======================================================== */}

          <div
            className="
              absolute

              right-[2%]
              bottom-[5%]

              w-32
              h-52

              md:w-40
              md:h-64

              rotate-[8deg]

              pointer-events-none

              z-40
            "
          >

            <svg
              viewBox="0 0 120 220"
              className="w-full h-full"
              fill="none"
            >

              {/* SHAFT */}

              <path
                d="M30 211C44 161 63 103 95 16"
                stroke="#3d1d08"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* FEATHER */}

              <path
                d="
                  M32 174
                  C8 148 8 108 23 76
                  C39 44 67 22 101 9
                  C102 45 91 79 72 109
                  C56 134 42 158 32 174
                  Z
                "
                fill="#684018"
                stroke="#3b1c08"
                strokeWidth="2"
              />

              {/* CENTRAL VEIN */}

              <path
                d="M30 174C50 125 72 77 100 11"
                stroke="#d1a05e"
                strokeWidth="2"
              />

              {/* FEATHER DETAILS */}

              <path
                d="
                  M42 145L17 126
                  M48 130L18 106
                  M55 113L22 87
                  M62 97L31 69
                  M70 80L43 54
                  M77 63L55 42
                  M84 45L67 29
                  M91 29L79 20
                "
                stroke="#c39254"
                strokeWidth="2"
              />

            </svg>

          </div>

          {/* ========================================================
              BOTTOM LEFT QUOTE
          ======================================================== */}

          <div
            className="
              absolute

              left-[18%]
              bottom-[7%]

              hidden
              md:block

              font-serif
              italic

              text-[#4d2810]

              text-base
              md:text-lg

              leading-7

              z-30
            "
          >

            <p>
              “Good Food
              <br />
              &nbsp;&nbsp;Brighter Days”
            </p>

          </div>

          {/* ========================================================
              BOTTOM RIGHT QUOTE
          ======================================================== */}

          <div
            className="
              absolute

              right-[16%]
              bottom-[7%]

              hidden
              md:block

              text-right

              font-serif
              italic

              text-[#4d2810]

              text-base
              md:text-lg

              leading-7

              z-30
            "
          >

            <p>
              Spend Wisely
              <br />
              Live Better
            </p>

          </div>

          {/* ========================================================
              BOTTOM ORNAMENT
          ======================================================== */}

          <div
            className="
              flex
              items-center
              justify-center
              gap-4

              mt-6

              text-[#57290b]
            "
          >

            <div
              className="
                h-[2px]
                w-20
                md:w-32

                bg-[#63300d]/60
              "
            />

            <svg
              width="55"
              height="25"
              viewBox="0 0 55 25"
            >

              <path
                d="
                  M2 12.5
                  H18
                  C22 12.5 24 5 28 5
                  C32 5 33 20 28 20
                  C24 20 22 12.5 18 12.5
                  H2
                  M53 12.5
                  H37
                  C33 12.5 31 5 27 5
                  C23 5 22 20 27 20
                  C31 20 33 12.5 37 12.5
                  H53
                "
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle
                cx="27.5"
                cy="12.5"
                r="3"
                fill="currentColor"
              />
            </svg>
            <div
              className="
                h-[2px]
                w-20
                md:w-32
                bg-[#63300d]/60
              "
            />
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
