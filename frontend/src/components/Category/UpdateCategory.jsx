import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FaWallet } from "react-icons/fa";
import { SiDatabricks } from "react-icons/si";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  listCategoriesAPI,
  updateCategoryAPI,
} from "../../services/category/categoryService";

import AlertMessage from "../Alert/AlertMessage";

const validationSchema = Yup.object({
  name: Yup.string().required("Category name is required"),
  type: Yup.string()
    .required("Category type is required")
    .oneOf(["income", "expense"]),
});

const UpdateCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch categories
  const {
    data: categories,
    isLoading,
    isError: isFetchError,
    error: fetchError,
  } = useQuery({
    queryKey: ["list-categories"],
    queryFn: listCategoriesAPI,
  });

  // Find the category being edited
  const category = categories?.find(
    (category) => category._id === id
  );

  // Update mutation
  const {
    mutateAsync,
    isPending,
    isError,
    error,
    isSuccess,
  } = useMutation({
    mutationFn: updateCategoryAPI,
    mutationKey: ["update-category"],
  });

  const formik = useFormik({
    enableReinitialize: true,

    initialValues: {
      type: category?.type || "",
      name: category?.name || "",
    },

    validationSchema,

    onSubmit: async (values) => {
      try {
        await mutateAsync({
          id,
          name: values.name,
          type: values.type,
        });

        navigate("/categories");
      } catch (e) {
        console.log(e);
      }
    },
  });

  if (isLoading) {
    return <AlertMessage type="loading" message="Loading category..." />;
  }

  if (isFetchError) {
    return (
      <AlertMessage
        type="error"
        message={
          fetchError?.response?.data?.message ||
          "Unable to load category"
        }
      />
    );
  }

  if (!category) {
    return (
      <AlertMessage
        type="error"
        message="Category not found"
      />
    );
  }

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="max-w-lg mx-auto my-10 bg-white p-6 rounded-lg shadow-lg space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800">
          Update Category
        </h2>

        <p className="text-gray-600">
          Edit the category details below.
        </p>
      </div>

      {isError && (
        <AlertMessage
          type="error"
          message={
            error?.response?.data?.message ||
            "Something happened. Please try again later."
          }
        />
      )}

      {isSuccess && (
        <AlertMessage
          type="success"
          message="Category updated successfully!"
        />
      )}

      {/* Category Type */}
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
          className="w-full p-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
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

      {/* Category Name */}
      <div className="flex flex-col">
        <label
          htmlFor="name"
          className="text-gray-700 font-medium"
        >
          <SiDatabricks className="inline mr-2 text-blue-500" />
          Name
        </label>

        <input
          type="text"
          {...formik.getFieldProps("name")}
          placeholder="Name"
          id="name"
          className="w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 py-2 px-3"
        />

        {formik.touched.name && formik.errors.name && (
          <p className="text-red-500 text-xs italic">
            {formik.errors.name}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          {isPending ? "Updating..." : "Update Category"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/categories")}
          className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UpdateCategory;
