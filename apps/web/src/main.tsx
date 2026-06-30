import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import AdminLayout from "./layouts/AdminLayout";
import RequireAuth from "./components/RequireAuth";
import TtsPage from "./pages/TtsPage";
import LessonsPage from "./pages/LessonsPage";
import LessonVoicesPage from "./pages/LessonVoicesPage";
import LoginPage from "./pages/LoginPage";

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      element: (
        <RequireAuth>
          <AdminLayout />
        </RequireAuth>
      ),
      children: [
        { path: "/", element: <TtsPage /> },
        { path: "/cache", element: <LessonsPage /> },
        { path: "/cache/lessons/:lessonId", element: <LessonVoicesPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
