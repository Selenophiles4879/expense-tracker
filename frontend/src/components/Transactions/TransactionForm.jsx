import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FaDollarSign,
  FaCalendarAlt,
  FaRegCommentDots,
  FaWallet,
  FaPlus,
  FaTrash,
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

  amount: Yup.number().when("type", {
    is: "income",
    then: (schema) =>
      schema
        .required("Amount is required")
        .positive("Amount must be positive"),
    otherwise: (schema) => schema.notRequired(),
  }),

  category: Yup.string().required("Category is required"),

  date: Yup.date().required("Date is required"),

  description: Yup.string(),

  items: Yup.array().when("type", {
    is: "expense",
    then: (schema) =>
      schema
        .min(1, "At least one item is required")
        .of(
          Yup.object({
            name: Yup.string().required("Item name is required"),
            price: Yup.number()
              .required("Item price is required")
              .positive("Item price must be positive"),
          })
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const emptyFormValues = {
  type: "",
  amount: "",
  category: "",
  date: "",
  description: "",
  items: [],
};

const TransactionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  //! Transaction passed from TransactionList
  const transaction = location.state?.transaction;

  //! Determine whether this is CREATE or UPDATE
  const isEditMode = Boolean(transaction);

  //! Controls whether the item section is visible
  const [showItems, setShowItems] = useState(
    Boolean(transaction?.items?.length)
  );

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
      formik.resetForm({
        values: emptyFormValues,
      });

      setShowItems(false);
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
      formik.resetForm({
        values: emptyFormValues,
      });

      setShowItems(false);
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
      items: transaction?.items || [],
    },

    validationSchema,

    onSubmit: async (values) => {
      try {
        const items =
          values.type === "expense"
            ? values.items.map((item) => ({
                name: item.name.trim(),
                price: Number(item.price),
              }))
            : [];

        //! Calculate expense amount from items
        const itemTotal = items.reduce(
          (total, item) => total + Number(item.price || 0),
          0
        );

        const transactionData = {
          type: values.type,
          category: values.category,
          date: values.date,
          description: values.description,
          amount:
            values.type === "expense"
              ? itemTotal
              : Number(values.amount),
          items,
        };

        if (isEditMode) {
          // UPDATE
          await updateMutation.mutateAsync({
            id: transaction._id,
            ...transactionData,
          });
        } else {
          // CREATE
          await addMutation.mutateAsync(transactionData);
        }
      } catch (error) {
        console.error(error);
      }
    },
  });

  //! Hide/clear items when transaction type changes
  useEffect(() => {
    if (formik.values.type !== "expense") {
      if (formik.values.items.length > 0) {
        formik.setFieldValue("items", [], false);
      }

      setShowItems(false);
    }
  }, [formik.values.type]);

  //! Hide/clear items when category is removed
  useEffect(() => {
    if (
      formik.values.type === "expense" &&
      !formik.values.category
    ) {
      if (formik.values.items.length > 0) {
        formik.setFieldValue("items", [], false);
      }

      setShowItems(false);
    }
  }, [formik.values.category, formik.values.type]);

  const isPending =
    addMutation.isPending || updateMutation.isPending;

  const isError =
    addMutation.isError || updateMutation.isError;

  const error =
    addMutation.error || updateMutation.error;

  //! Add new item
  const handleAddItem = () => {
    if (
      formik.values.type !== "expense" ||
      !formik.values.category
    ) {
      return;
    }

    setShowItems(true);

    formik.setFieldValue("items", [
      ...formik.values.items,
      {
        name: "",
        price: "",
      },
    ]);
  };

  //! Remove item
  const handleRemoveItem = (index) => {
    const updatedItems = formik.values.items.filter(
      (_, itemIndex) => itemIndex !== index
    );

    formik.setFieldValue("items", updatedItems);

    if (updatedItems.length === 0) {
      setShowItems(false);
    }
  };

  //! Calculate item total
  const itemTotal = formik.values.items.reduce(
    (total, item) => total + Number(item.price || 0),
    0
  );

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

      {/* AMOUNT - ONLY FOR INCOME */}
      {formik.values.type === "income" && (
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
      )}

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

      {/* ADD ITEM - ONLY FOR EXPENSE AFTER CATEGORY */}
      {formik.values.type === "expense" &&
        formik.values.category && (
          <div>
            {!showItems && (
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
              >
                <FaPlus />
                Add Item
              </button>
            )}

            {showItems && (
              <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">
                    Expense Items
                  </h3>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-green-600 hover:text-green-800 font-medium"
                  >
                    <FaPlus />
                    Add Item
                  </button>
                </div>

                {formik.values.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start"
                  >
                    {/* ITEM NAME */}
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) =>
                          formik.setFieldValue(
                            `items[${index}].name`,
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          formik.setFieldTouched(
                            `items[${index}].name`,
                            true
                          )
                        }
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                      />

                      {formik.errors.items?.[index]?.name && (
                        <p className="text-red-500 text-xs mt-1">
                          {formik.errors.items[index].name}
                        </p>
                      )}
                    </div>

                    {/* ITEM PRICE */}
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) =>
                          formik.setFieldValue(
                            `items[${index}].price`,
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          formik.setFieldTouched(
                            `items[${index}].price`,
                            true
                          )
                        }
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                      />

                      {formik.errors.items?.[index]?.price && (
                        <p className="text-red-500 text-xs mt-1">
                          {formik.errors.items[index].price}
                        </p>
                      )}
                    </div>

                    {/* REMOVE ITEM */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 py-2"
                      title="Remove item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}

                {/* ITEM TOTAL */}
                <div className="flex justify-end border-t pt-3">
                  <span className="font-semibold text-gray-800">
                    Total: ${itemTotal.toLocaleString()}
                  </span>
                </div>

                {formik.errors.items &&
                  typeof formik.errors.items === "string" && (
                    <p className="text-red-500 text-xs">
                      {formik.errors.items}
                    </p>
                  )}
              </div>
            )}
          </div>
        )}

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
