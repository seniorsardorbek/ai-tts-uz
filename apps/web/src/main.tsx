import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import TtsPage from "./pages/TtsPage";
import CachePage from "./pages/CachePage";

const router = createBrowserRouter(
  [
    { path: "/", element: <TtsPage /> },
    { path: "/cache", element: <CachePage /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
