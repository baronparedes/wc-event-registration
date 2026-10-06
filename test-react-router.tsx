import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useNavigate, Routes, Route, useLocation } from 'react-router-dom';

function Redirector() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/\\example.com');
  }, []);
  return null;
}

function LocationPrinter() {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname}</div>;
}

function App() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Redirector />} />
        <Route path="*" element={<LocationPrinter />} />
      </Routes>
    </MemoryRouter>
  );
}

render(<App />);
