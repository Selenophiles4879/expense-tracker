import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaFileCsv, FaFilePdf, FaDownload, FaCalendarAlt } from "react-icons/fa";
import { downloadExpensesAPI } from "../../services/transactions/transactionService";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const date = new Date();
  date.setDate(1);
  return getLocalDateString(date);
};

const ExportExpenses = () => {
  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [loadingFormat, setLoadingFormat] = useState("");
  const [error, setError] = useState("");

  const dateError = useMemo(() => {
    if (!startDate || !endDate) return "Please select both dates.";
    if (startDate > endDate) return "From date cannot be after To date.";
    return "";
  }, [startDate, endDate]);

  const handleDownload = async (format) => {
    setError("");

    if (dateError) {
      setError(dateError);
      return;
    }

    try {
      setLoadingFormat(format);

      const { blob, filename } = await downloadExpensesAPI({
        startDate,
        endDate,
        format,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err?.response?.data?.message;
      setError(message || "Unable to download your expenses. Please try again.");
    } finally {
      setLoadingFormat("");
    }
  };

  return (
    <section className="relative mx-auto my-8 w-[94%] max-w-6xl overflow-hidden rounded-2xl border border-[#b89461]/60 bg-[#f4e7c8] px-5 py-7 shadow-lg md:px-8">
      <div className="pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-[#b08043]/10" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-52 w-52 rounded-full bg-[#8b4513]/10" />

      <div className="relative text-center">
        <p className="font-serif text-sm uppercase tracking-[0.25em] text-[#7a4b25]">
          Personal Ledger
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-[#4f260b] md:text-3xl">
          Export Your Expenses
        </h2>
        <p className="mx-auto mt-2 max-w-2xl font-serif text-[#6b4a2b]">
          Choose a date range and download your expenses in chronological order,
          including all detailed items.
        </p>
      </div>

      <div className="relative mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 font-serif font-semibold text-[#4f260b]">
          <span className="flex items-center gap-2">
            <FaCalendarAlt /> From
          </span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-[#b89461] bg-[#fffaf0] px-3 py-2 font-sans font-normal text-gray-800 outline-none focus:ring-2 focus:ring-[#9a6b35]"
          />
        </label>

        <label className="flex flex-col gap-2 font-serif font-semibold text-[#4f260b]">
          <span className="flex items-center gap-2">
            <FaCalendarAlt /> To
          </span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            max={getLocalDateString()}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-[#b89461] bg-[#fffaf0] px-3 py-2 font-sans font-normal text-gray-800 outline-none focus:ring-2 focus:ring-[#9a6b35]"
          />
        </label>
      </div>

      {error && (
        <p className="relative mx-auto mt-4 max-w-4xl rounded-lg bg-red-100 px-4 py-2 text-center text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="relative mx-auto mt-6 flex max-w-4xl flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => handleDownload("pdf")}
          disabled={Boolean(loadingFormat)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#5b2d0c] px-5 py-3 font-serif font-bold text-white shadow transition hover:bg-[#3f1e08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaFilePdf />
          {loadingFormat === "pdf" ? "Preparing PDF..." : "Download PDF"}
        </button>

        <button
          type="button"
          onClick={() => handleDownload("csv")}
          disabled={Boolean(loadingFormat)}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-[#5b2d0c] bg-[#fffaf0] px-5 py-3 font-serif font-bold text-[#5b2d0c] shadow transition hover:bg-[#ead7ae] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaFileCsv />
          {loadingFormat === "csv" ? "Preparing CSV..." : "Download CSV"}
        </button>
      </div>

      <div className="relative mt-5 flex flex-col items-center justify-center gap-2 text-sm font-serif text-[#76502c] sm:flex-row">
        <div className="flex items-center gap-2">
          <FaDownload />
          <span>PDF and CSV exports include transaction details and item details.</span>
        </div>
      </div>

      <div className="relative mt-5 flex justify-center">
        <Link
          to="/verify"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8b4513]/40 bg-[#fffaf0] px-5 py-2.5 font-serif font-bold text-[#5b2d0c] shadow-sm transition hover:bg-[#ead7ae]"
        >
          🔐 Verify an Export
        </Link>
      </div>
    </section>
  );
};

export default ExportExpenses;
