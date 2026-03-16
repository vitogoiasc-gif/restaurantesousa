import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Menu } from "./pages/Menu";
import { Success } from "./pages/Success";

import { Login } from "./pages/admin/Login";
import { Dashboard } from "./pages/admin/Dashboard";
import { Products } from "./pages/admin/Products";
import { Settings } from "./pages/admin/Settings";
import { ProductOptions } from "./pages/admin/ProductOptions";
import { Categories } from "./pages/admin/Categories";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/success" element={<Success />} />

        <Route path="/admin" element={<Login />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/products" element={<Products />} />
        <Route path="/admin/products/:productId/options" element={<ProductOptions />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;