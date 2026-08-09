import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isStaff } from "@/lib/pb";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

/**
 * Client-side gate. The auth token lives in localStorage, so the server can't
 * see it during SSR — rendering the panel before mount would flash an empty
 * shell. This is only about not showing you a broken page: the collection rules
 * on PocketBase are what actually protect the data.
 */
function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onLogin = path.startsWith("/admin/login");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!onLogin && !isStaff()) {
      navigate({ to: "/admin/login", replace: true });
      return;
    }
    setChecked(true);
  }, [onLogin, navigate, path]);

  if (!checked && !onLogin) return null;

  return <Outlet />;
}
