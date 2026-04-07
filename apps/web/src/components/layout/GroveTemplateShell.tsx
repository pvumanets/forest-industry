import { Outlet } from "react-router-dom";
import { GroveAppNavbar } from "./GroveAppNavbar";
import { GroveChromeHeader } from "./GroveChromeHeader";
import { GroveSideMenu } from "./GroveSideMenu";

export function GroveTemplateShell() {
  return (
    <div className="flex min-h-dvh">
      <GroveSideMenu />
      <GroveAppNavbar />
      <main className="min-w-0 flex-1 overflow-auto bg-background">
        <div className="mx-2 flex flex-col gap-2 pb-10 pt-2 sm:mx-3 md:pt-1.5 md:mt-0 mt-16">
          <GroveChromeHeader />
          <div className="w-full max-w-[1700px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
