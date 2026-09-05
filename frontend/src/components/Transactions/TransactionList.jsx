import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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

  //! Filtering state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    category: "",
  });

  //! Selected transaction
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

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
      setSelectedTransactionId(null);
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
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
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

  //! Show / hide transaction items
  const handleTransactionClick = (transaction) => {
    // Only expenses have items
    if (transaction.type !== "expense") {
      return;
    }

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
            {transactions?.map((transaction) => {
              const isSelected =
                selectedTransactionId === transaction._id;

              return (
                <React.Fragment key={transaction._id}>
                  {/* TRANSACTION */}
                  <li
                    onClick={() => handleTransactionClick(transaction)}
                    className={`bg-white p-3 rounded-md shadow border border-gray-200 flex justify-between items-center ${
                      transaction.type === "expense"
                        ? "cursor-pointer hover:bg-gray-50"
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
                        {transaction.category} - $
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

                  {/* ITEM DETAILS */}
                  {isSelected &&
                    transaction.type === "expense" && (
                      <li className="bg-white p-4 rounded-md shadow border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3">
                          Transaction Items
                        </h4>

                        {transaction.items?.length > 0 ? (
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-gray-300">
                                <th className="py-2">Item</th>
                                <th className="py-2">Price</th>
                                <th className="py-2">Total</th>
                              </tr>
                            </thead>

                            <tbody>
                              {transaction.items.map((item, index) => (
                                <tr
                                  key={index}
                                  className="border-b border-gray-200"
                                >
                                  <td className="py-2">
                                    {item.name}
                                  </td>

                                  <td className="py-2">
                                    $
                                    {Number(
                                      item.price
                                    ).toLocaleString()}
                                  </td>

                                  <td className="py-2">
                                    $
                                    {Number(
                                      item.price
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              ))}

                              {/* GRAND TOTAL */}
                              <tr className="font-semibold">
                                <td className="py-2">Total</td>
                                <td></td>
                                <td className="py-2">
                                  $
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
                        ) : (
                          <p className="text-gray-500">
                            No items found for this transaction.
                          </p>
                        )}
                      </li>
                    )}
                </React.Fragment>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
