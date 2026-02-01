import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api",
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

export default api;
