import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/OverviewPage";
import { RestaurantsPage } from "./pages/RestaurantsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderBuilderPage } from "./pages/OrderBuilderPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="restaurants" element={<RestaurantsPage />} />
        <Route path="orders">
          <Route index element={<OrdersPage />} />
          <Route path="new" element={<OrderBuilderPage />} />
          <Route path=":orderId" element={<OrderDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
