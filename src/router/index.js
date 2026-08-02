import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '工作台', tab: 'dashboard' },
  },
  {
    path: '/teaching',
    redirect: '/teaching/records',
    meta: { title: '教学', tab: 'teaching' },
    component: () => import('../layouts/TeachingLayout.vue'),
    children: [
      {
        path: 'records',
        name: 'teaching-records',
        component: () => import('../views/CourseRecordsView.vue'),
        meta: { title: '课程记录', tab: 'teaching' },
      },
      {
        path: 'schedule',
        name: 'teaching-schedule',
        component: () => import('../views/ScheduleView.vue'),
        meta: { title: '排课', tab: 'teaching' },
      },
      {
        path: 'attendance',
        name: 'teaching-attendance',
        component: () => import('../views/AttendanceView.vue'),
        meta: { title: '考勤', tab: 'teaching' },
      },
      {
        path: 'resources',
        name: 'teaching-resources',
        component: () => import('../views/ResourceView.vue'),
        meta: { title: '资源库', tab: 'teaching' },
      },
    ],
  },
  {
    path: '/todos',
    name: 'todos',
    component: () => import('../views/TodoView.vue'),
    meta: { title: '待办', tab: 'todos' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '我的', tab: 'settings' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
