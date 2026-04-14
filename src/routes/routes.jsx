import { createBrowserRouter } from "react-router";
import MainLayout from "../layout/MainLayout";
import Home from "../pages/Home/Home";
import AllDeals from "../pages/AllDeals/AllDeals";
import MyProduct from "../pages/MyProduct/MyProduct";
import MyDeals from "../pages/MyDeals/MyDeals";
import MyOrders from "../pages/MyOrders/MyOrders";
import DealDetail from "../pages/DealDetail/DealDetail";
import CreatedProduct from "../pages/CreatedProduct/CreatedProduct";
import CreateDeal from "../pages/CreateDeal/CreateDeal";
import PageNotFound from "../pages/PageNotFound/PageNotFound";
import Login from "../auth/Login/Login";
import SignUp from "../auth/SignUp/SignUp";
import PrivetRoutes from "./PrivetRoutes";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    errorElement: <PageNotFound />,
    children: [
      { index: true, Component: Home },
      { path: "/login", Component: Login },
      { path: "/signup", Component: SignUp },
      { path: "/deals", Component: AllDeals },
      { path: "/deals/:id", Component: DealDetail },
      {
        path: "/my-products",
        element: <PrivetRoutes><MyProduct /></PrivetRoutes>,
      },
      {
        path: "/my-deals",
        element: <PrivetRoutes><MyDeals /></PrivetRoutes>,
      },
      {
        path: "/my-orders",
        element: <PrivetRoutes><MyOrders /></PrivetRoutes>,
      },
      {
        path: "/create-product",
        element: <PrivetRoutes><CreatedProduct /></PrivetRoutes>,
      },
      {
        path: "/create-deal",
        element: <PrivetRoutes><CreateDeal /></PrivetRoutes>,
      },
    ],
  },
]);
