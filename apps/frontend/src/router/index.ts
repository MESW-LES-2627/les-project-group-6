import { createRouter, createWebHistory, type Router } from 'vue-router';
import { session as defaultSession, type Session } from '@/stores/session';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { hideAppChrome: true, public: true },
    },
    {
      path: '/complete-profile',
      name: 'complete-profile',
      component: () => import('../views/CompleteProfileView.vue'),
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
      path: '/explore',
      name: 'explore',
      component: () => import('../views/ExploreView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/users/:username',
      name: 'user-profile',
      component: () => import('../views/UserView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
});

/**
 * F-AUTH-01: nothing but the login page is reachable without a session, and a
 * session without a profile can only reach the complete-profile step.
 */
export function installAuthGuard(target: Router, session: Session = defaultSession): void {
  target.beforeEach(async (to) => {
    const status = await session.ensure();
    if (status === 'ready') {
      return to.name === 'login' || to.name === 'complete-profile' ? { name: 'home' } : true;
    }
    if (status === 'profile-required') {
      return to.name === 'complete-profile' ? true : { name: 'complete-profile' };
    }
    if (to.meta.public) return true;
    const redirect =
      to.fullPath === '/' || to.name === 'complete-profile' ? undefined : to.fullPath;
    return { name: 'login', query: redirect ? { redirect } : {} };
  });
}

installAuthGuard(router);

export default router;
