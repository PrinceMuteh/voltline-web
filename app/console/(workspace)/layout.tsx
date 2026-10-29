import { Suspense } from "react";
import { RealtimeBridge } from "@/lib/realtime";
import { Sidebar } from "./sidebar";

/** Console shell: 232 px sidebar on the left; it stacks above the content on narrow screens. */
export default function WorkspaceLayout({ children }: LayoutProps<"/console">) {
  return (
    <RealtimeBridge>
      <div className="flex min-h-screen flex-col bg-white md:flex-row">
        {/* The sidebar reads the URL for the current item; dynamic routes stream it in */}
        <Suspense fallback={<SidebarPlaceholder />}>
          <Sidebar />
        </Suspense>
        <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </RealtimeBridge>
  );
}

/** Same footprint as the sidebar, so nothing shifts when it arrives. */
function SidebarPlaceholder() {
  return (
    <aside
      aria-hidden
      className="border-line bg-subtle px-4 py-5 md:w-[232px] md:shrink-0 md:border-r"
    />
  );
}
