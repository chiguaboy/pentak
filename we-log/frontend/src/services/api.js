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

export const fetchPost = async (id) => {
  const { data } = await api.get(`/posts/${id}`);
  return data;
};

export const createPost = async (payload) => {
  const { data } = await api.post("/posts", payload);
  return data;
};

export const updatePost = async (id, payload) => {
  const { data } = await api.put(`/posts/${id}`, payload);
  return data;
};

export default api;
