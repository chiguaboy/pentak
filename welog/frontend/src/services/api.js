import axios from "axios";

const resolveBaseUrl = () => {
  if (import.meta.env.PROD) {
    return "/welog/api";
  }
  if (typeof window === "undefined") {
    return "http://localhost:4000/api/welog";
  }
  const { protocol, hostname } = window.location;
  const apiHost = hostname || "localhost";
  return `${protocol}//${apiHost}:4000/api/welog`;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || resolveBaseUrl(),
});

export const login = async (password) => {
  const { data } = await api.post("/login", { password });
  return data;
};

export const fetchPosts = async (month) => {
  const { data } = await api.get("/posts", { params: { month } });
  return data;
};

export const fetchPost = async (id, month) => {
  const { data } = await api.get(`/posts/${id}`, { params: { month } });
  return data;
};

export const createPost = async (payload, month) => {
  const { data } = await api.post("/posts", { ...payload, month });
  return data;
};

export const updatePost = async (id, payload, month) => {
  const { data } = await api.put(`/posts/${id}`, payload, { params: { month } });
  return data;
};

export const uploadImage = async (image) => {
  const { data } = await api.post("/uploads", { image });
  return data;
};

export default api;
