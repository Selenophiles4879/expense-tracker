import React from "react";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  deleteCategoryAPI,
  listCategoriesAPI,
} from "../../services/category/categoryService";

import AlertMessage from "../Alert/AlertMessage";

const CategoriesList = () => {
  // Fetch categories
  const {
    data,
    isError,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryFn: listCategoriesAPI,
    queryKey: ["list-categories"],
  });

  // Delete category
  const {
    mutateAsync,
    isPending,
    isError: isDeleteError,
    error: deleteError,
  } = useMutation({
    mutationFn: deleteCategoryAPI,
    mutationKey: ["delete-category"],
  });

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmed) return;

    try {
      await mutateAsync(id);

      // Refresh categories after successful deletion
      await refetch();
    } catch (e) {
      console.log("Delete category error:", e);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Categories
      </h2>

      {/* Loading */}
      {isLoading && (
        <AlertMessage
          type="loading"
          message="Loading"
        />
      )}

      {/* Fetch error */}
      {isError && (
        <AlertMessage
          type="error"
          message={
            error?.response?.data?.message ||
            "An error occurred while loading categories"
          }
        />
      )}

      {/* Delete error */}
      {isDeleteError && (
        <AlertMessage
          type="error"
          message={
            deleteError?.response?.data?.message ||
            "Unable to delete category"
          }
        />
      )}

      <ul className="space-y-4">
        {data?.map((category) => (
          <li
            key={category?._id}
            className="flex justify-between items-center bg-gray-50 p-3 rounded-md"
          >
            <div>
              <span className="text-gray-800">
                {category?.name}
              </span>

              <span
                className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  category.type === "income"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {category?.type?.charAt(0).toUpperCase() +
                  category?.type?.slice(1)}
              </span>
            </div>

            <div className="flex space-x-3">
              {/* Update */}
              <Link to={`/update-category/${category._id}`}>
                <button
                  type="button"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FaEdit />
                </button>
              </Link>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(category?._id)}
                disabled={isPending}
                className="text-red-500 hover:text-red-700 disabled:text-gray-400"
              >
                <FaTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoriesList;
