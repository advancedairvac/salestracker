
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PerformanceMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalFetch = window.fetch;
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    const requests = [];
    const apiStats = new Map();

    let requestId = 0;
    let currentPage = window.location.pathname;

    const SLOW_API_THRESHOLD = 1000;
    const VERY_SLOW_API_THRESHOLD = 3000;

    const getTime = (value) => `${Math.round(value)}ms`;

    const getStatus = (duration, failed = false) => {
      if (failed) return "FAILED";
      if (duration >= VERY_SLOW_API_THRESHOLD) return "VERY SLOW";
      if (duration >= SLOW_API_THRESHOLD) return "SLOW";
      return "GOOD";
    };

    const getEndpoint = (rawUrl) => {
      try {
        const url = new URL(rawUrl, window.location.origin);

        if (url.origin !== window.location.origin) return null;

        return `${url.pathname}${url.search}`;
      } catch {
        return null;
      }
    };

    const addRequest = (data) => {
      requests.push(data);

      const key = `${data.method} ${data.endpoint}`;

      const existing = apiStats.get(key) || {
        method: data.method,
        endpoint: data.endpoint,
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        failures: 0,
      };

      existing.count += 1;
      existing.totalDuration += data.duration;
      existing.maxDuration = Math.max(
        existing.maxDuration,
        data.duration
      );

      if (data.failed) existing.failures += 1;

      apiStats.set(key, existing);
    };

    const logRequest = (data) => {
      const status = getStatus(data.duration, data.failed);

      const logData = {
        Page: data.page,
        Method: data.method,
        Endpoint: data.endpoint,
        Duration: getTime(data.duration),
        HTTPStatus: data.status ?? "Network Error",
        Result: status,
        RequestID: data.id,
      };

      if (data.failed || data.duration >= SLOW_API_THRESHOLD) {
        console.warn("⚠️ API PERFORMANCE WARNING", logData);
      } else {
        console.log("🌐 API REQUEST", logData);
      }
    };

    const printPageSummary = () => {
      const pageRequests = requests.filter(
        (request) => request.page === currentPage
      );

      console.group(
        `%c📊 PAGE API SUMMARY: ${currentPage}`,
        "color:#0ea5e9;font-weight:bold"
      );

      if (!pageRequests.length) {
        console.log("No API requests recorded for this page.");
      } else {
        console.table(
          pageRequests
            .slice()
            .sort((a, b) => b.duration - a.duration)
            .map((request) => ({
              Method: request.method,
              Endpoint: request.endpoint,
              Duration: getTime(request.duration),
              Status: request.status ?? "Failed",
              Result: getStatus(request.duration, request.failed),
            }))
        );

        const totalTime = pageRequests.reduce(
          (sum, request) => sum + request.duration,
          0
        );

        console.log("Total API requests:", pageRequests.length);
        console.log("Combined request duration:", getTime(totalTime));
        console.log(
          "Slow requests:",
          pageRequests.filter(
            (request) => request.duration >= SLOW_API_THRESHOLD
          ).length
        );
      }

      console.groupEnd();
    };

    // Initial page navigation information
    const logNavigationPerformance = () => {
      const navigation = performance.getEntriesByType("navigation")[0];

      if (!navigation) return;

      console.group(
        `%c🚀 PAGE PERFORMANCE: ${window.location.pathname}`,
        "color:#16a34a;font-weight:bold"
      );

      console.table({
        "DNS Lookup": getTime(
          navigation.domainLookupEnd - navigation.domainLookupStart
        ),
        "Server Connection": getTime(
          navigation.connectEnd - navigation.connectStart
        ),
        "Request to Response": getTime(
          navigation.responseStart - navigation.requestStart
        ),
        "Response Download": getTime(
          navigation.responseEnd - navigation.responseStart
        ),
        "DOM Processing": getTime(
          navigation.domComplete - navigation.responseEnd
        ),
        "DOM Interactive": getTime(navigation.domInteractive),
        "Page Load Event": getTime(navigation.loadEventEnd),
      });

      console.log("Page:", window.location.pathname);
      console.log("Navigation Type:", navigation.type);

      console.groupEnd();
    };

    // Browser resource performance
    const logResourcePerformance = () => {
      const resources = performance
        .getEntriesByType("resource")
        .filter((resource) => {
          return (
            resource.duration > SLOW_API_THRESHOLD &&
            !resource.name.includes("/api/")
          );
        })
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

      if (!resources.length) return;

      console.group("🐢 SLOW RESOURCE LOADING");

      console.table(
        resources.map((resource) => ({
          Resource: resource.name.split("/").pop()?.slice(0, 70),
          Type: resource.initiatorType,
          Duration: getTime(resource.duration),
          TransferSize: `${Math.round(resource.transferSize / 1024)} KB`,
        }))
      );

      console.groupEnd();
    };

    // Track Fetch API requests
    window.fetch = async (...args) => {
      const [input, init] = args;

      const rawUrl =
        typeof input === "string" || input instanceof URL
          ? input.toString()
          : input?.url;

      const endpoint = getEndpoint(rawUrl);

      if (!endpoint || !endpoint.startsWith("/api/")) {
        return originalFetch(...args);
      }

      const method = (
        init?.method || input?.method || "GET"
      ).toUpperCase();

      const id = ++requestId;
      const start = performance.now();

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;

        const data = {
          id,
          page: currentPage,
          method,
          endpoint,
          duration,
          status: response.status,
          failed: !response.ok,
        };

        addRequest(data);
        logRequest(data);

        return response;
      } catch (error) {
        const duration = performance.now() - start;

        const data = {
          id,
          page: currentPage,
          method,
          endpoint,
          duration,
          failed: true,
          error: error.message,
        };

        addRequest(data);
        logRequest(data);

        throw error;
      }
    };

    // Track XMLHttpRequest requests
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      this.__performanceMonitor = {
        method: String(method).toUpperCase(),
        endpoint: getEndpoint(url),
      };

      return originalXhrOpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      const info = this.__performanceMonitor;

      if (!info?.endpoint?.startsWith("/api/")) {
        return originalXhrSend.apply(this, args);
      }

      const id = ++requestId;
      const start = performance.now();
      let completed = false;

      const finish = (failed = false) => {
        if (completed) return;
        completed = true;

        const duration = performance.now() - start;

        const data = {
          id,
          page: currentPage,
          method: info.method,
          endpoint: info.endpoint,
          duration,
          status: this.status || undefined,
          failed,
        };

        addRequest(data);
        logRequest(data);
      };

      this.addEventListener("loadend", () => {
        finish(this.status === 0 || this.status >= 400);
      }, { once: true });

      return originalXhrSend.apply(this, args);
    };

    // Initial logs
    console.clear();

    console.log(
      "%c🔍 ADVANCED SALES TRACKER - PERFORMANCE MONITORING",
      "color:#0ea5e9;font-size:14px;font-weight:bold"
    );

    console.log("Current Page:", currentPage);

    const pageLoadTimer = window.setTimeout(() => {
      logNavigationPerformance();
      logResourcePerformance();
      printPageSummary();
    }, 1500);

    // Cleanup
    return () => {
      window.clearTimeout(pageLoadTimer);

      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXhrOpen;
      XMLHttpRequest.prototype.send = originalXhrSend;
    };
  }, []);

  // Track Next.js client-side navigation
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.group(
      `%c📄 PAGE NAVIGATION: ${pathname}`,
      "color:#a855f7;font-weight:bold"
    );

    console.log("Path:", pathname);
    console.log("Navigation Time:", new Date().toLocaleTimeString());
    console.groupEnd();
  }, [pathname]);

  return null;
}
