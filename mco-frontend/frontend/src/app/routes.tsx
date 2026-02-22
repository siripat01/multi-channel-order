import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LabelsPage } from "./pages/LabelsPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ShopsPage } from "./pages/ShopsPage";
import { CreateShopPage } from "./pages/CreateShopPage";
import { ShopIntegrationsPage } from "./pages/ShopIntegrationsPage";
import HomePage from "./pages/HomePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: "integrations",
            element: <IntegrationsPage />,
          },
          {
            path: "shops",
            children: [
              {
                index: true,
                element: <ShopsPage />,
              },
              {
                path: "create",
                element: <CreateShopPage />,
              },
              {
                path: ":shopId/integrations",
                element: <ShopIntegrationsPage />,
              },
            ],
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
          {
            path: "labels",
            element: <LabelsPage />,
          },
        ],
      },
    ],
  },
]);
