import React, { useEffect, useState } from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  mouseContainer?: React.RefObject<HTMLElement>;
  borderRadius?: number;
  blurAmount?: number;
  className?: string;
};

function LocalLiquidGlass({ children, className = "", borderRadius = 24, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={`relative bg-white/20 backdrop-blur-md border border-white/10 shadow-lg ${className}`}
      style={{ borderRadius: `${borderRadius}px` }}
    >
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function LiquidGlassWrapper(props: Props) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    // Dynamically import third-party package at runtime to avoid evaluation at module-import time
    import("@nkzw/liquid-glass")
      .then((mod) => {
        if (!mounted) return;
        const C = (mod && (mod.default || mod)) as React.ComponentType<any>;
        setComp(() => C);
      })
      .catch(() => {
        if (!mounted) return;
        // fallback to local implementation
        setComp(() => LocalLiquidGlass);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Comp) {
    // While loading, render a simple fallback to avoid flashing or hook errors
    return <LocalLiquidGlass {...props} />;
  }

  return <Comp {...props} />;
}
