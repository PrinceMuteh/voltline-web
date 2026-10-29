"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDriverMe } from "@/lib/api/driver";
import { nairaExact } from "@/lib/format";

export function WalletBalance() {
  const { data: me } = useDriverMe();
  return (
    <div className="mt-4 rounded-2xl bg-ink p-5 text-white">
      <p className="text-[14px] text-white/70">Balance</p>
      {me ? (
        <p className="nums mt-1 text-[34px] font-semibold tracking-[-0.02em]">
          {nairaExact(me.walletKobo ?? 0)}
        </p>
      ) : (
        <Skeleton className="mt-2 h-10 w-40 bg-white/20" />
      )}
      <Button
        variant="secondary"
        className="mt-4 h-11 w-full border-white text-[15px]"
        disabled
      >
        Top up · coming soon
      </Button>
    </div>
  );
}
