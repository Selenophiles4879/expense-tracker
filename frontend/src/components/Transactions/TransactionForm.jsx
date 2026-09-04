import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FaDollarSign,
  FaCalendarAlt,
  FaRegCommentDots,
  FaWallet,
} from "react-icons/fa";

import { listCategoriesAPI } from "../../services/category/categoryService";
import {
  addTransactionAPI,
  updateTransactionAPI,
} from "../../services/transactions/transactionService";

import AlertMessage from "../Alert/AlertMessage";

//! VALIDATION
const validationSchema = Yup.object({
  type: Yup.string()
    .required("Transaction type is required")
    .oneOf(["income", "expense"]),

  amount: Yup.number()
    .required("Amount is required")
    .positive("Amount must be positive"),

  category: Yup.string().required("Category is required"),

  date: Yup.date().required("Date is required"),

  description: Yup.string(),
});

const TransactionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  //! Transaction passed from TransactionList
  const transaction = location.state?.transaction;

  //! Determine whether this is CREATE or UPDATE
  const isEditMode = Boolean(transaction);

  //! Fetch categories
  const {
    data: categoriesData,
    isLoading: categoryLoading,
  } = useQuery({
    queryFn: listCategoriesAPI,
    queryKey: ["list-categories"],
  });

  //! CREATE mutation
  const addMutation = useMutation({
    mutationFn: addTransactionAPI,

    onSuccess: () => {
      navigate("/transactions");
    },

    onError: (error) => {
      console.error(
        "Create transaction failed:",
        error?.response?.data?.message || error.message
      );
    },
  });

  //! UPDATE mutation
  const updateMutation = useMutation({
    mutationFn: updateTransactionAPI,

    onSuccess: () => {
      navigate("/transactions");
    },

    onError: (error) => {
      console.error(
        "Update transaction failed:",
        error?.response?.data?.message || error.message
      );
    },
  });

  //! Formik
  const formik = useFormik({
    enableReinitialize: true,

    initialValues: {
      type: transaction?.type || "",
      amount: transaction?.amount || "",
      category: transaction?.category || "",
      date: transaction?.date
        ? new Date(transaction.date).toISOString().split("T")[0]
        : "",
      description: transaction?.description || "",
    },

    validationSchema,

    onSubmit: async (values) => {
      try {
        if (isEditMode) {
          // UPDATE
          await updateMutation.mutateAsync({
            id: transaction._id,
            ...values,
          });
        } else {
          // CREATE
          await addMutation.mutateAsync(values);
        }
      } catch (error) {
        console.error(error);
      }
    },
  });

  const isPending =
    addMutation.isPending || updateMutation.isPending;

  const isError =
    addMutation.isError || updateMutation.isError;

  const error =
    addMutation.error || updateMutation.error;

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="max-w-lg mx-auto my-10 bg-white p-6 rounded-lg shadow-lg space-y-6"
    >
      {/* HEADER */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEditMode
            ? "Update Transaction"
            : "Transaction Details"}
        </h2>

        <p className="text-gray-600">
          {isEditMode
            ? "Update your transaction details below."
            : "Fill in the details below."}
        </p>
      </div>

      {/* ERROR MESSAGE */}
      {isError && (
        <AlertMessage
          type="error"
          message={
            error?.response?.data?.message ||
            "Something happened. Please try again later."
          }
        />
      )}

      {/* SUCCESS MESSAGE */}
      {addMutation.isSuccess && !isEditMode && (
        <AlertMessage
          type="success"
          message="Transaction added successfully"
        />
      )}

      {updateMutation.isSuccess && isEditMode && (
        <AlertMessage
          type="success"
          message="Transaction updated successfully"
        />
      )}

      {/* TRANSACTION TYPE */}
      <div className="space-y-2">
        <label
          htmlFor="type"
          className="flex gap-2 items-center text-gray-700 font-medium"
        >
          <FaWallet className="text-blue-500" />
          <span>Type</span>
        </label>

        <select
          {...formik.getFieldProps("type")}
          id="type"
          className="block w-full p-2 mt-1 border border-gray-300 rounded-md shadow-sm"
        >
          <option value="">Select transaction type</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        {formik.touched.type && formik.errors.type && (
          <p className="text-red-500 text-xs">
            {formik.errors.type}
          </p>
        )}
      </div>

      {/* AMOUNT */}
      <div className="flex flex-col space-y-1">
        <label
          htmlFor="amount"
          className="text-gray-700 font-medium"
        >
          <FaDollarSign className="inline mr-2 text-blue-500" />
          Amount
        </label>

        <input
          type="number"
          {...formik.getFieldProps("amount")}
          id="amount"
          placeholder="Amount"
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        />

        {formik.touched.amount && formik.errors.amount && (
          <p className="text-red-500 text-xs italic">
            {formik.errors.amount}
          </p>
        )}
      </div>

      {/* CATEGORY */}
      <div className="flex flex-col space-y-1">
        <label
          htmlFor="category"
          className="text-gray-700 font-medium"
        >
          <FaRegCommentDots className="inline mr-2 text-blue-500" />
          Category
        </label>

        <select
          {...formik.getFieldProps("category")}
          id="category"
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        >
          <option value="">Select a category</option>

          {categoryLoading && (
            <option disabled>Loading categories...</option>
          )}

          {categoriesData?.map((category) => (
            <option
              key={category?._id}
              value={category?.name}
            >
              {category?.name}
            </option>
          ))}
        </select>

        {formik.touched.category && formik.errors.category && (
          <p className="text-red-500 text-xs">
            {formik.errors.category}
          </p>
        )}
      </div>

      {/* DATE */}
      <div className="flex flex-col space-y-1">
        <label
          htmlFor="date"
          className="text-gray-700 font-medium"
        >
          <FaCalendarAlt className="inline mr-2 text-blue-500" />
          Date
        </label>

        <input
          type="date"
          {...formik.getFieldProps("date")}
          id="date"
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        />

        {formik.touched.date && formik.errors.date && (
          <p className="text-red-500 text-xs">
            {formik.errors.date}
          </p>
        )}
      </div>

      {/* DESCRIPTION */}
      <div className="flex flex-col space-y-1">
        <label
          htmlFor="description"
          className="text-gray-700 font-medium"
        >
          <FaRegCommentDots className="inline mr-2 text-blue-500" />
          Description (Optional)
        </label>

        <textarea
          {...formik.getFieldProps("description")}
          id="description"
          placeholder="Description"
          rows="3"
          className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
        />

        {formik.touched.description &&
          formik.errors.description && (
            <p className="text-red-500 text-xs">
              {formik.errors.description}
            </p>
          )}
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 mt-4 bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          {isPending
            ? "Saving..."
            : isEditMode
            ? "Update Transaction"
            : "Submit Transaction"}
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate("/transactions")}
            className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TransactionForm;
