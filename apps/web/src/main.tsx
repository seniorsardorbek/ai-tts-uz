import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import TtsPage from "./pages/TtsPage";
import CachePage from "./pages/CachePage";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./components/RequireAuth";

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: (
        <RequireAuth>
          <TtsPage />
        </RequireAuth>
      ),
    },
    {
      path: "/cache",
      element: (
        <RequireAuth>
          <CachePage />
        </RequireAuth>
      ),
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
