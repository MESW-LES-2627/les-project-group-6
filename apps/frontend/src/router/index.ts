import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { hideAppChrome: true },
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('../views/LibraryView.vue'),
    },
    {
      path: '/library/:bookId',
      name: 'book-detail',
      component: () => import('../views/BookDetailView.vue'),
      props: true,
    },
    {
      path: '/session/:bookId',
      name: 'active-session',
      component: () => import('../views/ActiveSessionView.vue'),
      props: true,
    },
    {
      path: '/groups',
      name: 'groups',
      component: () => import('../views/GroupsView.vue'),
    },
    // Declared before `:groupId` so "new" is not read as a group id
    {
      path: '/groups/new',
      name: 'group-create',
      component: () => import('../views/CreateGroupView.vue'),
    },
    {
      path: '/groups/:groupId',
      name: 'group-detail',
      component: () => import('../views/GroupDetailView.vue'),
      props: true,
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
});

export default router;
