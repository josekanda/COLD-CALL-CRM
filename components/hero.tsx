export function Hero({ count }: { count: number }) {
  return (
    <div className="aura-hero text-white rounded-2xl px-6 py-5 mb-5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center font-extrabold text-xl">
          A
        </div>
        <div>
          <div className="font-bold text-lg leading-tight">
            Aura · Cold-Call CRM
          </div>
          <div className="text-white/70 text-xs">
            {count > 0
              ? `${count} prospects sans site · triés par priorité d'appel`
              : "Importe ton CSV pour démarrer"}
          </div>
        </div>
      </div>
    </div>
  );
}
