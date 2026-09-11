import React from "react";

import TransactionChart from "../Transactions/TransactionChart";
import TransactionList from "../Transactions/TransactionList";
import ExportExpenses from "../Transactions/ExportExpenses";

const Dashboard = () => {
  return (
    <>
      <TransactionChart />
      <ExportExpenses />
      <TransactionList />
    </>
  );
};

export default Dashboard;