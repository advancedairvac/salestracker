
"use client";

import { createContext, useContext, useEffect } from "react";

export const PageTaglineContext = createContext(null);

export function PageTaglineProvider({ children, value }) {
  return (
    <PageTaglineContext.Provider value={value}>
      {children}
    </PageTaglineContext.Provider>
  );
}

export function PageTagline({ children }) {
  const context = useContext(PageTaglineContext);
  const setTagline = context?.setTagline;

  useEffect(() => {
    if (!setTagline) return;

    setTagline(children || null);

    return () => {
      setTagline(null);
    };
  }, [children, setTagline]);

  return null;
}

export function PageTaglineDisplay() {
  const context = useContext(PageTaglineContext);

  if (!context?.tagline) return null;

  return (
    <section className="my-10 max-w-full pt-4 sm:mt-8 sm:pt-5">
      <h2 className="max-w-xs text-base lg:text-xl font-semibold leading-snug text-neutral-950 ">
        {context.tagline}
      </h2>
    </section>
  );
}

export default PageTagline;
