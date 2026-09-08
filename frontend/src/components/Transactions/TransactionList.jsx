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

{/* PARCHMENT EXPANDED ITEM DETAILS */}
{selectedTransactionId === transaction._id &&
  transaction.type === "expense" &&
  transaction.items?.length > 0 && (
    <li className="list-none">
      <div
        className="
          relative
          my-2
          overflow-hidden
          px-5
          py-7
          md:px-10
          md:py-9

          text-[#3b2414]

          border-[3px]
          border-[#8a551f]

          shadow-[0_12px_30px_rgba(55,30,8,0.45)]

          bg-[#e6c487]

          bg-[radial-gradient(ellipse_at_center,rgba(255,239,183,0.8)_0%,transparent_55%),radial-gradient(ellipse_at_top_left,rgba(105,55,12,0.55)_0%,transparent_20%),radial-gradient(ellipse_at_top_right,rgba(105,55,12,0.55)_0%,transparent_20%),radial-gradient(ellipse_at_bottom_left,rgba(91,45,8,0.65)_0%,transparent_22%),radial-gradient(ellipse_at_bottom_right,rgba(91,45,8,0.65)_0%,transparent_22%),linear-gradient(135deg,#d5a965,#f0d39b_28%,#e5c17f_55%,#f1d39a_75%,#c9974e)]

          [clip-path:polygon(1%_3%,5%_1%,10%_2%,15%_1%,21%_3%,27%_1%,34%_2%,40%_1%,47%_3%,53%_1%,60%_2%,67%_1%,73%_3%,80%_1%,87%_2%,94%_1%,99%_4%,97%_11%,99%_18%,97%_25%,99%_33%,97%_40%,99%_48%,97%_56%,99%_64%,97%_72%,99%_80%,97%_88%,99%_96%,92%_98%,85%_96%,78%_99%,70%_97%,63%_99%,56%_97%,49%_99%,42%_97%,35%_99%,28%_97%,21%_99%,14%_97%,7%_99%,1%_96%,3%_88%,1%_80%,3%_72%,1%_64%,3%_56%,1%_48%,3%_40%,1%_32%,3%_24%,1%_16%,3%_9%)]
        "
      >
        {/* =========================================
            AGED PAPER OVERLAY
        ========================================== */}
        <div
          className="
            absolute
            inset-0
            pointer-events-none
            opacity-50

            bg-[radial-gradient(circle_at_25%_30%,rgba(100,55,15,0.18)_0_2px,transparent_3px),radial-gradient(circle_at_70%_65%,rgba(100,55,15,0.16)_0_1px,transparent_3px),radial-gradient(circle_at_45%_80%,rgba(100,55,15,0.13)_0_2px,transparent_4px)]
          "
        />

        {/* =========================================
            DARK BURNT EDGES
        ========================================== */}
        <div
          className="
            absolute
            inset-0
            pointer-events-none
            opacity-70

            bg-[radial-gradient(ellipse_at_top,transparent_60%,rgba(70,34,6,0.35)_100%),radial-gradient(ellipse_at_bottom,transparent_60%,rgba(70,34,6,0.45)_100%),linear-gradient(to_right,rgba(75,35,5,0.35),transparent_7%,transparent_93%,rgba(75,35,5,0.35))]
          "
        />

        {/* =========================================
            OLD PAPER STAINS
        ========================================== */}
        <div
          className="
            absolute
            -top-10
            left-20
            w-40
            h-40
            rounded-full
            bg-[#754313]/10
            blur-3xl
            pointer-events-none
          "
        />

        <div
          className="
            absolute
            bottom-5
            right-20
            w-52
            h-52
            rounded-full
            bg-[#754313]/10
            blur-3xl
            pointer-events-none
          "
        />

        {/* =========================================
            DECORATIVE CORNERS
        ========================================== */}

        {/* TOP LEFT */}
        <div
          className="
            absolute
            top-3
            left-3
            text-5xl
            md:text-6xl
            font-serif
            opacity-70
            rotate-[-10deg]
            pointer-events-none
          "
        >
          ❧
        </div>

        {/* TOP RIGHT */}
        <div
          className="
            absolute
            top-3
            right-3
            text-5xl
            md:text-6xl
            font-serif
            opacity-70
            scale-x-[-1]
            rotate-[-10deg]
            pointer-events-none
          "
        >
          ❧
        </div>

        {/* BOTTOM LEFT */}
        <div
          className="
            absolute
            bottom-3
            left-3
            text-5xl
            md:text-6xl
            font-serif
            opacity-70
            rotate-[10deg]
            pointer-events-none
          "
        >
          ❧
        </div>

        {/* BOTTOM RIGHT */}
        <div
          className="
            absolute
            bottom-3
            right-3
            text-5xl
            md:text-6xl
            font-serif
            opacity-70
            scale-x-[-1]
            rotate-[10deg]
            pointer-events-none
          "
        >
          ❧
        </div>

        {/* =========================================
            MAIN CONTENT
        ========================================== */}
        <div className="relative z-10">

          {/* TOP ORNAMENT */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px flex-1 max-w-24 bg-[#60350f]/60" />

            <span className="text-2xl font-serif">
              ❦
            </span>

            <span className="text-xl">
              ✦
            </span>

            <span className="text-2xl font-serif">
              ❦
            </span>

            <div className="h-px flex-1 max-w-24 bg-[#60350f]/60" />
          </div>

          {/* =========================================
              TITLE
          ========================================== */}
          <div className="text-center">

            <h4
              className="
                text-4xl
                md:text-5xl
                font-serif
                italic
                font-bold
                tracking-wide
                text-[#3d210d]
                drop-shadow-[1px_2px_0_rgba(70,35,5,0.18)]
              "
            >
              Expense Items
            </h4>

            <p
              className="
                mt-2
                text-base
                md:text-lg
                font-serif
                italic
                text-[#593719]
                opacity-90
              "
            >
              A record of purchased items
            </p>

            {/* TITLE ORNAMENT */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px w-20 bg-[#70451f]/60" />

              <span className="text-lg">
                ❧
              </span>

              <div className="h-px w-20 bg-[#70451f]/60" />
            </div>

            {/* CATEGORY */}
            <div className="mt-3">
              <span
                className="
                  inline-block
                  px-5
                  py-1

                  border-t
                  border-b
                  border-[#70451f]/60

                  text-xs
                  uppercase
                  tracking-[0.3em]
                  font-serif
                  font-bold
                "
              >
                {transaction.category}
              </span>
            </div>
          </div>

          {/* =========================================
              INNER LEDGER PAPER
          ========================================== */}
          <div
            className="
              relative
              mt-6
              mx-auto
              max-w-4xl

              px-4
              py-4
              md:px-8
              md:py-5

              border
              border-[#70451f]/70

              shadow-[inset_0_0_25px_rgba(80,40,10,0.2)]

              bg-[#edcf92]/70

              [clip-path:polygon(1%_3%,8%_1%,16%_3%,25%_1%,34%_3%,43%_1%,52%_3%,61%_1%,70%_3%,79%_1%,88%_3%,99%_1%,97%_15%,99%_30%,97%_45%,99%_60%,97%_75%,99%_98%,88%_96%,77%_99%,66%_97%,55%_99%,44%_97%,33%_99%,22%_97%,11%_99%,1%_97%,3%_82%,1%_67%,3%_52%,1%_37%,3%_22%,1%_8%)]
            "
          >

            {/* INNER CORNER ORNAMENTS */}
            <span
              className="
                absolute
                top-1
                left-2
                text-2xl
                opacity-60
              "
            >
              ❧
            </span>

            <span
              className="
                absolute
                top-1
                right-2
                text-2xl
                opacity-60
                scale-x-[-1]
              "
            >
              ❧
            </span>

            {/* =====================================
                TABLE
            ====================================== */}
            <table
              className="
                w-full
                text-base
                md:text-lg
                font-serif
              "
            >
              <thead>
                <tr
                  className="
                    border-b-2
                    border-[#60350f]/70
                  "
                >
                  <th
                    className="
                      text-left
                      py-3
                      font-bold
                      italic
                      w-20
                    "
                  >
                    S.No.
                  </th>

                  <th
                    className="
                      text-left
                      py-3
                      font-bold
                      italic
                    "
                  >
                    Item
                  </th>

                  <th
                    className="
                      text-right
                      py-3
                      font-bold
                      italic
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
                      border-[#70451f]/30
                      transition-all
                      duration-200
                      hover:bg-[#9b682f]/10
                    "
                  >
                    <td className="py-3">
                      {index + 1}.
                    </td>

                    <td className="py-3 font-medium">
                      {item.name}
                    </td>

                    <td
                      className="
                        py-3
                        text-right
                        font-medium
                        whitespace-nowrap
                      "
                    >
                      ₹{Number(item.price).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* =================================
                    TOTAL
                ================================== */}
                <tr>
                  <td
                    colSpan="2"
                    className="
                      pt-5
                      pb-2
                      font-bold
                      italic
                      text-xl
                      md:text-2xl
                    "
                  >
                    <span className="mr-2 text-2xl">
                      〰
                    </span>

                    Total
                  </td>

                  <td
                    className="
                      pt-5
                      pb-2
                      text-right
                      font-bold
                      italic
                      text-xl
                      md:text-2xl
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

          {/* =========================================
              BOTTOM ORNAMENT
          ========================================== */}
          <div
            className="
              flex
              items-center
              justify-center
              gap-3
              mt-6
            "
          >
            <span className="text-xl">
              ❧
            </span>

            <div className="h-px w-20 bg-[#70451f]/60" />

            <span className="text-lg">
              ◆
            </span>

            <div className="h-px w-20 bg-[#70451f]/60" />

            <span className="text-xl scale-x-[-1]">
              ❧
            </span>
          </div>

          {/* =========================================
              PARCHMENT FOOTER
          ========================================== */}
          <div
            className="
              flex
              flex-col
              md:flex-row
              justify-between
              items-center
              gap-2
              mt-5
              px-4
            "
          >
            <span
              className="
                text-xs
                md:text-sm
                font-serif
                italic
                opacity-75
              "
            >
              — Recorded with care —
            </span>

            <span
              className="
                text-xs
                md:text-sm
                font-serif
                italic
                opacity-75
              "
            >
              Spend wisely, live better
            </span>
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
