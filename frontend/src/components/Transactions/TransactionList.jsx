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

                {/*
                {/* EXPANDED ITEM DETAILS */}
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
                            {/* ITEMS */}
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

                            {/* TOTAL */}
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

{/* EXPANDED ITEM DETAILS */}
{selectedTransactionId === transaction._id &&
  transaction.type === "expense" &&
  transaction.items?.length > 0 && (
    <li className="list-none">
      <div
        className="
          relative
          overflow-hidden
          p-6
          md:p-8
          rounded-sm
          border
          border-[#8b5a2b]
          shadow-[0_8px_25px_rgba(70,40,10,0.35)]
          text-[#3f2818]

          /* PARCHMENT BASE */
          bg-[#e8c98f]

          /* AGED PAPER TEXTURE */
          bg-[radial-gradient(circle_at_15%_20%,rgba(255,248,210,0.65),transparent_22%),radial-gradient(circle_at_85%_75%,rgba(105,65,25,0.25),transparent_28%),radial-gradient(circle_at_45%_55%,rgba(130,85,35,0.12),transparent_35%),linear-gradient(135deg,#f1d9a4,#dfbc7c_45%,#efd29a_70%,#d8ae6d)]

          /* IRREGULAR OLD-PAPER SHAPE */
          [clip-path:polygon(1%_3%,5%_1%,10%_3%,17%_1%,24%_3%,31%_1%,38%_2%,45%_1%,52%_3%,60%_1%,68%_3%,76%_1%,84%_3%,92%_1%,99%_4%,97%_12%,99%_20%,97%_28%,99%_36%,97%_45%,99%_54%,97%_63%,99%_72%,97%_82%,99%_91%,96%_98%,88%_96%,80%_98%,72%_96%,64%_98%,56%_96%,48%_98%,40%_96%,32%_98%,24%_96%,16%_98%,8%_96%,1%_99%,3%_91%,1%_82%,3%_73%,1%_64%,3%_55%,1%_46%,3%_37%,1%_28%,3%_19%,1%_10%)]
        "
      >
        {/* DARK AGED EDGES */}
        <div
          className="
            absolute inset-0
            pointer-events-none
            opacity-60
            bg-[radial-gradient(ellipse_at_top_left,rgba(74,40,12,0.55),transparent_18%),radial-gradient(ellipse_at_top_right,rgba(74,40,12,0.55),transparent_18%),radial-gradient(ellipse_at_bottom_left,rgba(74,40,12,0.6),transparent_20%),radial-gradient(ellipse_at_bottom_right,rgba(74,40,12,0.6),transparent_20%),linear-gradient(to_right,rgba(90,50,15,0.18),transparent_8%,transparent_92%,rgba(90,50,15,0.18))]
          "
        />

        {/* OLD PAPER STAINS */}
        <div
          className="
            absolute
            top-10
            left-10
            w-24
            h-24
            rounded-full
            bg-[#7b4b20]/10
            blur-xl
            pointer-events-none
          "
        />

        <div
          className="
            absolute
            bottom-16
            right-16
            w-32
            h-32
            rounded-full
            bg-[#704016]/10
            blur-2xl
            pointer-events-none
          "
        />

        {/* CONTENT */}
        <div className="relative z-10">

          {/* DECORATIVE TOP */}
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className="text-2xl opacity-80">❦</span>

            <div className="h-px flex-1 bg-[#70451f]/50" />

            <span className="text-xl">✦</span>

            <div className="h-px flex-1 bg-[#70451f]/50" />

            <span className="text-2xl opacity-80">❦</span>
          </div>

          {/* TITLE */}
          <div className="text-center mb-6">
            <h4
              className="
                text-3xl
                md:text-4xl
                font-serif
                italic
                font-bold
                tracking-wide
                drop-shadow-[1px_1px_0_rgba(80,40,10,0.2)]
              "
            >
              Expense Items
            </h4>

            <p className="mt-2 text-sm md:text-base font-serif italic opacity-80">
              A record of purchased items
            </p>

            {/* CATEGORY */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="h-px w-16 bg-[#70451f]/50" />

              <span
                className="
                  px-4
                  py-1
                  border-t
                  border-b
                  border-[#70451f]/50
                  text-xs
                  uppercase
                  tracking-[0.3em]
                  font-serif
                  font-semibold
                "
              >
                {transaction.category}
              </span>

              <span className="h-px w-16 bg-[#70451f]/50" />
            </div>
          </div>

          {/* INNER PARCHMENT / LEDGER */}
          <div
            className="
              relative
              mx-auto
              max-w-3xl
              px-4
              md:px-8
              py-4
              border
              border-[#70451f]/50
              shadow-[inset_0_0_25px_rgba(90,50,15,0.18)]
              bg-[#efd29a]/50
            "
          >
            {/* INNER DECORATION */}
            <div className="absolute top-1 left-2 text-xl opacity-60">
              ❧
            </div>

            <div className="absolute top-1 right-2 text-xl opacity-60">
              ❧
            </div>

            {/* TABLE */}
            <table className="w-full text-base md:text-lg font-serif">
              <thead>
                <tr className="border-b-2 border-[#70451f]/70">
                  <th className="text-left py-3 font-bold italic">
                    S.No.
                  </th>

                  <th className="text-left py-3 font-bold italic">
                    Item
                  </th>

                  <th className="text-right py-3 font-bold italic">
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
                      hover:bg-[#b8864d]/10
                      transition-colors
                    "
                  >
                    <td className="py-3">
                      {index + 1}.
                    </td>

                    <td className="py-3 font-medium">
                      {item.name}
                    </td>

                    <td className="py-3 text-right font-medium">
                      ₹
                      {Number(item.price).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* TOTAL */}
                <tr>
                  <td
                    colSpan="2"
                    className="
                      pt-5
                      pb-2
                      font-bold
                      text-xl
                      font-serif
                      italic
                    "
                  >
                    <span className="mr-2">〰</span>
                    Total
                  </td>

                  <td
                    className="
                      pt-5
                      pb-2
                      text-right
                      font-bold
                      text-xl
                      font-serif
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

          {/* BOTTOM DECORATION */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-xl opacity-70">❧</span>

            <div className="h-px w-24 bg-[#70451f]/50" />

            <span className="text-lg">◆</span>

            <div className="h-px w-24 bg-[#70451f]/50" />

            <span className="text-xl opacity-70">❧</span>
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-end mt-5">
            <span className="text-xs md:text-sm font-serif italic opacity-70">
              — Recorded with care —
            </span>

            <span className="text-xs md:text-sm font-serif italic opacity-70">
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
