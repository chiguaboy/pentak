const backendBase = "http://localhost:4000";

const isLocalHost = (host) => host.includes("localhost") || host.startsWith("192.168.");

export const resolveImageSrc = (value = "") => {
  const src = String(value || "");
  if (!src) {
    return "";
  }
  if (typeof window === "undefined") {
    return src;
  }
  if (src.startsWith("http://") || src.startsWith("https://")) {
    if (src.includes("localhost") || src.includes("192.168")) {
      try {
        const url = new URL(src);
        return `${backendBase}${url.pathname}`;
      } catch (error) {
        return src;
      }
    }
    return src;
  }
  if (src.startsWith("/")) {
    const host = window.location?.hostname || "";
    if (isLocalHost(host)) {
      return `${backendBase}${src}`;
    }
  }
  return src;
};
