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

                {/* ============================================================
    ANCIENT PARCHMENT — EXPANDED ITEM DETAILS
============================================================ */}
{selectedTransactionId === transaction._id &&
  transaction.type === "expense" &&
  transaction.items?.length > 0 && (
    <li className="list-none w-full">

      <div
        className="
          relative
          w-full
          min-h-[760px]
          overflow-hidden
          isolate

          px-5
          py-7

          md:px-10
          md:py-8

          text-[#3b1d0b]

          shadow-[0_14px_35px_rgba(45,22,5,0.48)]

          bg-[#d7a762]

          [clip-path:polygon(
            1%_2%,4%_3%,7%_1%,10%_3%,13%_1%,17%_2%,21%_1%,
            25%_3%,29%_1%,33%_2%,37%_1%,41%_3%,45%_1%,49%_2%,
            53%_1%,57%_3%,61%_1%,65%_2%,69%_1%,73%_3%,77%_1%,
            81%_2%,85%_1%,89%_3%,93%_1%,97%_3%,99%_5%,
            98%_11%,99%_17%,97%_23%,99%_29%,98%_35%,99%_41%,
            97%_47%,99%_53%,98%_59%,99%_65%,97%_71%,99%_77%,
            98%_83%,99%_89%,97%_95%,99%_98%,
            94%_97%,90%_99%,86%_97%,82%_99%,78%_97%,74%_99%,
            70%_97%,66%_99%,62%_97%,58%_99%,54%_97%,50%_99%,
            46%_97%,42%_99%,38%_97%,34%_99%,30%_97%,26%_99%,
            22%_97%,18%_99%,14%_97%,10%_99%,6%_97%,2%_99%,
            3%_94%,1%_88%,3%_82%,1%_76%,3%_70%,1%_64%,3%_58%,
            1%_52%,3%_46%,1%_40%,3%_34%,1%_28%,3%_22%,1%_16%,3%_10%
          )]
        "
      >

        {/* ========================================================
            PAPER BASE
        ========================================================= */}
        <div
          className="
            absolute
            inset-0
            -z-20
            pointer-events-none

            bg-[radial-gradient(ellipse_at_center,#f4dca7_0%,#edcf91_38%,#d5a764_72%,#a96d2d_100%)]
          "
        />

        {/* ========================================================
            REALISTIC PAPER TEXTURE
        ========================================================= */}
        <svg
          className="absolute inset-0 w-full h-full -z-10 opacity-35 pointer-events-none"
          preserveAspectRatio="none"
        >
          <filter id={`paperTexture-${transaction._id}`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.035"
              numOctaves="4"
              seed="8"
            />

            <feColorMatrix
              type="saturate"
              values="0"
            />

            <feComponentTransfer>
              <feFuncA
                type="table"
                tableValues="0 0.45"
              />
            </feComponentTransfer>
          </filter>

          <rect
            width="100%"
            height="100%"
            filter={`url(#paperTexture-${transaction._id})`}
          />
        </svg>

        {/* ========================================================
            BURNT EDGE VIGNETTE
        ========================================================= */}
        <div
          className="
            absolute
            inset-0
            -z-10
            pointer-events-none

            bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(77,36,6,.18)_76%,rgba(60,27,4,.58)_100%)]
          "
        />

        {/* ========================================================
            OLD INK / WATER STAINS
        ========================================================= */}
        <div
          className="
            absolute
            left-[4%]
            top-[42%]

            w-28
            h-20

            rounded-full

            bg-[#734014]/20

            blur-xl

            rotate-[-18deg]

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            right-[6%]
            top-[48%]

            w-24
            h-32

            rounded-full

            bg-[#6c3a12]/15

            blur-xl

            rotate-[20deg]

            pointer-events-none
          "
        />

        <div
          className="
            absolute
            left-[16%]
            bottom-[7%]

            w-20
            h-20

            rounded-full

            bg-[#754319]/15

            blur-lg

            pointer-events-none
          "
        />

        {/* ========================================================
            INNER AGED BORDER
        ========================================================= */}
        <div
          className="
            absolute
            inset-[22px]

            border
            border-[#67350e]/35

            pointer-events-none

            opacity-70
          "
        />

        {/* ========================================================
            TOP LEFT ORNAMENT — MORE DETAILED
        ========================================================= */}
        <svg
          className="
            absolute
            top-5
            left-5

            w-32
            h-32

            md:w-40
            md:h-40

            text-[#542609]

            opacity-90

            pointer-events-none
          "
          viewBox="0 0 180 180"
          fill="none"
        >
          <path
            d="M15 155
               C15 100 18 38 76 25
               C108 18 133 26 158 10"
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            d="M20 137
               C48 125 55 103 38 82
               C65 91 91 77 87 50
               C110 64 134 50 136 28"
            stroke="currentColor"
            strokeWidth="2.5"
          />

          <path
            d="M36 119
               C59 112 69 98 61 83
               C78 88 94 77 94 63"
            stroke="currentColor"
            strokeWidth="2"
          />

          <path
            d="M24 62
               C40 47 57 43 76 47
               C61 32 61 22 66 15"
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
            cx="73"
            cy="47"
            r="4"
            fill="currentColor"
          />

          <circle
            cx="91"
            cy="78"
            r="4"
            fill="currentColor"
          />

          <path
            d="M14 154L14 104"
            stroke="currentColor"
            strokeWidth="4"
          />
        </svg>

        {/* ========================================================
            TOP RIGHT ORNAMENT
        ========================================================= */}
        <svg
          className="
            absolute
            top-5
            right-5

            w-32
            h-32

            md:w-40
            md:h-40

            text-[#542609]

            opacity-90

            scale-x-[-1]

            pointer-events-none
          "
          viewBox="0 0 180 180"
          fill="none"
        >
          <path
            d="M15 155
               C15 100 18 38 76 25
               C108 18 133 26 158 10"
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            d="M20 137
               C48 125 55 103 38 82
               C65 91 91 77 87 50
               C110 64 134 50 136 28"
            stroke="currentColor"
            strokeWidth="2.5"
          />

          <path
            d="M36 119
               C59 112 69 98 61 83
               C78 88 94 77 94 63"
            stroke="currentColor"
            strokeWidth="2"
          />

          <path
            d="M24 62
               C40 47 57 43 76 47
               C61 32 61 22 66 15"
            stroke="currentColor"
            strokeWidth="2"
          />

          <circle
            cx="28"
            cy="28"
            r="6"
            fill="currentColor"
          />
        </svg>

        {/* ========================================================
            BOTTOM RIGHT ORNAMENT
        ========================================================= */}
        <svg
          className="
            absolute
            bottom-3
            right-5

            w-36
            h-36

            md:w-44
            md:h-44

            text-[#542609]

            opacity-90

            scale-x-[-1]
            scale-y-[-1]

            pointer-events-none
          "
          viewBox="0 0 180 180"
          fill="none"
        >
          <path
            d="M15 155
               C15 100 18 38 76 25
               C108 18 133 26 158 10"
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            d="M20 137
               C48 125 55 103 38 82
               C65 91 91 77 87 50
               C110 64 134 50 136 28"
            stroke="currentColor"
            strokeWidth="2.5"
          />

          <path
            d="M36 119
               C59 112 69 98 61 83
               C78 88 94 77 94 63"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>

        {/* ========================================================
            COMPASS
        ========================================================= */}
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

            {/* North */}
            <path
              d="M80 20L91 72L80 80L69 72Z"
              fill="#70451f"
            />

            {/* South */}
            <path
              d="M80 140L69 88L80 80L91 88Z"
              fill="#b08043"
            />

            {/* East */}
            <path
              d="M140 80L88 69L80 80L88 91Z"
              fill="#70451f"
            />

            {/* West */}
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

        {/* ========================================================
            RIGHT SIDE QUOTE
        ========================================================= */}
        <div
          className="
            absolute
            right-[5%]
            top-[14%]

            hidden
            lg:block

            w-36

            text-center

            font-serif
            italic

            text-[#4d2a12]

            opacity-85

            text-base

            leading-7
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

        {/* ========================================================
            MAIN CONTENT
        ========================================================= */}
        <div className="relative z-30">

          {/* ======================================================
              HEADER
          ====================================================== */}
          <div className="text-center">

            {/* Decorative line */}
            <div className="flex items-center justify-center gap-5">

              <div className="h-[2px] w-16 md:w-28 bg-[#512508]/75" />

              <svg
                width="55"
                height="28"
                viewBox="0 0 55 28"
                className="text-[#512508]"
              >
                <path
                  d="M2 14H18
                     C24 14 25 4 29 4
                     C33 4 33 24 29 24
                     C25 24 24 14 18 14
                     H2"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />

                <path
                  d="M53 14H37
                     C31 14 30 4 26 4
                     C22 4 22 24 26 24
                     C30 24 31 14 37 14
                     H53"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>

              <div className="h-[2px] w-16 md:w-28 bg-[#512508]/75" />

            </div>

            {/* ==================================================
                TITLE
            =================================================== */}
            {/*<h4
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
            </h4> */}
            
            <h4 className="parchment-title text-5xl md:text-7xl tracking-tight text-[#3a1705]">
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

            {/* ==================================================
                HEADER ORNAMENT
            =================================================== */}
            <div className="flex justify-center items-center gap-4 mt-3">

              <div className="h-[2px] w-24 bg-[#62300d]/60" />

              <svg
                width="45"
                height="28"
                viewBox="0 0 45 28"
                className="text-[#62300d]"
              >
                <path
                  d="M22 2
                     C22 2 16 11 8 14
                     C16 17 22 26 22 26
                     C22 26 29 17 37 14
                     C29 11 22 2 22 2Z"
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

              <div className="h-[2px] w-24 bg-[#62300d]/60" />

            </div>

            {/* ==================================================
                CATEGORY
            =================================================== */}
            <div className="mt-2">

              <span
                className="
                  text-xs
                  uppercase
                  tracking-[0.35em]

                  font-serif
                  font-bold

                  text-[#60310e]
                "
              >
                {transaction.category}
              </span>

            </div>

          </div>

          {/* ======================================================
              INNER LEDGER
          ====================================================== */}
          <div
            className="
              relative

              mx-auto

              mt-5

              w-[92%]
              md:w-[76%]

              px-5
              md:px-10

              pt-2
              pb-1

              bg-[#e4bd79]

              border
              border-[#65320c]

              shadow-[0_5px_10px_rgba(62,28,5,.3),inset_0_0_25px_rgba(75,32,5,.22)]

              [clip-path:polygon(
                1%_3%,7%_1%,14%_3%,21%_1%,28%_3%,35%_1%,42%_3%,
                49%_1%,56%_3%,63%_1%,70%_3%,77%_1%,84%_3%,92%_1%,99%_3%,
                98%_16%,99%_31%,98%_46%,99%_61%,98%_76%,99%_98%,
                91%_96%,84%_99%,77%_97%,70%_99%,63%_97%,56%_99%,
                49%_97%,42%_99%,35%_97%,28%_99%,21%_97%,14%_99%,
                7%_97%,1%_99%,2%_83%,1%_68%,2%_53%,1%_38%,2%_23%,1%_8%
              )]
            "
          >

            {/* Ledger texture */}
            <div
              className="
                absolute
                inset-0
                pointer-events-none

                opacity-25

                bg-[radial-gradient(circle_at_20%_30%,#70451f_0_1px,transparent_3px),radial-gradient(circle_at_70%_70%,#70451f_0_1px,transparent_4px)]
              "
            />

            {/* ==================================================
                TABLE
            =================================================== */}
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

                {/* =================================================
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

          {/* ======================================================
              WAX SEAL
          ====================================================== */}
          <div
            className="
              absolute

              left-[3%]
              bottom-[5%]

              w-28
              h-28

              md:w-36
              md:h-36

              pointer-events-none

              rotate-[-8deg]
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
                  cy="30%"
                >
                  <stop
                    offset="0%"
                    stopColor="#c85b49"
                  />

                  <stop
                    offset="45%"
                    stopColor="#8f2c20"
                  />

                  <stop
                    offset="100%"
                    stopColor="#4e100b"
                  />
                </radialGradient>

              </defs>

              {/* Wax seal shape */}
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

              {/* Inner ring */}
              <circle
                cx="75"
                cy="68"
                r="38"
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

              {/* Tree emblem */}
              <path
                d="
                  M75 43
                  V94

                  M75 57
                  L58 46

                  M75 61
                  L92 48

                  M75 70
                  L56 60

                  M75 73
                  L95 60

                  M64 95
                  H86
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

          {/* ======================================================
              QUILL / FEATHER
          ====================================================== */}
          <div
            className="
              absolute

              right-[3%]
              bottom-[5%]

              w-28
              h-48

              md:w-36
              md:h-56

              rotate-[8deg]

              pointer-events-none
            "
          >

            <svg
              viewBox="0 0 120 220"
              className="w-full h-full"
              fill="none"
            >

              {/* Shaft */}
              <path
                d="M30 211C44 161 63 103 95 16"
                stroke="#3d1d08"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Feather */}
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

              {/* Feather central vein */}
              <path
                d="M30 174C50 125 72 77 100 11"
                stroke="#d1a05e"
                strokeWidth="2"
              />

              {/* Feather details */}
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

          {/* ======================================================
              BOTTOM LEFT QUOTE
          ====================================================== */}
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
            "
          >
            <p>
              “Good Food
              <br />
              &nbsp;&nbsp;Brighter Days”
            </p>
          </div>

          {/* ======================================================
              BOTTOM RIGHT QUOTE
          ====================================================== */}
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
            "
          >
            <p>
              Spend Wisely
              <br />
              Live Better
            </p>
          </div>

          {/* ======================================================
              BOTTOM ORNAMENT
          ====================================================== */}
          <div
            className="
              flex
              items-center
              justify-center
              gap-4
              mt-5
              text-[#57290b]
            "
          >

            <div className="h-[2px] w-20 md:w-32 bg-[#63300d]/60" />

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
            <div className="h-[2px] w-20 md:w-32 bg-[#63300d]/60" />
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
