import React from 'react';

export const Table = ({ children, className = '' }: any) => (
  <div className={`w-full overflow-auto rounded-xl border border-gray-200 bg-white ${className}`}>
    <table className="w-full text-sm text-left">{children}</table>
  </div>
);

export const TableHeader = ({ children }: any) => <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>;
export const TableRow = ({ children, className = '' }: any) => <tr className={`border-b border-gray-100 hover:bg-gray-50/50 ${className}`}>{children}</tr>;
export const TableHead = ({ children, className = '' }: any) => <th className={`h-12 px-4 text-left font-bold text-gray-500 ${className}`}>{children}</th>;
export const TableCell = ({ children, className = '' }: any) => <td className={`p-4 align-middle ${className}`}>{children}</td>;
export const TableBody = ({ children }: any) => <tbody>{children}</tbody>;