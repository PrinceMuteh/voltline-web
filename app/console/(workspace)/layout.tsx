import { RealtimeBridge } from "@/lib/realtime";
import { Sidebar } from "./sidebar";

/** Console shell: 232 px sidebar on the left; it stacks above the content on narrow screens. */
export default function WorkspaceLayout({ children }: LayoutProps<"/console">) {
  return (
    <RealtimeBridge>
      <div className="flex min-h-screen flex-col bg-white md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </RealtimeBridge>
  );
}
