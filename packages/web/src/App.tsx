import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Library from './pages/Library';
import Reader from './pages/Reader';
import DocumentDetail from './pages/DocumentDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/doc/:id" element={<DocumentDetail />} />
        <Route path="/read/:id" element={<Reader />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
