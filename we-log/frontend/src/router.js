import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "./pages/LoginPage.vue";
import FeedPage from "./pages/FeedPage.vue";
import NewPostPage from "./pages/NewPostPage.vue";
import DetailPage from "./pages/DetailPage.vue";
import EditPage from "./pages/EditPage.vue";

const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: LoginPage },
  { path: "/feed", component: FeedPage },
  { path: "/new", component: NewPostPage },
  { path: "/detail/:id", component: DetailPage },
  { path: "/edit/:id", component: EditPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const user = localStorage.getItem("we-log-user");
  if (to.path !== "/login" && !user) {
    next("/login");
  } else {
    next();
  }
});

export default router;
