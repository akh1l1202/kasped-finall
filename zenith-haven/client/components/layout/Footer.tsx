export default function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="container py-10 grid gap-6 md:grid-cols-3">
        <div>
          <p className="font-semibold">Kochi MetroMind</p>
          <p className="text-sm text-muted-foreground mt-2">
            Decision-support platform for nightly trainset induction: rule-driven, explainable, and optimised.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Objectives</p>
          <ul className="mt-2 space-y-1">
            <li>Service readiness</li>
            <li>Reliability & lifecycle cost</li>
            <li>Branding exposure</li>
            <li>Shunting efficiency</li>
          </ul>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Data Inputs</p>
          <ul className="mt-2 space-y-1">
            <li>Fitness certificates</li>
            <li>Maximo job-cards</li>
            <li>Branding commitments</li>
            <li>Mileage, cleaning, stabling geometry</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kochi Metro Rail Limited
        </div>
      </div>
    </footer>
  );
}
