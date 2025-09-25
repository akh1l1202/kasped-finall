import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

 type Cleaning = "Ready" | "In-progress" | "Pending";

 type RTTrain = {
  id: number;
  code: string;
  rollingHours: number; // hours remaining for Rolling-Stock fitness
  sntHours: number; // hours remaining for Signalling & Telecom fitness
  fitnessSensorOk: boolean;
  maximoOpenJobs: number;
  brandingExposure: number; // % met
  mileageTodayKm: number; // km today
  cleaning: Cleaning;
  bayIndex: number;
 };

 function makeRealtimeFleet(): RTTrain[] {
  const arr: RTTrain[] = [];
  for (let i = 0; i < 25; i++) {
    const code = `KMRL-${String(i + 1).padStart(2, "0")}`;
    arr.push({
      id: i + 1,
      code,
      rollingHours: 8 + Math.random() * 24,
      sntHours: 8 + Math.random() * 24,
      fitnessSensorOk: true,
      maximoOpenJobs: Math.floor(Math.random() * 4),
      brandingExposure: 70 + Math.random() * 25,
      mileageTodayKm: 50 + Math.random() * 200,
      cleaning: (i % 3 === 0 ? "Pending" : i % 3 === 1 ? "In-progress" : "Ready") as Cleaning,
      bayIndex: i % 12,
    });
  }
  // Inject one failure case: fitness IoT sensor failed
  if (arr[6]) arr[6].fitnessSensorOk = false; // KMRL-07
  return arr;
 }

 function useRealtimeFleet() {
  const [fleet, setFleet] = useState<RTTrain[]>(() => makeRealtimeFleet());
  const timer = useRef<number | null>(null);
  useEffect(() => {
    timer.current = window.setInterval(() => {
      setFleet((prev) =>
        prev.map((t, idx) => {
          const jitter = (n: number, amt: number, min = 0, max = 1000) =>
            Math.max(min, Math.min(max, n + (Math.random() * 2 - 1) * amt));
          const rollingHours = Math.max(0, t.rollingHours - Math.random() * 0.3);
          const sntHours = Math.max(0, t.sntHours - Math.random() * 0.25);
          const brandingExposure = jitter(t.brandingExposure, 1.2, 50, 100);
          const mileageTodayKm = jitter(t.mileageTodayKm + Math.random() * 3, 1.5, 0, 400);
          const maximoOpenJobs = Math.max(0, Math.min(8, t.maximoOpenJobs + (Math.random() < 0.15 ? (Math.random() < 0.5 ? 1 : -1) : 0)));
          const cleaning: Cleaning = Math.random() < 0.03 ? (t.cleaning === "Ready" ? "Pending" : "Ready") : t.cleaning;
          const fitnessSensorOk = idx === 6 ? false : t.fitnessSensorOk; // keep failure persistent on KMRL-07
          return { ...t, rollingHours, sntHours, brandingExposure, mileageTodayKm, maximoOpenJobs, cleaning, fitnessSensorOk };
        }),
      );
    }, 1500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);
  return fleet;
 }

 function StatusPill({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  const cls = ok
    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
    : warn
      ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
      : "bg-red-500/15 text-red-700 border-red-500/30";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
 }

 export default function Realtime() {
  const fleet = useRealtimeFleet();

  const criticalId = 7; // sensor failed train
  const now = new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <main className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Realtime Operations Telemetry</h1>
            <p className="text-muted-foreground text-sm">Live view • {now.toLocaleString()}</p>
          </div>
          <Badge variant="secondary">25 trainsets</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fleet.map((t) => {
            const fitnessWarn = t.rollingHours < 3 || t.sntHours < 3;
            const fitnessBad = t.rollingHours < 1 || t.sntHours < 1 || !t.fitnessSensorOk;
            const exposure = Math.round(t.brandingExposure);
            const mileage = Math.round(t.mileageTodayKm);
            return (
              <Card key={t.id} className="relative overflow-hidden">
                {!t.fitnessSensorOk && (
                  <div className="absolute right-2 top-2 text-red-600 text-xs font-semibold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> Sensor offline — repair needed
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.code}</CardTitle>
                    <div className="flex items-center gap-2">
                      <StatusPill ok={t.cleaning === "Ready"} warn={t.cleaning === "In-progress"} label={`Cleaning: ${t.cleaning}`} />
                      <StatusPill ok={t.maximoOpenJobs === 0} warn={t.maximoOpenJobs <= 2} label={`Jobs: ${t.maximoOpenJobs}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Fitness (RS)</span>
                        <span className={`tabular-nums ${t.rollingHours < 2 ? "text-red-600" : t.rollingHours < 5 ? "text-amber-600" : ""}`}>{t.rollingHours.toFixed(1)} h</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Fitness (S&T)</span>
                        <span className={`tabular-nums ${t.sntHours < 2 ? "text-red-600" : t.sntHours < 5 ? "text-amber-600" : ""}`}>{t.sntHours.toFixed(1)} h</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Branding SLA</span>
                        <span className="tabular-nums">{exposure}%</span>
                      </div>
                      <Progress value={exposure} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mileage today</span>
                        <span className="tabular-nums">{mileage} km</span>
                      </div>
                      <Progress value={Math.min(100, (mileage / 300) * 100)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Bay</span>
                        <span className="tabular-nums">{t.bayIndex + 1}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fitnessBad ? (
                        <Badge className="bg-red-600 text-white">Fitness risk</Badge>
                      ) : fitnessWarn ? (
                        <Badge className="bg-amber-500 text-black">Fitness warn</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white">Fitness OK</Badge>
                      )}
                      <Badge variant="outline">RS & S&T</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          Note: KMRL-07 demonstrates a simulated sensor outage on the Rolling‑Stock fitness IoT device and requires repair action.
        </div>
      </main>
      <Footer />
    </div>
  );
 }
